import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";

function isHexString(input) {
  return typeof input === "string" && /^0x?[0-9a-fA-F]+$/.test(input);
}

function hexToBytes(hex) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

function base64ToBytes(b64) {
  if (typeof atob !== "undefined") {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  // Node fallback (mainly for tooling/tests)
  return Uint8Array.from(Buffer.from(b64, "base64"));
}

export function detectSigningStrategy() {
  const hasEnvKey = !!import.meta.env.VITE_SUI_DEV_PRIVATE_KEY;
  const hasMnemonic = !!import.meta.env.VITE_SUI_DEV_MNEMONIC;
  return import.meta.env.DEV && (hasMnemonic || hasEnvKey) ? "env-key" : "wallet";
}

export function createEnvKeypairFromEnv() {
  const mnemonic = import.meta.env.VITE_SUI_DEV_MNEMONIC;
  if (mnemonic) {
    const path = import.meta.env.VITE_SUI_DEV_DERIVATION_PATH; // optional
    return Ed25519Keypair.deriveKeypair(mnemonic.trim(), path);
  }

  const secret = import.meta.env.VITE_SUI_DEV_PRIVATE_KEY;
  if (secret) {
    let secretBytes;
    if (isHexString(secret)) {
      secretBytes = hexToBytes(secret);
    } else {
      try {
        secretBytes = base64ToBytes(secret);
      } catch (e) {
        throw new Error("Invalid VITE_SUI_DEV_PRIVATE_KEY format. Use hex or base64.");
      }
    }

    // Accept both 32-byte seed and 64-byte secret key formats
    if (secretBytes.length === 32) {
      return Ed25519Keypair.fromSeed(secretBytes);
    }
    if (secretBytes.length === 64) {
      return Ed25519Keypair.fromSecretKey(secretBytes);
    }
    throw new Error("Unsupported key length for VITE_SUI_DEV_PRIVATE_KEY. Expect 32 or 64 bytes.");
  }

  return null;
}

export function getAddressFromKeypair(keypair) {
  return keypair.getPublicKey().toSuiAddress();
}

export function buildEnvKeyExecutor({ client, keypair }) {
  const hasTxBlock = !!(client && typeof client.signAndExecuteTransactionBlock === "function");
  const hasTx = !!(client && typeof client.signAndExecuteTransaction === "function");
  if (!hasTxBlock && !hasTx) {
    // 최신 SDK에서는 executeTransactionBlock 경로만으로도 처리 가능하므로 강제 요구하지 않음
  }
  if (!keypair) {
    throw new Error("keypair is required for env-key executor");
  }
  return async (tx) => {
    // 허용: 직렬화된 값 또는 타 구현 → TransactionBlock으로 복원
    if (!(tx && typeof tx === "object" && typeof tx.setSenderIfNotSet === "function")) {
      const rebuilt = typeof tx === "string" ? TransactionBlock.from(tx) : TransactionBlock.from(tx);
      tx = rebuilt;
    }
    tx.setSenderIfNotSet(getAddressFromKeypair(keypair));
    // 1) 우선 signAndExecuteTransactionBlock 사용 가능 시 그대로 사용
    if (hasTxBlock) {
      return client.signAndExecuteTransactionBlock({
        signer: keypair,
        transactionBlock: tx,
        options: { showEffects: true, showObjectChanges: true, showEvents: true },
      });
    }
    // 2) 그 외에는 직접 빌드+서명 후 executeTransactionBlock 호출 (API 차이 회피)
    const built = await tx.build({ client });
    const { signature } = await keypair.signTransactionBlock(built);
    return client.executeTransactionBlock({
      transactionBlock: built,
      signature,
      options: { showEffects: true, showObjectChanges: true, showEvents: true },
    });
  };
}

export function buildWalletExecutor(signAndExecute) {
  if (typeof signAndExecute !== "function") {
    throw new Error("signAndExecute function is required");
  }
  return async (tx) =>
    signAndExecute({
      transactionBlock: tx,
      options: { showEffects: true, showObjectChanges: true, showEvents: true },
    });
}


