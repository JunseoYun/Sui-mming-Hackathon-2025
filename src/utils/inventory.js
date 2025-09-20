import { TransactionBlock } from "@mysten/sui.js/transactions";
import {
  detectSigningStrategy,
  createEnvKeypairFromEnv,
  buildEnvKeyExecutor,
  buildWalletExecutor,
} from "./signer";

// Configuration helpers
function getEnvPackageId() {
  // Vite-style env var; define this in .env as VITE_BLOCKMON_PACKAGE_ID
  return (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BLOCKMON_PACKAGE_ID) || null;
}

export function resolvePackageId(overridePackageId) {
  const pkg = overridePackageId || getEnvPackageId();
  if (!pkg) {
    throw new Error("Blockmon packageId is required. Set VITE_BLOCKMON_PACKAGE_ID or pass overridePackageId.");
  }
  return pkg;
}

// Utilities to build fully-qualified function strings
function fn(pkg, name) {
  return `${pkg}::inventory::${name}`;
}

// Generic execute helper
export async function executeTransaction({ tx, executor, client, signAndExecute }) {
  let effectiveExecutor = executor;

  if (typeof effectiveExecutor !== "function") {
    const strategy = detectSigningStrategy();
    if (strategy === "env-key") {
      if (!client || typeof client.signAndExecuteTransactionBlock !== "function") {
        throw new Error("SuiClient with signAndExecuteTransactionBlock is required for env-key strategy");
      }
      const keypair = createEnvKeypairFromEnv();
      if (!keypair) {
        throw new Error("No env keypair found. Set VITE_SUI_DEV_MNEMONIC or VITE_SUI_DEV_PRIVATE_KEY");
      }
      effectiveExecutor = buildEnvKeyExecutor({ client, keypair });
    } else {
      if (typeof signAndExecute !== "function") {
        throw new Error("signAndExecute function is required for wallet strategy");
      }
      effectiveExecutor = buildWalletExecutor(signAndExecute);
    }
  }

  const result = await effectiveExecutor(tx);
  return result;
}

export function ensureExecutor({ executor, client, signAndExecute }) {
  if (typeof executor === "function") return executor;
  const strategy = detectSigningStrategy();
  if (strategy === "env-key") {
    if (!client || typeof client.signAndExecuteTransactionBlock !== "function") {
      throw new Error("SuiClient with signAndExecuteTransactionBlock is required for env-key strategy");
    }
    const keypair = createEnvKeypairFromEnv();
    if (!keypair) {
      throw new Error("No env keypair found. Set VITE_SUI_DEV_MNEMONIC or VITE_SUI_DEV_PRIVATE_KEY");
    }
    return buildEnvKeyExecutor({ client, keypair });
  }
  if (typeof signAndExecute !== "function") {
    throw new Error("signAndExecute function is required for wallet strategy");
  }
  return buildWalletExecutor(signAndExecute);
}

// Helper to extract created object id by type
export function extractCreatedByType(executionResult, fullType) {
  const changes = executionResult?.objectChanges;
  if (!Array.isArray(changes)) return null;
  const created = changes.find((c) => c.type === "created" && c.objectType === fullType);
  return created?.objectId || null;
}

// ========== BM TOKEN FUNCTIONS ==========
// Note: BM token object path is deprecated and will be removed after Coin<BM> migration

// Build: create BM Token and transfer to sender
export function buildCreateBMTokenTx({
  packageId,
  sender,
  amount,
  tokenType = "BM",
}) {
  const pkg = resolvePackageId(packageId);
  if (!sender) throw new Error("sender address is required to transfer the newly created BM Token");
  const tx = new TransactionBlock();

  const created = tx.moveCall({
    target: fn(pkg, "create_bm_token"),
    arguments: [
      tx.pure.u64(amount),
      tx.pure.string(tokenType),
    ],
  });

  tx.transferObjects([created], tx.pure.address(sender));
  return tx;
}

