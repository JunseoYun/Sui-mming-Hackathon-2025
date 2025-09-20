import { TransactionBlock } from "@mysten/sui.js/transactions";

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
  listOwnedBMTokens,
  listOwnedPotions,
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
    let bmTokenId = null;
    try {
      const res = await listOwnedBMTokens(client, owner, pkg, null, 50);
      const first = (res?.data ?? [])[0];
      bmTokenId = first?.data?.objectId ?? first?.objectId ?? null;
    } catch (_) {}
    if (bmTokenId) {
      await queueAndRetry('inventory.addBMTokens', async () => onchainAddBMTokens({ executor, packageId: pkg, bmTokenId, amount: normalized, client }), { attempts: 4, baseDelayMs: 500 });
    } else {
      await queueAndRetry('inventory.createBMToken', async () => onchainCreateBMToken({ executor, packageId: pkg, sender: owner, amount: normalized, tokenType: 'BM', client }), { attempts: 4, baseDelayMs: 500 });
    }
    const total = await getTotalBMTokenBalance(client, owner, pkg);
    if (Number.isFinite(total)) setTokens(total);
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
        let bmTokenId = null;
        let potionId = null;
        try {
          const resBM = await listOwnedBMTokens(client, owner, pkg, null, 50);
          const firstBM = (resBM?.data ?? [])[0];
          bmTokenId = firstBM?.data?.objectId ?? firstBM?.objectId ?? null;
        } catch (_) {}
        try {
          const res = await listOwnedPotions(client, owner, pkg, null, 50);
          const hpEntry = (res?.data ?? []).find((item) => {
            const fields = item?.data?.content?.fields ?? item?.content?.fields;
            return fields?.potion_type === 'HP';
          });
          potionId = hpEntry?.data?.objectId ?? hpEntry?.objectId ?? null;
        } catch (_) {}

        const tx = new TransactionBlock();
        if (bmTokenId) {
          tx.moveCall({ target: `${pkg}::inventory::subtract_bm_tokens`, arguments: [tx.object(bmTokenId), tx.pure.u64(costNormalized)] });
        }
        if (potionId) {
          tx.moveCall({ target: `${pkg}::inventory::add_potions`, arguments: [tx.object(potionId), tx.pure.u64(amountNormalized)] });
        } else {
          const created = tx.moveCall({ target: `${pkg}::inventory::create_potion`, arguments: [tx.pure.string('HP'), tx.pure.u64(9999), tx.pure.u64(amountNormalized), tx.pure.string('HP Potion')] });
          tx.transferObjects([created], tx.pure.address(owner));
        }
        const res = await queueAndRetry('inventory.purchasePotions', async () => executor(tx), { attempts: 4, baseDelayMs: 500 });
        try {
          const digest = res?.digest || res?.effects?.transactionDigest || res?.effectsDigest;
          if (digest && typeof client.waitForTransactionBlock === 'function') {
            await client.waitForTransactionBlock({ digest, options: { showEffects: true, showObjectChanges: true } });
          }
        } catch (_) {}

        try {
          let total = await getTotalPotionCountByType(client, owner, pkg, 'HP');
          const expected = Number(beforeTotal ?? 0) + Number(amountNormalized ?? 0);
          for (let i = 0; i < 5 && Number.isFinite(expected) && total < expected; i++) {
            await new Promise((r) => setTimeout(r, 400));
            total = await getTotalPotionCountByType(client, owner, pkg, 'HP');
          }
          if (Number.isFinite(total)) setPotions(total);
          const bmTotal = await getTotalBMTokenBalance(client, owner, pkg);
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


