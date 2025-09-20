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
      await queueAndRetry('inventory.mintBMCoin', async () => mintBMCoin({ executor, packageId: pkg, capId, recipient: owner, amount: normalized, client }), { attempts: 4, baseDelayMs: 500 });
    } else {
      let bmTokenId = null;
      try {
        const res = await (_listOwnedBMTokens || listOwnedBMTokens)(client, owner, pkg, null, 50);
        const first = (res?.data ?? [])[0];
        bmTokenId = first?.data?.objectId ?? first?.objectId ?? null;
      } catch (_) {}
      if (bmTokenId) {
        await queueAndRetry('inventory.addBMTokens', async () => onchainAddBMTokens({ executor, packageId: pkg, bmTokenId, amount: normalized, client }), { attempts: 4, baseDelayMs: 500 });
      } else {
        await queueAndRetry('inventory.createBMToken', async () => onchainCreateBMToken({ executor, packageId: pkg, sender: owner, amount: normalized, tokenType: 'BM', client }), { attempts: 4, baseDelayMs: 500 });
      }
    }
    const total = await getTotalBMCoinBalance(client, owner, pkg);
    if (Number.isFinite(total)) setTokens(total);
  };

  // Bag helpers (lazy import to avoid circular)
  const bag = (() => {
    const i = require('../utils/inventory');
    return {
      listOwnedInventories: i.listOwnedInventories,
      buildCreateInventoryTx: i.buildCreateInventoryTx,
      buildAddPotionToInventoryTx: i.buildAddPotionToInventoryTx,
      buildUsePotionsFromInventoryTx: i.buildUsePotionsFromInventoryTx,
      getInventoryStructTag: i.getInventoryStructTag,
    };
  })();

  const ensureInventory = async (owner, pkg) => {
    try {
      const res = await bag.listOwnedInventories(client, owner, pkg, null, 1);
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
            const txSpend = new TransactionBlock();
            txSpend.moveCall({ target: `${pkg}::inventory::subtract_bm_tokens`, arguments: [txSpend.object(bmTokenId), txSpend.pure.u64(costNormalized)] });
            await queueAndRetry('inventory.spendBMToken', async () => executor(txSpend), { attempts: 4, baseDelayMs: 500 });
          }
        }

        // Ensure Inventory exists
        let inventoryId = await ensureInventory(owner, pkg);
        if (!inventoryId) {
          const txCreate = bag.buildCreateInventoryTx({ packageId: pkg, sender: owner });
          const resCreate = await queueAndRetry('inventory.createInventory', async () => executor(txCreate), { attempts: 3, baseDelayMs: 400 });
          try {
            const digest = resCreate?.digest || resCreate?.effects?.transactionDigest || resCreate?.effectsDigest;
            if (digest && typeof client.waitForTransactionBlock === 'function') {
              await client.waitForTransactionBlock({ digest, options: { showEffects: true, showObjectChanges: true } });
            }
          } catch (_) {}
          // fetch again
          inventoryId = await ensureInventory(owner, pkg);
        }

        // Add potions to Inventory bag (HP kind=1, effect=9999 until balancing)
        const tx = bag.buildAddPotionToInventoryTx({ packageId: pkg, inventoryId, potionType: 'HP', effectValue: 9999, quantity: amountNormalized, description: 'HP Potion' });
        const res = await queueAndRetry('inventory.addPotionToInventory', async () => executor(tx), { attempts: 4, baseDelayMs: 500 });
        try {
          const digest = res?.digest || res?.effects?.transactionDigest || res?.effectsDigest;
          if (digest && typeof client.waitForTransactionBlock === 'function') {
            await client.waitForTransactionBlock({ digest, options: { showEffects: true, showObjectChanges: true } });
          }
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