// Build: add BM tokens
export function buildAddBMTokensTx({ packageId, bmTokenId, amount }) {
  const pkg = resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.moveCall({
    target: fn(pkg, "add_bm_tokens"),
    arguments: [tx.object(bmTokenId), tx.pure.u64(amount)],
  });
  return tx;
}

// Build: subtract BM tokens
export function buildSubtractBMTokensTx({ packageId, bmTokenId, amount }) {
  const pkg = resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.moveCall({
    target: fn(pkg, "subtract_bm_tokens"),
    arguments: [tx.object(bmTokenId), tx.pure.u64(amount)],
  });
  return tx;
}

// Build: set BM token amount
export function buildSetBMTokenAmountTx({ packageId, bmTokenId, newAmount }) {
  const pkg = resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.moveCall({
    target: fn(pkg, "set_bm_token_amount"),
    arguments: [tx.object(bmTokenId), tx.pure.u64(newAmount)],
  });
  return tx;
}

// Build: set BM token type
export function buildSetBMTokenTypeTx({ packageId, bmTokenId, newType }) {
  const pkg = resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.moveCall({
    target: fn(pkg, "set_bm_token_type"),
    arguments: [tx.object(bmTokenId), tx.pure.string(newType)],
  });
  return tx;
}

// Build: transfer BM token ownership
export function buildTransferBMTokenTx({ packageId, bmTokenId, newOwner }) {
  resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.transferObjects([tx.object(bmTokenId)], tx.pure.address(newOwner));
  return tx;
}

// Build: burn BM token
export function buildBurnBMTokenTx({ packageId, bmTokenId }) {
  const pkg = resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.moveCall({
    target: fn(pkg, "burn_bm_token"),
    arguments: [tx.object(bmTokenId)],
  });
  return tx;
}

// ========== POTION FUNCTIONS ==========

// Build: create Potion and transfer to sender
export function buildCreatePotionTx({
  packageId,
  sender,
  potionType = "HP",
  effectValue,
  quantity,
  description,
}) {
  const pkg = resolvePackageId(packageId);
  if (!sender) throw new Error("sender address is required to transfer the newly created Potion");
  const tx = new TransactionBlock();

  const created = tx.moveCall({
    target: fn(pkg, "create_potion"),
    arguments: [
      tx.pure.string(potionType),
      tx.pure.u64(effectValue),
      tx.pure.u64(quantity),
      tx.pure.string(description),
    ],
  });

  tx.transferObjects([created], tx.pure.address(sender));
  return tx;
}

// Build: add potions
export function buildAddPotionsTx({ packageId, potionId, quantity }) {
  const pkg = resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.moveCall({
    target: fn(pkg, "add_potions"),
    arguments: [tx.object(potionId), tx.pure.u64(quantity)],
  });
  return tx;
}

// Build: use potion
export function buildUsePotionTx({ packageId, potionId, quantity }) {
  const pkg = resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.moveCall({
    target: fn(pkg, "use_potion"),
    arguments: [tx.object(potionId), tx.pure.u64(quantity)],
  });
  return tx;
}

// Build: set potion quantity
export function buildSetPotionQuantityTx({ packageId, potionId, newQuantity }) {
  const pkg = resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.moveCall({
    target: fn(pkg, "set_potion_quantity"),
    arguments: [tx.object(potionId), tx.pure.u64(newQuantity)],
  });
  return tx;
}

// Build: set potion effect value
export function buildSetPotionEffectValueTx({ packageId, potionId, newEffectValue }) {
  const pkg = resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.moveCall({
    target: fn(pkg, "set_potion_effect_value"),
    arguments: [tx.object(potionId), tx.pure.u64(newEffectValue)],
  });
  return tx;
}

// Build: set potion description
export function buildSetPotionDescriptionTx({ packageId, potionId, newDescription }) {
  const pkg = resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.moveCall({
    target: fn(pkg, "set_potion_description"),
    arguments: [tx.object(potionId), tx.pure.string(newDescription)],
  });
  return tx;
}

// Build: transfer potion ownership
export function buildTransferPotionTx({ packageId, potionId, newOwner }) {
  resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.transferObjects([tx.object(potionId)], tx.pure.address(newOwner));
  return tx;
}

