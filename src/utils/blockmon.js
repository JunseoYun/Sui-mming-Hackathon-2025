import { Transaction } from "@mysten/sui.js/transactions";
import { SuiClient } from "@mysten/sui.js/client";
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
  return `${pkg}::blockmon::${name}`;
}

// Generic execute helper
// executor should be a function compatible with dapp-kit useSignAndExecuteTransaction
// e.g. (tx) => signAndExecute({ transaction: tx, options: { showEffects: true, showObjectChanges: true, showEvents: true } })
export async function executeTransaction({ tx, executor, client, signAndExecute }) {
  let effectiveExecutor = executor;

  if (typeof effectiveExecutor !== "function") {
    const strategy = detectSigningStrategy();
    if (strategy === "env-key") {
      if (!(client instanceof SuiClient)) {
        throw new Error("SuiClient instance is required to sign with env-key strategy");
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
    if (!(client instanceof SuiClient)) {
      throw new Error("SuiClient instance is required to sign with env-key strategy");
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

// Build: create BlockMon and transfer to sender
export function buildCreateBlockMonTx({
  packageId,
  sender,
  monId,
  name,
  hp,
  str,
  dex,
  con,
  int,
  wis,
  cha,
  skillName,
  skillDescription,
}) {
  const pkg = resolvePackageId(packageId);
  if (!sender) throw new Error("sender address is required to transfer the newly created BlockMon");
  const tx = new Transaction();

  const created = tx.moveCall({
    target: fn(pkg, "createBlockMon"),
    arguments: [
      tx.pure.string(monId),
      tx.pure.string(name),
      tx.pure.u64(hp),
      tx.pure.u64(str),
      tx.pure.u64(dex),
      tx.pure.u64(con),
      tx.pure.u64(int),
      tx.pure.u64(wis),
      tx.pure.u64(cha),
      tx.pure.string(skillName),
      tx.pure.string(skillDescription),
    ],
  });

  tx.transferObjects([created], tx.pure.address(sender));
  return tx;
}

// Build: setters (mutations)
export function buildSetNameTx({ packageId, blockmonId, name }) {
  const pkg = resolvePackageId(packageId);
  const tx = new Transaction();
  tx.moveCall({
    target: fn(pkg, "set_name"),
    arguments: [tx.object(blockmonId), tx.pure.string(name)],
  });
  return tx;
}

export function buildSetMonIdTx({ packageId, blockmonId, monId }) {
  const pkg = resolvePackageId(packageId);
  const tx = new Transaction();
  tx.moveCall({
    target: fn(pkg, "set_mon_id"),
    arguments: [tx.object(blockmonId), tx.pure.string(monId)],
  });
  return tx;
}

export function buildSetBaseTx({ packageId, blockmonId, base }) {
  const { hp, str, dex, con, int, wis, cha } = base || {};
  const pkg = resolvePackageId(packageId);
  const tx = new Transaction();
  // set_base takes a MonStat struct; we use set_stats which accepts scalars for convenience
  tx.moveCall({
    target: fn(pkg, "set_stats"),
    arguments: [
      tx.object(blockmonId),
      tx.pure.u64(hp),
      tx.pure.u64(str),
      tx.pure.u64(dex),
      tx.pure.u64(con),
      tx.pure.u64(int),
      tx.pure.u64(wis),
      tx.pure.u64(cha),
    ],
  });
  return tx;
}

export function buildSetSkillTx({ packageId, blockmonId, skillName, skillDescription }) {
  const pkg = resolvePackageId(packageId);
  const tx = new Transaction();
  tx.moveCall({
    target: fn(pkg, "set_skill"),
    arguments: [tx.object(blockmonId), tx.pure.string(skillName), tx.pure.string(skillDescription)],
  });
  return tx;
}

export function buildSetStatsTx({ packageId, blockmonId, stats }) {
  const { hp, str, dex, con, int, wis, cha } = stats || {};
  const pkg = resolvePackageId(packageId);
  const tx = new Transaction();
  tx.moveCall({
    target: fn(pkg, "set_stats"),
    arguments: [
      tx.object(blockmonId),
      tx.pure.u64(hp),
      tx.pure.u64(str),
      tx.pure.u64(dex),
      tx.pure.u64(con),
      tx.pure.u64(int),
      tx.pure.u64(wis),
      tx.pure.u64(cha),
    ],
  });
  return tx;
}

// Build: record battle (immutable borrow)
export function buildRecordBattleTx({
  packageId,
  blockmonId,
  opponent,
  won,
  playerRemainingHp,
  opponentRemainingHp,
}) {
  const pkg = resolvePackageId(packageId);
  const tx = new Transaction();
  tx.moveCall({
    target: fn(pkg, "recordBattle"),
    arguments: [
      tx.object(blockmonId),
      tx.pure.string(opponent),
      tx.pure.bool(!!won),
      tx.pure.u64(playerRemainingHp),
      tx.pure.u64(opponentRemainingHp),
    ],
  });
  return tx;
}

// Build: burn (consumes the object)
export function buildBurnTx({ packageId, blockmonId }) {
  const pkg = resolvePackageId(packageId);
  const tx = new Transaction();
  tx.moveCall({
    target: fn(pkg, "burn"),
    arguments: [tx.object(blockmonId)],
  });
  return tx;
}

// Convenience high-level operations that both build and execute
export async function createBlockMon({
  executor,
  packageId,
  sender,
  monId,
  name,
  hp,
  str,
  dex,
  con,
  int,
  wis,
  cha,
  skillName,
  skillDescription,
  client,
  signAndExecute,
}) {
  const tx = buildCreateBlockMonTx({
    packageId,
    sender,
    monId,
    name,
    hp,
    str,
    dex,
    con,
    int,
    wis,
    cha,
    skillName,
    skillDescription,
  });
  const res = await executeTransaction({ tx, executor, client, signAndExecute });
  return res;
}

export async function updateStats({ executor, packageId, blockmonId, stats, client, signAndExecute }) {
  const tx = buildSetStatsTx({ packageId, blockmonId, stats });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function updateName({ executor, packageId, blockmonId, name, client, signAndExecute }) {
  const tx = buildSetNameTx({ packageId, blockmonId, name });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function updateMonId({ executor, packageId, blockmonId, monId, client, signAndExecute }) {
  const tx = buildSetMonIdTx({ packageId, blockmonId, monId });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function updateSkill({ executor, packageId, blockmonId, skillName, skillDescription, client, signAndExecute }) {
  const tx = buildSetSkillTx({ packageId, blockmonId, skillName, skillDescription });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function recordBattle({
  executor,
  packageId,
  blockmonId,
  opponent,
  won,
  playerRemainingHp,
  opponentRemainingHp,
  client,
  signAndExecute,
}) {
  const tx = buildRecordBattleTx({ packageId, blockmonId, opponent, won, playerRemainingHp, opponentRemainingHp });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

export async function burn({ executor, packageId, blockmonId, client, signAndExecute }) {
  const tx = buildBurnTx({ packageId, blockmonId });
  return executeTransaction({ tx, executor, client, signAndExecute });
}

// READ helpers
export async function getBlockMon(client, objectId) {
  if (!(client instanceof SuiClient)) {
    throw new Error("client must be an instance of SuiClient");
  }
  const res = await client.getObject({ id: objectId, options: { showContent: true, showOwner: true } });
  return res;
}

export async function listBlockMonEvents(client, packageId, eventName, cursor) {
  const pkg = resolvePackageId(packageId);
  const type = `${pkg}::blockmon::${eventName}`; // e.g., Minted, BattleRecorded, Burned
  const res = await client.queryEvents({
    query: { MoveEventType: type },
    cursor,
    limit: 50,
  });
  return res;
}

export async function listMintedEvents(client, packageId, cursor) {
  return listBlockMonEvents(client, packageId, "Minted", cursor);
}

export async function listBattleRecordedEvents(client, packageId, cursor) {
  return listBlockMonEvents(client, packageId, "BattleRecorded", cursor);
}

export async function listBurnedEvents(client, packageId, cursor) {
  return listBlockMonEvents(client, packageId, "Burned", cursor);
}


