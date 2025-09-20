import { TransactionBlock } from "@mysten/sui.js/transactions";
import { detectSigningStrategy } from "../utils/signer";
import { mintBMCoin, getEnvBMTreasuryCapId, spendBMCoin, getEnvBMSinkAddress, getTotalBMTokenBalance as getTotalBMCoinBalance, listOwnedBMTokens, listOwnedPotions } from "../utils/inventory";

/**
 * WARNING: Do NOT call `inventory::transfer_*` from the frontend.
 * These functions only mutate a stored `owner` field and DO NOT transfer
 * actual Sui object ownership. Always use PTB `tx.transferObjects([...], recipient)`
 * or on-chain `sui::transfer::public_transfer` instead. This API will be removed
 * after migrating BM to `Coin<BM>`.
 */

export function createInventoryService({
  client,
  resolvePackageId,
  listOwnedBMTokens: _listOwnedBMTokens,
  listOwnedPotions: _listOwnedPotions,
  getTotalPotionCountByType,
  getTotalBMTokenBalance,
  onchainAddBMTokens,
  onchainCreateBMToken,
  onchainSubtractBMTokens,
  queueAndRetry,
  setPotions,
  setTokens,
  setSystemMessage,
  setPurchasingPotion,
  signing,
  currentAccount,
  executor,
}) {
  const purchaseTokens = async (amount) => {
    const normalized = Number.isFinite(Number(amount)) ? Math.trunc(Number(amount)) : NaN;
    if (!Number.isFinite(normalized) || normalized <= 0) {
      setSystemMessage?.({ key: 'errors.invalidAmount' });
      return { error: 'invalid amount' };
    }
    const owner = signing.address ?? currentAccount?.address ?? null;
    if (!owner) return;
    const pkg = resolvePackageId();
    // Prefer Coin<BM> mint when env-key + cap is available, else fallback to BMToken object flow
    const capId = getEnvBMTreasuryCapId();
    const strategy = detectSigningStrategy();
    if (capId && strategy === 'env-key') {
      const res = await queueAndRetry('inventory.mintBMCoin', async () => mintBMCoin({ executor, packageId: pkg, capId, recipient: owner, amount: normalized, client }), { attempts: 4, baseDelayMs: 500 });
      try {
        const digest = res?.digest || res?.effects?.transactionDigest || res?.effectsDigest;
        if (digest && typeof client.waitForTransactionBlock === 'function') {
          await client.waitForTransactionBlock({ digest, options: { showEffects: true, showObjectChanges: true, showEvents: true } });
        }
      } catch (_) {}
    } else {
      let bmTokenId = null;
      try {
        const res = await (_listOwnedBMTokens || listOwnedBMTokens)(client, owner, pkg, null, 50);
        const first = (res?.data ?? [])[0];
        bmTokenId = first?.data?.objectId ?? first?.objectId ?? null;
      } catch (_) {}
      if (bmTokenId) {
        const res = await queueAndRetry('inventory.addBMTokens', async () => onchainAddBMTokens({ executor, packageId: pkg, bmTokenId, amount: normalized, client }), { attempts: 4, baseDelayMs: 500 });
        try {
          const digest = res?.digest || res?.effects?.transactionDigest || res?.effectsDigest;
          if (digest && typeof client.waitForTransactionBlock === 'function') {
            await client.waitForTransactionBlock({ digest, options: { showEffects: true, showObjectChanges: true, showEvents: true } });
          }
        } catch (_) {}
      } else {
        const res = await queueAndRetry('inventory.createBMToken', async () => onchainCreateBMToken({ executor, packageId: pkg, sender: owner, amount: normalized, tokenType: 'BM', client }), { attempts: 4, baseDelayMs: 500 });
        try {
          const digest = res?.digest || res?.effects?.transactionDigest || res?.effectsDigest;
          if (digest && typeof client.waitForTransactionBlock === 'function') {
            await client.waitForTransactionBlock({ digest, options: { showEffects: true, showObjectChanges: true, showEvents: true } });
          }
        } catch (_) {}
      }
    }
    // refresh with polling
    let total = await getTotalBMCoinBalance(client, owner, pkg);
    for (let i = 0; i < 5 && (!Number.isFinite(total) || total <= 0); i++) {
      await new Promise((r) => setTimeout(r, 300));
      total = await getTotalBMCoinBalance(client, owner, pkg);
    }
    if (Number.isFinite(total)) setTokens(total);
  };

  // Bag helpers (lazy dynamic import to avoid circular deps in browser ESM)
  const loadInventoryModule = async () => await import('../utils/inventory');

  const ensureInventory = async (owner, pkg) => {
    try {
      const inv = await loadInventoryModule();
      const res = await inv.listOwnedInventories(client, owner, pkg, null, 1);
      const first = (res?.data ?? [])[0];
      return first?.data?.objectId ?? first?.objectId ?? null;
    } catch (_) {
      return null;
    }
  };

  const purchasePotions = async (amount, cost) => {
    const amountNormalized = Number.isFinite(Number(amount)) ? Math.trunc(Number(amount)) : NaN;
    const costNormalized = Number.isFinite(Number(cost)) ? Math.trunc(Number(cost)) : NaN;
    if (!Number.isFinite(amountNormalized) || amountNormalized <= 0 || !Number.isFinite(costNormalized) || costNormalized < 0) {
      setSystemMessage?.({ key: 'errors.invalidAmount' });
      return { error: 'invalid amount' };
    }
    if (setPurchasingPotion) setPurchasingPotion(true);
    const owner = signing.address ?? currentAccount?.address ?? null;
    try {
      if (owner) {
        const pkg = resolvePackageId();
        const beforeTotal = await getTotalPotionCountByType(client, owner, pkg, 'HP');

        // Spend BM first (prefer Coin<BM>)
        const sink = getEnvBMSinkAddress();
        if (sink) {
          await queueAndRetry('inventory.spendBMCoin', async () => spendBMCoin({ executor, packageId: pkg, owner, amount: costNormalized, sinkAddress: sink, client }), { attempts: 4, baseDelayMs: 500 });
        } else {
          // Fallback legacy BMToken spending if available
          let bmTokenId = null;
          try {
            const resBM = await (_listOwnedBMTokens || listOwnedBMTokens)(client, owner, pkg, null, 50);
            const firstBM = (resBM?.data ?? [])[0];
            bmTokenId = firstBM?.data?.objectId ?? firstBM?.objectId ?? null;
          } catch (_) {}
          if (bmTokenId) {
            await queueAndRetry('inventory.spendBMToken', async () => {
              const txSpend = new TransactionBlock();
              txSpend.moveCall({ target: `${pkg}::inventory::subtract_bm_tokens`, arguments: [txSpend.object(bmTokenId), txSpend.pure.u64(costNormalized)] });
              return executor(txSpend);
            }, { attempts: 4, baseDelayMs: 500 });
          }
        }

        // Ensure Inventory exists
        let inventoryId = await ensureInventory(owner, pkg);
        if (!inventoryId) {
          const inv = await loadInventoryModule();
          const resCreate = await queueAndRetry('inventory.createInventory', async () => {
            const txCreate = inv.buildCreateInventoryTx({ packageId: pkg, sender: owner });
            return executor(txCreate);
          }, { attempts: 3, baseDelayMs: 400 });
          try {
            // 우선 객체 변경에서 Inventory 생성 ID 추출 시도
            const created = resCreate?.objectChanges?.find?.((c) => c.type === 'created' && typeof c.objectType === 'string' && c.objectType.endsWith('::inventory::Inventory'));
            if (created?.objectId) {
              inventoryId = created.objectId;
            }
            const digest = resCreate?.digest || resCreate?.effects?.transactionDigest || resCreate?.effectsDigest;
            if (!inventoryId && digest && typeof client.waitForTransactionBlock === 'function') {
              const waited = await client.waitForTransactionBlock({ digest, options: { showEffects: true, showObjectChanges: true } });
              const created2 = waited?.objectChanges?.find?.((c) => c.type === 'created' && typeof c.objectType === 'string' && c.objectType.endsWith('::inventory::Inventory'));
              if (created2?.objectId) inventoryId = created2.objectId;
            }
          } catch (_) {}
          // 최종 폴백: 짧게 폴링하여 소유 인벤토리 재조회
          if (!inventoryId) {
            for (let i = 0; i < 6 && !inventoryId; i++) {
              await new Promise((r) => setTimeout(r, 300));
              // eslint-disable-next-line no-await-in-loop
              inventoryId = await ensureInventory(owner, pkg);
            }
          }
        }

        // Add potions to Inventory bag (HP kind=1, effect=9999 until balancing)
        const inv = await loadInventoryModule();
        const res = await queueAndRetry('inventory.addPotionToInventory', async () => {
          const tx = inv.buildAddPotionToInventoryTx({ packageId: pkg, inventoryId, potionKind: 1, effectValue: 9999, quantity: amountNormalized, description: 'HP Potion' });
          return executor(tx);
        }, { attempts: 4, baseDelayMs: 500 });
        try {
          const digest = res?.digest || res?.effects?.transactionDigest || res?.effectsDigest;
          let events = res?.events;
          if (digest && typeof client.waitForTransactionBlock === 'function') {
            const waited = await client.waitForTransactionBlock({ digest, options: { showEffects: true, showObjectChanges: true, showEvents: true } });
            events = events || waited?.events;
          }
          // Event-driven immediate update
          try {
            const evtType = `${pkg}::inventory::PotionAddedOrUpdatedInBag`;
            const evt = (events || []).find((e) => e?.type === evtType);
            const newQty = parseInt(evt?.parsedJson?.new_quantity ?? evt?.parsedJson?.newQuantity ?? 0);
            if (Number.isFinite(newQty) && newQty >= 0) {
              setPotions(newQty);
            }
          } catch (_) {}
        } catch (_) {}

        // Refresh UI counts
        try {
          let total = await getTotalPotionCountByType(client, owner, pkg, 'HP');
          const expected = Number(beforeTotal ?? 0) + Number(amountNormalized ?? 0);
          for (let i = 0; i < 5 && Number.isFinite(expected) && total < expected; i++) {
            await new Promise((r) => setTimeout(r, 400));
            total = await getTotalPotionCountByType(client, owner, pkg, 'HP');
          }
          if (Number.isFinite(total)) setPotions(total);
          const bmTotal = await getTotalBMCoinBalance(client, owner, pkg);
          if (Number.isFinite(bmTotal)) setTokens(bmTotal);
        } catch (_) {}
      }
      setSystemMessage?.({ key: 'inventory.potionConfirm', params: { amount: amountNormalized } });
      setPurchasingPotion?.(false);
      return { success: true };
    } finally {
      setPurchasingPotion?.(false);
    }
  };

  return { purchaseTokens, purchasePotions };
}