// Build: burn potion
export function buildBurnPotionTx({ packageId, potionId }) {
  const pkg = resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.moveCall({
    target: fn(pkg, "burn_potion"),
    arguments: [tx.object(potionId)],
  });
  return tx;
}

// ========== HIGH-LEVEL BM TOKEN OPERATIONS ==========

export async function createBMToken({
  executor,
  packageId,
  sender,
  amount,
  tokenType = "BM",
  client,
  signAndExecute,
}) {
  const tx = buildCreateBMTokenTx({
    packageId,
    sender,
    amount,
    tokenType,
  });
  const res = await executeTransaction({ tx, executor, client, signAndExecute });
  return res;
}

export async function addBMTokens({ executor, packageId, bmTokenId, amount, client, signAndExecute }) {
  const tx = buildAddBMTokensTx({ packageId, bmTokenId, amount });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function subtractBMTokens({ executor, packageId, bmTokenId, amount, client, signAndExecute }) {
  const tx = buildSubtractBMTokensTx({ packageId, bmTokenId, amount });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function setBMTokenAmount({ executor, packageId, bmTokenId, newAmount, client, signAndExecute }) {
  const tx = buildSetBMTokenAmountTx({ packageId, bmTokenId, newAmount });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function setBMTokenType({ executor, packageId, bmTokenId, newType, client, signAndExecute }) {
  const tx = buildSetBMTokenTypeTx({ packageId, bmTokenId, newType });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function transferBMToken({ executor, packageId, bmTokenId, newOwner, client, signAndExecute }) {
  const tx = buildTransferBMTokenTx({ packageId, bmTokenId, newOwner });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function burnBMToken({ executor, packageId, bmTokenId, client, signAndExecute }) {
  const tx = buildBurnBMTokenTx({ packageId, bmTokenId });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

// ========== COIN<BM> HELPERS ==========

export function getBMTypeTag(packageId) {
  const pkg = resolvePackageId(packageId);
  return `${pkg}::inventory::BM`;
}

export function getBMCoinStructTag(packageId) {
  return `0x2::coin::Coin<${getBMTypeTag(packageId)}>`;
}

// ========== INVENTORY BAG HELPERS ==========

export function getInventoryStructTag(packageId) {
  const pkg = resolvePackageId(packageId);
  return `${pkg}::inventory::Inventory`;
}

export async function listOwnedInventories(client, ownerAddress, packageId, cursor, limit = 50) {
  if (!client || typeof client.getOwnedObjects !== "function") {
    throw new Error("client must implement getOwnedObjects");
  }
  if (!ownerAddress) {
    throw new Error("ownerAddress is required");
  }
  const pkg = resolvePackageId(packageId);
  const res = await client.getOwnedObjects({
    owner: ownerAddress,
    filter: { StructType: `${pkg}::inventory::Inventory` },
    options: { showType: true, showContent: true, showOwner: true },
    cursor,
    limit,
  });
  return res;
}

export function buildCreateInventoryTx({ packageId, sender }) {
  const pkg = resolvePackageId(packageId);
  if (!sender) throw new Error("sender address is required to receive Inventory");
  const tx = new TransactionBlock();
  const created = tx.moveCall({ target: fn(pkg, "create_inventory"), arguments: [] });
  tx.transferObjects([created], tx.pure.address(sender));
  return tx;
}

export function buildAddPotionToInventoryTx({ packageId, inventoryId, potionKind, effectValue, quantity, description }) {
  const pkg = resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.moveCall({
    target: fn(pkg, "add_potion_to_inventory"),
    arguments: [
      tx.object(inventoryId),
      tx.pure.u8(Number.isFinite(Number(potionKind)) ? Math.trunc(Number(potionKind)) : 1),
      tx.pure.u64(effectValue),
      tx.pure.u64(quantity),
      tx.pure.string(description ?? "HP Potion"),
    ],
  });
  return tx;
}

export function buildUsePotionsFromInventoryTx({ packageId, inventoryId, potionKind, quantity }) {
  const pkg = resolvePackageId(packageId);
  const tx = new TransactionBlock();
  tx.moveCall({
    target: fn(pkg, "use_potions_from_inventory"),
    arguments: [tx.object(inventoryId), tx.pure.u8(Number.isFinite(Number(potionKind)) ? Math.trunc(Number(potionKind)) : 1), tx.pure.u64(quantity)],
  });
  return tx;
}

export async function createInventory({ executor, packageId, sender, client, signAndExecute }) {
  const tx = buildCreateInventoryTx({ packageId, sender });
  const res = await executeTransaction({ tx, executor, client, signAndExecute });
  return res;
}

export async function addPotionToInventory({ executor, packageId, inventoryId, potionType, effectValue, quantity, description, client, signAndExecute }) {
  const tx = buildAddPotionToInventoryTx({ packageId, inventoryId, potionType, effectValue, quantity, description });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function usePotionsFromInventory({ executor, packageId, inventoryId, potionType, quantity, client, signAndExecute }) {
  const tx = buildUsePotionsFromInventoryTx({ packageId, inventoryId, potionType, quantity });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function listOwnedBMCoinObjects(client, ownerAddress, packageId, cursor, limit = 50) {
  if (!client || typeof client.getOwnedObjects !== "function") {
    throw new Error("client must implement getOwnedObjects");
  }
  if (!ownerAddress) {
    throw new Error("ownerAddress is required");
  }
  const coinStruct = getBMCoinStructTag(packageId);
  const res = await client.getOwnedObjects({
    owner: ownerAddress,
    filter: { StructType: coinStruct },
    options: { showType: true, showContent: true, showOwner: true, showDisplay: false },
    cursor,
    limit,
  });
  return res;
}

export async function getTotalBMCoinBalance(client, ownerAddress, packageId) {
  if (!ownerAddress) return 0;
  const coinType = getBMTypeTag(packageId);
  // Prefer getBalance if available
  if (typeof client.getBalance === "function") {
    try {
      const res = await client.getBalance({ owner: ownerAddress, coinType });
      const total = parseInt(res?.totalBalance ?? 0);
      if (Number.isFinite(total)) return total;
    } catch (_) {}
  }
  // Fallback to summing owned coin objects
  try {
    const owned = await listOwnedBMCoinObjects(client, ownerAddress, packageId, null, 200);
    let total = 0;
    for (const it of owned?.data ?? []) {
      const fields = it?.data?.content?.fields ?? it?.content?.fields;
      const bal = fields?.balance ?? fields?.value;
      if (bal != null) total += parseInt(bal);
    }
    return total;
  } catch (_) {
    return 0;
  }
}

// BMToken 기반 총 잔고 합산 (Coin<BM> 미사용 경로)
export async function getTotalBMTokenBalance(client, ownerAddress, packageId) {
  if (!ownerAddress) return 0;
  try {
    const pkg = resolvePackageId(packageId);
    let primaryCount = 0;
    try {
      const LIMIT = 50;
      let cursor = null;
      let total = 0;
      let pages = 0;
      do {
        const res = await client.getOwnedObjects({
          owner: ownerAddress,
          filter: { StructType: `${pkg}::inventory::BMToken` },
          options: { showType: true, showContent: true },
          limit: LIMIT,
          cursor,
        });
        const rows = res?.data ?? [];
        primaryCount += rows.length;
        for (const it of rows) {
          const fields = it?.data?.content?.fields ?? it?.content?.fields;
          const amt = fields?.amount;
          if (amt != null) total += parseInt(amt);
        }
        cursor = res?.nextCursor ?? null;
        pages += 1;
      } while (cursor && pages < 20);
      if (total > 0) return total;
    } catch (e) {
      // ignore; will fallback
    }
    // Fallback: scan all owned objects and match BMToken by suffix (package id mismatch safety)
    try {
      const LIMIT = 50;
      let cursor = null;
      let sum = 0;
      let totalCount = 0;
      let pages = 0;
      do {
        const resAll = await client.getOwnedObjects({ owner: ownerAddress, options: { showType: true, showContent: true }, limit: LIMIT, cursor });
        const rows = resAll?.data ?? [];
        totalCount += rows.length;
        for (const it of rows) {
          const type = it?.data?.type || it?.type || it?.data?.content?.type;
          if (typeof type === 'string' && type.endsWith('::inventory::BMToken')) {
            const fields = it?.data?.content?.fields ?? it?.content?.fields;
            const amt = fields?.amount;
            if (amt != null) sum += parseInt(amt);
          }
        }
        cursor = resAll?.nextCursor ?? null;
        pages += 1;
      } while (cursor && pages < 40);
      if (sum > 0) return sum;
    } catch (_) {}
    return 0;
  } catch (_) {
    return 0;
  }
}

// Build: mint Coin<BM> to recipient using TreasuryCap<BM>
export function buildMintBMCoinTx({ packageId, capId, recipient, amount }) {
  const pkg = resolvePackageId(packageId);
  if (!capId) throw new Error("TreasuryCap<BM> object id (capId) is required");
  if (!recipient) throw new Error("recipient address is required");
  const tx = new TransactionBlock();
  tx.moveCall({
    target: `${pkg}::inventory::mint_bm`,
    typeArguments: [],
    arguments: [tx.pure.address(recipient), tx.pure.u64(amount), tx.object(capId)],
  });
  return tx;
}

export async function mintBMCoin({ executor, packageId, capId, recipient, amount, client, signAndExecute }) {
  const tx = buildMintBMCoinTx({ packageId, capId, recipient, amount });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

// Spend BM by transferring to a sink/treasury address (no burn without cap)
export async function spendBMCoin({ executor, packageId, owner, amount, sinkAddress, client, signAndExecute }) {
  if (!owner) throw new Error("owner address required");
  if (!sinkAddress) throw new Error("sinkAddress is required to receive spent BM");
  const pkg = resolvePackageId(packageId);
  const coinTypeTag = getBMTypeTag(pkg);
  const coinStruct = `0x2::coin::Coin<${coinTypeTag}>`;

  // Gather owned coin ids first
  const owned = await listOwnedBMCoinObjects(client, owner, pkg, null, 200);
  const coinIds = (owned?.data ?? [])
    .map((it) => it?.data?.objectId || it?.objectId)
    .filter(Boolean);
  if (coinIds.length === 0) throw new Error("no BM coins to spend");

  const tx = new TransactionBlock();
  // Build vector<Coin<BM>> from owned coins
  const coinVec = tx.makeMoveVec({ type: coinStruct, elements: coinIds.map((id) => tx.object(id)) });
  // Join into single coin
  const merged = tx.moveCall({
    target: `0x2::pay::join_vec`,
    typeArguments: [coinTypeTag],
    arguments: [coinVec],
  });
  // Prepare recipients/amounts vectors
  const recipients = tx.makeMoveVec({ type: `address`, elements: [tx.pure.address(sinkAddress)] });
  const amounts = tx.makeMoveVec({ type: `u64`, elements: [tx.pure.u64(amount)] });
  // Split and transfer desired amount to sink; remaining stays with sender
  tx.moveCall({
    target: `0x2::pay::split_and_transfer`,
    typeArguments: [coinTypeTag],
    arguments: [merged, recipients, amounts],
  });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

// Env helpers
export function getEnvBMTreasuryCapId() {
  return (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BM_TREASURY_CAP_ID) || null;
}

export function getEnvBMSinkAddress() {
  return (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BM_SINK_ADDRESS) || null;
}

// ========== HIGH-LEVEL POTION OPERATIONS ==========

export async function createPotion({
  executor,
  packageId,
  sender,
  potionType = "HP",
  effectValue,
  quantity,
  description,
  client,
  signAndExecute,
}) {
  const tx = buildCreatePotionTx({
    packageId,
    sender,
    potionType,
    effectValue,
    quantity,
    description,
  });
  const res = await executeTransaction({ tx, executor, client, signAndExecute });
  return res;
}

export async function addPotions({ executor, packageId, potionId, quantity, client, signAndExecute }) {
  const tx = buildAddPotionsTx({ packageId, potionId, quantity });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function usePotion({ executor, packageId, potionId, quantity, client, signAndExecute }) {
  const tx = buildUsePotionTx({ packageId, potionId, quantity });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function setPotionQuantity({ executor, packageId, potionId, newQuantity, client, signAndExecute }) {
  const tx = buildSetPotionQuantityTx({ packageId, potionId, newQuantity });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function setPotionEffectValue({ executor, packageId, potionId, newEffectValue, client, signAndExecute }) {
  const tx = buildSetPotionEffectValueTx({ packageId, potionId, newEffectValue });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function setPotionDescription({ executor, packageId, potionId, newDescription, client, signAndExecute }) {
  const tx = buildSetPotionDescriptionTx({ packageId, potionId, newDescription });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function transferPotion({ executor, packageId, potionId, newOwner, client, signAndExecute }) {
  const tx = buildTransferPotionTx({ packageId, potionId, newOwner });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function burnPotion({ executor, packageId, potionId, client, signAndExecute }) {
  const tx = buildBurnPotionTx({ packageId, potionId });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

// ========== READ HELPERS ==========

export async function getBMToken(client, objectId) {
  if (!client || typeof client.getObject !== "function") {
    throw new Error("client must implement getObject");
  }
  const res = await client.getObject({ id: objectId, options: { showContent: true, showOwner: true } });
  return res;
}

export async function getPotion(client, objectId) {
  if (!client || typeof client.getObject !== "function") {
    throw new Error("client must implement getObject");
  }
  const res = await client.getObject({ id: objectId, options: { showContent: true, showOwner: true } });
  return res;
}

// List: owned BM Token objects by owner address (paginated)
export async function listOwnedBMTokens(client, ownerAddress, packageId, cursor, limit = 50) {
  if (!client || typeof client.getOwnedObjects !== "function") {
    throw new Error("client must implement getOwnedObjects");
  }
  if (!ownerAddress) {
    throw new Error("ownerAddress is required");
  }
  const pkg = resolvePackageId(packageId);
  const res = await client.getOwnedObjects({
    owner: ownerAddress,
    filter: { StructType: `${pkg}::inventory::BMToken` },
    options: { showType: true, showContent: true, showOwner: true },
    cursor,
    limit,
  });
  return res;
}

// List: owned Potion objects by owner address (paginated)
export async function listOwnedPotions(client, ownerAddress, packageId, cursor, limit = 50) {
  if (!client || typeof client.getOwnedObjects !== "function") {
    throw new Error("client must implement getOwnedObjects");
  }
  if (!ownerAddress) {
    throw new Error("ownerAddress is required");
  }
  const pkg = resolvePackageId(packageId);
  const res = await client.getOwnedObjects({
    owner: ownerAddress,
    filter: { StructType: `${pkg}::inventory::Potion` },
    options: { showType: true, showContent: true, showOwner: true },
    cursor,
    limit,
  });
  return res;
}

// ========== EVENT QUERY HELPERS ==========

export async function listInventoryEvents(client, packageId, eventName, cursor) {
  const pkg = resolvePackageId(packageId);
  const type = `${pkg}::inventory::${eventName}`;
  const res = await client.queryEvents({
    query: { MoveEventType: type },
    cursor,
    limit: 50,
  });
  return res;
}

// BM Token Events
export async function listBMTokenMintedEvents(client, packageId, cursor) {
  return listInventoryEvents(client, packageId, "BMTokenMinted", cursor);
}

export async function listBMTokenUpdatedEvents(client, packageId, cursor) {
  return listInventoryEvents(client, packageId, "BMTokenUpdated", cursor);
}

export async function listBMTokenBurnedEvents(client, packageId, cursor) {
  return listInventoryEvents(client, packageId, "BMTokenBurned", cursor);
}

// Potion Events
export async function listPotionMintedEvents(client, packageId, cursor) {
  return listInventoryEvents(client, packageId, "PotionMinted", cursor);
}

export async function listPotionUpdatedEvents(client, packageId, cursor) {
  return listInventoryEvents(client, packageId, "PotionUpdated", cursor);
}

export async function listPotionUsedEvents(client, packageId, cursor) {
  return listInventoryEvents(client, packageId, "PotionUsed", cursor);
}

export async function listPotionBurnedEvents(client, packageId, cursor) {
  return listInventoryEvents(client, packageId, "PotionBurned", cursor);
}

// ========== UTILITY FUNCTIONS ==========

// Map human potion type to bag key kind (u8)
function mapPotionTypeToKind(potionType) {
  const t = String(potionType || 'HP').toUpperCase();
  switch (t) {
    case 'HP':
      return 1;
    default:
      return 1;
  }
}

async function getFirstOwnedInventoryId(client, ownerAddress, packageId) {
  try {
    const res = await listOwnedInventories(client, ownerAddress, packageId, null, 1);
    const first = (res?.data ?? [])[0];
    return first?.data?.objectId || first?.objectId || null;
  } catch (_) {
    return null;
  }
}

async function getInventoryBagId(client, inventoryId) {
  if (!inventoryId) return null;
  try {
    const invObj = await client.getObject({ id: inventoryId, options: { showContent: true } });
    const bag = invObj?.data?.content?.fields?.bag;
    const bagId = bag?.fields?.id?.id || bag?.fields?.id || bag?.id?.id || bag?.id;
    return bagId || null;
  } catch (_) {
    return null;
  }
}

async function getPotionQuantityInInventoryBag(client, packageId, inventoryId, potionKind) {
  const bagId = await getInventoryBagId(client, inventoryId);
  if (!bagId) return null;
  const pkg = resolvePackageId(packageId);
  const nameType = `${pkg}::inventory::PotionKey`;
  try {
    const res = await client.getDynamicFieldObject({ parentId: bagId, name: { type: nameType, value: { kind: Number.isFinite(Number(potionKind)) ? Math.trunc(Number(potionKind)) : 1 } } });
    const valFields = res?.data?.content?.fields?.value?.fields;
    const qty = parseInt(valFields?.quantity ?? 0);
    return Number.isFinite(qty) ? qty : 0;
  } catch (_) {
    return null;
  }
}

// Helper to check if user has sufficient BM tokens
export async function hasSufficientBMTokens(client, bmTokenId, requiredAmount) {
  const bmToken = await getBMToken(client, bmTokenId);
  if (!bmToken?.data?.content?.fields) {
    return false;
  }
  const currentAmount = parseInt(bmToken.data.content.fields.amount);
  return currentAmount >= requiredAmount;
}

// Helper to check if user has sufficient potions
export async function hasSufficientPotions(client, potionId, requiredQuantity) {
  const potion = await getPotion(client, potionId);
  if (!potion?.data?.content?.fields) {
    return false;
  }
  const currentQuantity = parseInt(potion.data.content.fields.quantity);
  return currentQuantity >= requiredQuantity;
}

// (removed) Duplicate legacy object-based balance helper; use getTotalBMCoinBalance instead

// Helper to get total potion count by type for a user
export async function getTotalPotionCountByType(client, ownerAddress, packageId, potionType = "HP") {
  // 1) Prefer Inventory Bag dynamic field path
  try {
    const invId = await getFirstOwnedInventoryId(client, ownerAddress, packageId);
    if (invId) {
      const kind = mapPotionTypeToKind(potionType);
      const qty = await getPotionQuantityInInventoryBag(client, packageId, invId, kind);
      if (qty != null) return qty;
    }
  } catch (_) {}

  // 2) Fallback to legacy Potion objects
  try {
    const ownedPotions = await listOwnedPotions(client, ownerAddress, packageId);
    let totalCount = 0;
    for (const potion of ownedPotions?.data ?? []) {
      const fields = potion?.data?.content?.fields || potion?.content?.fields;
      if (fields?.potion_type === potionType) {
        const q = parseInt(fields?.quantity ?? 0);
        if (Number.isFinite(q)) totalCount += q;
      }
    }
    return totalCount;
  } catch (_) {
    return 0;
  }
}
