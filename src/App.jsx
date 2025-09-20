import React, { useMemo, useState, useEffect, useRef } from "react";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import {
  createBlockmonFromSeed,
  fuseBlockmons,
  generateSeed,
  rollBattleOutcome,
  formatSeed,
  evaluateFusionRecipe,
} from "./utils/random";
import { translate, translateSpecies } from "./i18n";
import "./App.css";
import "./index.css";
import {
  createNetworkConfig,
  SuiClientProvider,
  useSuiClientContext,
  useSignAndExecuteTransaction,
  useCurrentAccount,
  WalletProvider,
} from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isEnokiNetwork, registerEnokiWallets } from "@mysten/enoki";
import FusionFeedback from "./components/FusionFeedback";
import ChainLog from "./components/ChainLog";
import AppView from "./components/AppView";
import RegisterEnokiWallets from "./components/RegisterEnokiWallets";
import { getFullnodeUrl } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import {
  detectSigningStrategy,
  createEnvKeypairFromEnv,
  buildEnvKeyExecutor,
  buildWalletExecutor,
  getAddressFromKeypair,
} from "./utils/signer";
import {
  listOwnedBlockMons,
  createBlockMon as onchainCreateBlockMon,
  createManyBlockMon as onchainCreateManyBlockMon,
  extractCreatedByType,
  extractCreatedManyByType,
  getBlockMon,
  burn as onchainBurn,
  burnMany as onchainBurnMany,
  resolvePackageId,
} from "./utils/blockmon";
import { catalog as speciesCatalog } from "./utils/random";
import { assembleBattleLog, formatLogTime } from "./utils/battleLog";
import { mapOnchainToLocal } from "./utils/mappers";
import { pages } from "./routes/pages";
import {
  listOwnedPotions,
  createPotion as onchainCreatePotion,
  addPotions as onchainAddPotions,
  getTotalPotionCountByType,
  usePotion as onchainUsePotion,
} from "./utils/inventory";
import {
  listOwnedBMTokens,
  createBMToken as onchainCreateBMToken,
  addBMTokens as onchainAddBMTokens,
  subtractBMTokens as onchainSubtractBMTokens,
  getTotalBMTokenBalance,
} from "./utils/inventory";
import {
  createChainOps,
  loadPendingMints,
  clearPendingMints,
  savePendingMints,
  removeEntriesFromQueue,
  loadPendingBurns,
  clearPendingBurns,
  enqueuePendingBurns,
  removeBurnIdsFromQueue,
} from "./services/chain";
import { useTea, TeaMsg, initialModel } from "./state/tea";
import { createUiService } from "./services/ui";
import { createInventoryService } from "./services/inventoryService";

// pages moved to routes/pages

// formatLogTime moved to utils/battleLog

const { networkConfig } = createNetworkConfig({
  local: { url: import.meta.env.VITE_SUI_RPC_URL || "http://127.0.0.1:9000" },
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
});

const queryClient = new QueryClient();

function App() {
  const defaultNetwork = import.meta.env.VITE_SUI_NETWORK || "testnet";
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={defaultNetwork}>
        <RegisterEnokiWallets />
        <WalletProvider autoConnect>
          <GameApp />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

// assembleBattleLog moved to utils/battleLog

function GameApp() {
  const [player, setPlayer] = useState(null);
  const [tokens, setTokens] = useState(0);
  const [blockmons, setBlockmons] = useState([]);
  const [dnaVault, setDnaVault] = useState([]);
  const [seedHistory, setSeedHistory] = useState([]);
  const [adventure, setAdventure] = useState(null);
  const [battle, setBattle] = useState(null);
  const [battleHistory, setBattleHistory] = useState([]);
  const [fusionHistory, setFusionHistory] = useState([]);
  const [pvpHistory, setPvpHistory] = useState([]);
  // moved to TEA: adventureSelection, pvpSelection
  const [potions, setPotions] = useState(0);
  const [fusionFeedback, setFusionFeedback] = useState(null);
  const [signing, setSigning] = useState({ strategy: "wallet", address: null });
  const [starterAttempted, setStarterAttempted] = useState(false);
  const [purchasingPotion, setPurchasingPotion] = useState(false);
  const [flushingPending, setFlushingPending] = useState(false);
  const CHAIN_LOG_KEY = 'blockmon_chain_log';
  const [chainLog, setChainLog] = useState(() => {
    try {
      const raw = localStorage.getItem(CHAIN_LOG_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  });
  const [ui, dispatch] = useTea(initialModel);
  const language = ui.language;
  const currentPage = ui.currentPage;
  const systemMessage = ui.systemMessage;
  const showChainLog = ui.showChainLog;
  const adventureSelection = ui.adventureSelection;
  const pvpSelection = ui.pvpSelection;
  const setLanguage = (lang) => dispatch(TeaMsg.SetLanguage(lang));
  const setCurrentPage = (page) => dispatch(TeaMsg.Navigate(page));
  const setSystemMessage = (message) => dispatch(TeaMsg.SetSystemMessage(message));
  const setShowChainLog = (value) => dispatch(TeaMsg.SetShowChainLog(value));
  const setAdventureSelection = (selectionOrFn) => {
    if (typeof selectionOrFn === 'function') {
      const next = selectionOrFn(ui.adventureSelection);
      dispatch(TeaMsg.SetAdventureSelection(next));
    } else {
      dispatch(TeaMsg.SetAdventureSelection(selectionOrFn));
    }
  };
  const setPvpSelection = (selectionOrFn) => {
    if (typeof selectionOrFn === 'function') {
      const next = selectionOrFn(ui.pvpSelection);
      dispatch(TeaMsg.SetPvpSelection(next));
    } else {
      dispatch(TeaMsg.SetPvpSelection(selectionOrFn));
    }
  };

  const { client, network } = useSuiClientContext();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const currentAccount = useCurrentAccount();

  const executor = useMemo(() => {
    const strategy = detectSigningStrategy();
    if (strategy === "env-key") {
      try {
        const keypair = createEnvKeypairFromEnv();
        const address = keypair ? getAddressFromKeypair(keypair) : null;
        setSigning({ strategy, address });
        return buildEnvKeyExecutor({ client, keypair });
      } catch (e) {
        console.error("[Signer] env-key init failed, falling back to wallet:", e);
      }
    }
    setSigning({ strategy: "wallet", address: currentAccount?.address ?? null });
    return buildWalletExecutor(signAndExecute);
  }, [client, signAndExecute, currentAccount?.address]);

  const t = useMemo(() => {
    const translateFn = (key, params) => translate(language, key, params);
    translateFn.language = language;
    return translateFn;
  }, [language]);

  // ----- Chain log helpers -----
  const appendChainLog = (entry) => {
    try {
      const withTs = { time: new Date().toISOString(), ...entry };
      setChainLog((prev) => {
        const next = [...prev, withTs];
        const capped = next.slice(Math.max(0, next.length - 200));
        try { localStorage.setItem(CHAIN_LOG_KEY, JSON.stringify(capped)); } catch (_) {}
        return capped;
      });
      // 개발 편의 콘솔
      const label = `[Chain] ${entry.action || 'action'} ${entry.status || ''}`;
      if (entry.status === 'error') console.error(label, entry);
      else console.log(label, entry);
    } catch (_) {}
  };
  const logTxStart = (action, meta) => appendChainLog({ level: 'info', action, status: 'start', ...meta });
  const logTxSuccess = (action, res, meta) => appendChainLog({ level: 'info', action, status: 'success', digest: res?.digest || res?.effects?.transactionDigest || res?.effectsDigest, ...meta });
  const logTxError = (action, err, meta) => appendChainLog({ level: 'error', action, status: 'error', error: String(err?.message || err), ...meta });

  // ----- Chain side-effect helpers from services -----
  const { runSerialized, withRetry, queueAndRetry } = useMemo(() => createChainOps(appendChainLog), [appendChainLog]);

  // Pending mint queue helpers moved to services/chain

  // Flush pending queue on owner ready
  useEffect(() => {
    const owner = signing.address ?? currentAccount?.address ?? null;
    if (!owner) return;
    if (flushingPending) return;
    let cancelled = false;
    (async () => {
      setFlushingPending(true);
      try {
        const pkg = resolvePackageId();
        const q = loadPendingMints();
        if (!q.length) return;
        const BATCH_SIZE = 5;
        const newMapped = [];
        for (let i = 0; i < q.length; i += BATCH_SIZE) {
          if (cancelled) break;
          const batch = q.slice(i, i + BATCH_SIZE);
          try {
            logTxStart('pending.flush.batch', { size: batch.length, offset: i });
            const res = await queueAndRetry('pending.flush.batch', async () => onchainCreateManyBlockMon({ executor, packageId: pkg, sender: owner, entries: batch, client, signAndExecute }), { attempts: 5, baseDelayMs: 600 });
            try {
              const digest = res?.digest || res?.effects?.transactionDigest || res?.effectsDigest;
              if (digest && typeof client.waitForTransactionBlock === 'function') {
                await client.waitForTransactionBlock({ digest, options: { showEffects: true, showObjectChanges: true } });
              }
            } catch (_) {}
            const fullType = `${pkg}::blockmon::BlockMon`;
            const ids = extractCreatedManyByType(res, fullType);
            if (ids?.length) {
              const fetched = await Promise.all(ids.map(async (id) => { try { const obj = await getBlockMon(client, id); return mapOnchainToLocal({ data: obj?.data ?? obj }); } catch (_) { return null; } }));
              newMapped.push(...fetched.filter(Boolean));
            }
            removeEntriesFromQueue([...batch]);
            logTxSuccess('pending.flush.batch', res, { size: batch.length, created: (ids?.length || 0), offset: i });
          } catch (err) {
            logTxError('pending.flush.batch', err, { size: batch.length, offset: i, fallback: true });
            // fallback sequential
            for (const entry of batch) {
              try {
                logTxStart('pending.flush.mint', { monId: entry.monId, name: entry.name });
                const res = await queueAndRetry('pending.flush.single', async () => onchainCreateBlockMon({ executor, packageId: pkg, sender: owner, ...entry, client, signAndExecute }), { attempts: 6, baseDelayMs: 600 });
                const fullType = `${pkg}::blockmon::BlockMon`;
                const objectId = extractCreatedByType(res, fullType);
                if (objectId) {
                  try { const fetched = await getBlockMon(client, objectId); const mapped = mapOnchainToLocal({ data: fetched?.data ?? fetched }); if (mapped) newMapped.push(mapped); } catch (_) {}
                  removeEntriesFromQueue([entry]);
                }
                logTxSuccess('pending.flush.mint', res, { monId: entry.monId, name: entry.name, objectId });
              } catch (e2) {
                logTxError('pending.flush.mint', e2, { monId: entry.monId, name: entry.name });
              }
            }
          }
        }
        if (newMapped.length > 0 && !cancelled) {
          setBlockmons((prev) => [...prev, ...newMapped]);
        }
      } catch (e) {
        console.error('[Onchain] flush pending captured failed', e);
        logTxError('pending.flush', e);
      } finally {
        if (!cancelled) setFlushingPending(false);
      }
    })();
    return () => { cancelled = true; };
  }, [client, signing.address, currentAccount?.address, executor]);

  // Pending burn queue helpers moved to services/chain

  // Flush pending burns on owner ready
  useEffect(() => {
    const owner = signing.address ?? currentAccount?.address ?? null;
    if (!owner) return;
    let cancelled = false;
    (async () => {
      try {
        const pkg = resolvePackageId();
        const all = loadPendingBurns();
        if (!all.length) return;
        const BATCH_SIZE = 10;
        for (let i = 0; i < all.length; i += BATCH_SIZE) {
          if (cancelled) break;
          const batch = all.slice(i, i + BATCH_SIZE).filter(Boolean);
          if (!batch.length) continue;
          try {
            logTxStart('pending.burn.batch', { size: batch.length, offset: i });
            await queueAndRetry('pending.burn.batch', async () => onchainBurnMany({ executor, packageId: pkg, blockmonIds: batch, client, signAndExecute }), { attempts: 5, baseDelayMs: 700 });
            removeBurnIdsFromQueue(batch);
            logTxSuccess('pending.burn.batch', { digest: null }, { size: batch.length, offset: i });
          } catch (err) {
            logTxError('pending.burn.batch', err, { size: batch.length, offset: i, fallback: true });
            for (const id of batch) {
              try {
                logTxStart('pending.burn.single', { id });
                await queueAndRetry('pending.burn.single', async () => onchainBurn({ executor, packageId: pkg, blockmonId: id, client, signAndExecute }), { attempts: 6, baseDelayMs: 600 });
                removeBurnIdsFromQueue([id]);
                logTxSuccess('pending.burn.single', { digest: null }, { id });
              } catch (e2) {
                logTxError('pending.burn.single', e2, { id });
              }
            }
          }
        }
      } catch (e) {
        console.error('[Onchain] flush pending burns failed', e);
        logTxError('pending.burn', e);
      }
    })();
    return () => { cancelled = true; };
  }, [client, signing.address, currentAccount?.address, executor]);

  // mapOnchainToLocal moved to utils/mappers

  // 주소가 준비되면 온체인 보유 BlockMon을 로드
  useEffect(() => {
    const owner = signing.address ?? currentAccount?.address ?? null;
    if (!owner) return;
    let cancelled = false;
    (async () => {
      try {
        const all = [];
        let cursor = null;
        const pkg = resolvePackageId();
        do {
          const res = await listOwnedBlockMons(client, owner, pkg, cursor, 50);
          const page = (res?.data ?? []).map(mapOnchainToLocal).filter(Boolean);
          all.push(...page);
          cursor = res?.nextCursor ?? null;
        } while (cursor);
        if (!cancelled) {
          setBlockmons(all);
          setAdventureSelection((prev) => (prev?.length ? prev : all.slice(0, 4).map((m) => m.id)));
          setPvpSelection((prev) => (prev?.length ? prev : all.slice(0, 4).map((m) => m.id)));

          // 최초 접속 시 보유 블록몬이 없다면, 가입 시 생성한 스타터 시드로 1마리 자동 민트
          if (all.length === 0 && !starterAttempted && (player?.starterSeed || true)) {
            try {
              const seedHex = player?.starterSeed ?? formatSeed(generateSeed());
              const base = createBlockmonFromSeed(BigInt(`0x${seedHex}`), { origin: '스타터' });
              const species = speciesCatalog.find((s) => s.name === base.species);
              const monId = species?.id ?? base.species;
              const res = await onchainCreateBlockMon({
                executor,
                packageId: pkg,
                sender: owner,
                monId,
                name: base.name,
                hp: Number(base.maxHp ?? base.hp ?? 0),
                str: Number(base.stats?.str ?? 0),
                dex: Number(base.stats?.dex ?? 0),
                con: Number(base.stats?.con ?? 0),
                int: Number(base.stats?.int ?? 0),
                wis: Number(base.stats?.wis ?? 0),
                cha: Number(base.stats?.cha ?? 0),
                skillName: String(base.skill?.name ?? ''),
                skillDescription: String(base.skill?.description ?? ''),
                client,
                signAndExecute,
              });
              const fullType = `${pkg}::blockmon::BlockMon`;
              const objectId = extractCreatedByType(res, fullType);
              if (objectId) {
                try {
                  const fetched = await getBlockMon(client, objectId);
                  const mapped = mapOnchainToLocal({ data: fetched?.data ?? fetched });
                  if (mapped) {
                    setBlockmons([mapped]);
                    setAdventureSelection([mapped.id]);
                    setPvpSelection([mapped.id]);
                    setStarterAttempted(true);
                    if (!player?.starterSeed) {
                      setPlayer((prev) => (prev ? { ...prev, starterSeed: seedHex } : prev));
                    }
                  } else {
                    setBlockmons([{ ...base, id: objectId, onchain: true }]);
                    setStarterAttempted(true);
                    if (!player?.starterSeed) {
                      setPlayer((prev) => (prev ? { ...prev, starterSeed: seedHex } : prev));
                    }
                  }
                } catch (e) {
                  setBlockmons([{ ...base, id: objectId, onchain: true }]);
                  setStarterAttempted(true);
                  if (!player?.starterSeed) {
                    setPlayer((prev) => (prev ? { ...prev, starterSeed: seedHex } : prev));
                  }
                }
              }
            } catch (e) {
              console.error('[Onchain] starter mint failed', e);
            }
          }
        }
      } catch (e) {
        console.error("[Onchain] load owned failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, signing.address, currentAccount?.address, executor, starterAttempted, player?.starterSeed]);

  // 주소가 준비되면 온체인 포션 총합을 로드하여 동기화
  useEffect(() => {
    const owner = signing.address ?? currentAccount?.address ?? null;
    if (!owner) return;
    let cancelled = false;
    (async () => {
      try {
        const pkg = resolvePackageId();
        // BM 토큰 총합 동기화
        try {
          const bmTotal = await getTotalBMTokenBalance(client, owner, pkg);
          if (!cancelled && Number.isFinite(bmTotal)) {
            setTokens(bmTotal);
          }
        } catch (e) {
          console.error("[Onchain] load BM tokens failed", e);
        }
        // 포션 총합 동기화 (읽기 종단일관성 고려: 짧은 재시도)
        let total = await getTotalPotionCountByType(client, owner, pkg, "HP");
        for (let i = 0; i < 3 && (!Number.isFinite(total)); i++) {
          await new Promise((r) => setTimeout(r, 300));
          total = await getTotalPotionCountByType(client, owner, pkg, "HP");
        }
        if (!cancelled && Number.isFinite(total)) setPotions(total);
      } catch (e) {
        console.error("[Onchain] load potions failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, signing.address, currentAccount?.address]);

  const appendSeed = (seedHex, context) => {
    setSeedHistory((prev) => [
      ...prev,
      {
        seed: seedHex,
        context,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const registerUser = (nickname) => {
    const owner = signing.address ?? currentAccount?.address ?? null;
    if (owner) {
      (async () => {
        try {
          const pkg = resolvePackageId();
          const res = await listOwnedBlockMons(client, owner, pkg, null, 50);
          const all = (res?.data ?? []).map(mapOnchainToLocal).filter(Boolean);

          if (all.length > 0) {
            setPlayer({
              nickname,
              joinedAt: new Date().toISOString(),
              starterSeed: undefined,
            });
            // BM 토큰은 온체인에서 동기화
            setBlockmons(all);
            setAdventureSelection(all.slice(0, 4).map((m) => m.id));
            setPvpSelection(all.slice(0, 4).map((m) => m.id));
            // 포션은 온체인에서 동기화
            setDnaVault([]);
            setSystemMessage(null);
            setCurrentPage("home");
            return;
          }

          const starterSeed = generateSeed();
          const starter = createBlockmonFromSeed(starterSeed, { origin: "스타터 DNA" });
          setPlayer({
            nickname,
            joinedAt: new Date().toISOString(),
            starterSeed: formatSeed(starterSeed),
          });
          setStarterAttempted(false);
          // BM 토큰은 온체인에서 동기화
          setBlockmons([starter]);
          setAdventureSelection([starter.id]);
          setPvpSelection([starter.id]);
          // 포션은 온체인에서 동기화
          setDnaVault([
            {
              dna: starter.dna,
              species: starter.species,
              seed: starter.seed,
              status: "활성",
              acquiredAt: new Date().toISOString(),
              note: "가입 보상",
            },
          ]);
          appendSeed(formatSeed(starterSeed), "Starter DNA");
          setSystemMessage({ key: "system.starterCreated" });
          setCurrentPage("home");
        } catch (e) {
          console.error('[Onchain] registerUser chain-first failed', e);
          const starterSeed = generateSeed();
          const starter = createBlockmonFromSeed(starterSeed, { origin: "스타터 DNA" });
          setPlayer({
            nickname,
            joinedAt: new Date().toISOString(),
            starterSeed: formatSeed(starterSeed),
          });
          setStarterAttempted(false);
          // BM 토큰은 온체인에서 동기화
          setBlockmons([starter]);
          setAdventureSelection([starter.id]);
          setPvpSelection([starter.id]);
          // 포션은 온체인에서 동기화
          setDnaVault([
            {
              dna: starter.dna,
              species: starter.species,
              seed: starter.seed,
              status: "활성",
              acquiredAt: new Date().toISOString(),
              note: "가입 보상",
            },
          ]);
          appendSeed(formatSeed(starterSeed), "Starter DNA");
          setSystemMessage({ key: "system.starterCreated" });
          setCurrentPage("home");
        }
      })();
      return;
    }

    const starterSeed = generateSeed();
    const starter = createBlockmonFromSeed(starterSeed, {
      origin: "스타터 DNA",
    });
    setPlayer({
      nickname,
      joinedAt: new Date().toISOString(),
      starterSeed: formatSeed(starterSeed),
    });
    setStarterAttempted(false);
    // BM 토큰은 온체인에서 동기화
    setBlockmons([starter]);
    setAdventureSelection([starter.id]);
    setPvpSelection([starter.id]);
    // 포션은 온체인에서 동기화
    setDnaVault([
      {
        dna: starter.dna,
        species: starter.species,
        seed: starter.seed,
        status: "활성",
        acquiredAt: new Date().toISOString(),
        note: "가입 보상",
      },
    ]);
    appendSeed(formatSeed(starterSeed), "Starter DNA");
    setSystemMessage({ key: "system.starterCreated" });
    setCurrentPage("home");
  };

  const uiService = useMemo(() => createUiService({
    pages,
    setCurrentPage,
    setSystemMessage,
    setLanguage,
    setAdventureSelection,
    setPvpSelection,
    setShowChainLog: (v) => setShowChainLog(v),
    getShowChainLog: () => showChainLog,
    setChainLog,
    CHAIN_LOG_KEY,
  }), [pages, setCurrentPage, setSystemMessage, setLanguage, setAdventureSelection, setPvpSelection, showChainLog]);

  const navigate = (pageKey) => uiService.navigate(pageKey);

  const startAdventure = (selectedIdsParam, potionsSelected = 0) => {
    if (!blockmons.length) return { error: t('errors.noBlockmon') };
    if (tokens < 1) return { error: t('errors.noTokensAdventure') };

    const selectedIds = (selectedIdsParam ?? adventureSelection).slice(0, 4);
    if (!selectedIds.length) {
      return { error: t('errors.selectTeam') };
    }

    const team = selectedIds
      .map((id) => blockmons.find((mon) => mon.id === id))
      .filter(Boolean)
      .slice(0, 4);

    if (!team.length) {
      return { error: t('errors.missingSelected') };
    }

    if (selectedIds.length !== team.length) {
      setAdventureSelection(team.map((mon) => mon.id));
    }

    const maxPotionsCarry = Math.min(potions, team.length);
    const potionsToCarry = Math.max(
      0,
      Math.min(
        maxPotionsCarry,
        Number.isFinite(potionsSelected) ? Math.trunc(potionsSelected) : 0,
      ),
    );

    const seed = generateSeed();
    const seedHex = formatSeed(seed);
    const startedAt = new Date();

    const teamRecords = team.map((mon) => ({
      id: mon.id,
      dna: mon.dna,
      species: mon.species,
      name: mon.name,
      remainingHp: mon.hp,
      maxHp: mon.maxHp ?? mon.hp,
      knockedOut: false,
      potionUsed: false,
    }));

    let logs = [
      {
        time: formatLogTime(language),
        message: t('adventure.log.start', { count: team.length }),
      },
    ];
    const battleRecords = [];
    const capturedMonsters = [];
    let defeats = 0;
    let tokensEarned = 0;
    let offset = 1;
    let potionsRemaining = potionsToCarry;
    let potionsUsed = 0;

    appendSeed(seedHex, 'Adventure Start');

    if (potionsToCarry > 0) {
      setPotions((prev) => prev - potionsToCarry);
    }

    outer: while (teamRecords.some((member) => !member.knockedOut)) {
      const encounterSeed = generateSeed();
      const wildBase = createBlockmonFromSeed(encounterSeed, { origin: '야생 조우' });
      let wildHp = wildBase.hp;
      let encounterEntry = null;

      while (wildHp > 0 && teamRecords.some((member) => !member.knockedOut)) {
        const activeMember = teamRecords.find((member) => !member.knockedOut);
        if (!activeMember) {
          break;
        }

        const baseMon =
          blockmons.find((mon) => mon.id === activeMember.id) ??
          team.find((mon) => mon.id === activeMember.id);
        if (!baseMon) {
          activeMember.knockedOut = true;
          continue;
        }

        const playerMon = { ...baseMon, hp: activeMember.remainingHp };
        const wild = {
          ...wildBase,
          hp: wildHp,
          maxHp: wildBase.maxHp ?? wildBase.hp,
        };

        if (!encounterEntry) {
          encounterEntry = {
            time: formatLogTime(language, offset++),
            message: t('adventure.log.encounter', {
              species: translateSpecies(wildBase.species, language),
            }),
          };
          logs.push(encounterEntry);
        }

        const battleSeed = generateSeed();
        const battleSeedHex = formatSeed(battleSeed);
        const result = rollBattleOutcome(playerMon, wild, battleSeed, {
          potionsAvailable:
            !activeMember.potionUsed && potionsRemaining > 0 ? 1 : 0,
          playerMaxHp: activeMember.maxHp ?? playerMon.maxHp ?? playerMon.hp,
          t: (key, params) => translate(language, key, params),
          language,
        });

        const battleLogEntries = assembleBattleLog(
          result.rounds,
          result.outcome,
          offset,
          language,
          playerMon.species,
          wild.species,
          playerMon.name ?? playerMon.species
        );
        const logCount = battleLogEntries.length;
        offset += logCount + 1;

        logs = [...logs, ...battleLogEntries];

        defeats += result.outcome === 'win' ? 0 : 1;
        activeMember.remainingHp = result.remainingHp;

        const potionsConsumed = Math.min(result.potionsUsed ?? 0, potionsRemaining);
        if (potionsConsumed > 0) {
          potionsRemaining -= potionsConsumed;
          potionsUsed += potionsConsumed;
          activeMember.potionUsed = true;
        }

        activeMember.knockedOut = activeMember.remainingHp <= 0;

        if (activeMember.knockedOut) {
          const finalRound = result.rounds[result.rounds.length - 1];
          const attackerName =
            translateSpecies(finalRound?.actorSpecies, language) ??
            finalRound?.actorSpecies ??
            t('battleLog.actor.opponent');
          const defenderName =
            language === 'en'
              ? translateSpecies(activeMember.species, language)
              : activeMember.name;
          logs.push({
            time: formatLogTime(language, offset++),
            message: t('adventure.log.knockout', {
              defender: defenderName,
              attacker: attackerName,
            }),
          });
        }

        wildHp = result.opponentRemainingHp;

        appendSeed(battleSeedHex, `Wild Battle #${battleRecords.length + 1}`);

        const completedAt = new Date().toISOString();
        const playerSnapshot = {
          ...playerMon,
          hp: result.remainingHp,
          maxHp: playerMon.maxHp ?? playerMon.hp,
        };
        const wildSnapshot = {
          ...wild,
          hp: result.opponentRemainingHp,
          maxHp: wild.maxHp ?? wild.hp,
        };

        const logEntriesForRecord = encounterEntry
          ? [encounterEntry, ...battleLogEntries]
          : battleLogEntries;

        battleRecords.push({
          id: `battle-${battleSeedHex}`,
          seed: battleSeedHex,
          player: playerSnapshot,
          opponent: wildSnapshot,
          outcome: result.outcome,
          rounds: result.rounds,
          logEntries: logEntriesForRecord,
          tokensSpent: 0,
          tokensReward: 0,
          completedAt,
        });

        encounterEntry = null;

        if (wildHp <= 0) {
          const captured = {
            ...wildBase,
            hp: wildBase.maxHp ?? wildBase.hp,
            maxHp: wildBase.maxHp ?? wildBase.hp,
            id: wildBase.id,
            stats: { ...wildBase.stats },
            origin: '포획된 야생 블록몬',
          };
          capturedMonsters.push(captured);
          logs.push({
            time: formatLogTime(language, offset++),
            message: t('adventure.log.capture', {
              species: translateSpecies(wildBase.species, language),
            }),
          });
          break;
        }

        if (teamRecords.every((member) => member.knockedOut)) {
          break outer;
        }
      }
    }

    logs.push({
      time: formatLogTime(language, offset),
      message: t('adventure.log.complete'),
    });

    const teamMaxHpMap = new Map(
      teamRecords.map((member) => [member.id, member.maxHp ?? member.remainingHp ?? 0]),
    );

    const adventureState = {
      id: `adv-${seedHex}`,
      seed: seedHex,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      team: teamRecords,
      potions,
      logs,
      status: 'complete',
      tokensSpent: 1,
      tokensEarned,
      defeats,
      battles: battleRecords.length,
      capturedCount: capturedMonsters.length,
      potionsCarried: potionsToCarry,
      potionsRemaining,
      potionsUsed,
      capturedMonsters,
    };

    if (potionsRemaining > 0) {
      setPotions((prev) => prev + potionsRemaining);
    }

    setBlockmons((prev) => {
      const restored = prev.map((mon) => {
        const maxHp = teamMaxHpMap.get(mon.id);
        if (!maxHp) return mon;
        const appliedMaxHp = mon.maxHp ?? maxHp;
        return { ...mon, hp: appliedMaxHp, maxHp: appliedMaxHp };
      });
      if (!capturedMonsters.length) {
        return restored;
      }
      return [...restored, ...capturedMonsters];
    });

    if (capturedMonsters.length) {
      setDnaVault((prev) => [
        ...prev,
        ...capturedMonsters.map((mon) => ({
          dna: mon.dna,
          species: mon.species,
          seed: mon.seed,
          status: '활성',
          acquiredAt: new Date().toISOString(),
          note: '모험 포획',
        })),
      ]);
    }

    setTokens((prev) => prev - 1 + tokensEarned);
    setAdventure(adventureState);
    setBattle(battleRecords[battleRecords.length - 1] ?? null);
    setBattleHistory((prev) => [...prev, ...battleRecords]);
    setSystemMessage({
      key: 'system.adventureSummary',
      params: {
        battles: battleRecords.length,
        captured: capturedMonsters.length,
        tokens: tokensEarned,
      },
    });
    setCurrentPage('adventure');

    // 온체인 정산 + 포획 민트 순차 실행 (비동기)
    const owner = signing.address ?? currentAccount?.address ?? null;
    if (owner) {
      (async () => {
        try {
          const pkg = resolvePackageId();
          // 1) BM 정산 + 포션 사용을 단일 트랜잭션으로 처리하여 락 충돌 방지
          try {
            let bmTokenId = null;
            try {
              const resBM = await listOwnedBMTokens(client, owner, pkg, null, 50);
              const firstBM = (resBM?.data ?? [])[0];
              bmTokenId = firstBM?.data?.objectId ?? firstBM?.objectId ?? null;
            } catch (e) {
              console.warn('[Onchain] listOwnedBMTokens failed', e);
            }

            let potionId = null;
            if (potionsUsed > 0) {
              try {
                const res = await listOwnedPotions(client, owner, pkg, null, 50);
                const hpEntry = (res?.data ?? []).find((item) => {
                  const fields = item?.data?.content?.fields ?? item?.content?.fields;
                  return fields?.potion_type === 'HP';
                });
                potionId = hpEntry?.data?.objectId ?? hpEntry?.objectId ?? null;
              } catch (e) {
                console.warn('[Onchain] listOwnedPotions failed', e);
              }
            }

            if (bmTokenId || (potionsUsed > 0 && potionId)) {
              logTxStart('adventure.settle', { bmTokenId, potionsUsed, tokensEarned });
              const tx = new TransactionBlock();
              if (bmTokenId) {
                if (tokensEarned > 0) {
                  tx.moveCall({ target: `${pkg}::inventory::add_bm_tokens`, arguments: [tx.object(bmTokenId), tx.pure.u64(tokensEarned)] });
                }
                tx.moveCall({ target: `${pkg}::inventory::subtract_bm_tokens`, arguments: [tx.object(bmTokenId), tx.pure.u64(1)] });
              }
              if (potionsUsed > 0 && potionId) {
                tx.moveCall({ target: `${pkg}::inventory::use_potion`, arguments: [tx.object(potionId), tx.pure.u64(potionsUsed)] });
              }
              try {
              const res = await queueAndRetry('adventure.settle', async () => executor(tx), { attempts: 4, baseDelayMs: 500 });
                const digest = res?.digest || res?.effects?.transactionDigest || res?.effectsDigest;
                if (digest && typeof client.waitForTransactionBlock === 'function') {
                  await client.waitForTransactionBlock({ digest, options: { showEffects: true, showObjectChanges: true } });
                }
                logTxSuccess('adventure.settle', res, { bmTokenId, potionsUsed, tokensEarned });
              } catch (e) {
                console.error('[Onchain] combined reflect failed', e);
                logTxError('adventure.settle', e, { bmTokenId, potionsUsed, tokensEarned });
              }
            }

            // 체인 기준 동기화
            try {
              const bmTotal = await getTotalBMTokenBalance(client, owner, pkg);
              if (Number.isFinite(bmTotal)) setTokens(bmTotal);
            } catch (e) {}
            try {
              const total = await getTotalPotionCountByType(client, owner, pkg, 'HP');
              if (Number.isFinite(total)) setPotions(total);
            } catch (e) {}
          } catch (e) {
            console.error('[Onchain] reflect inventory after adventure failed', e);
          }

          // 2) 포획 블록몬 배치 민트 (인벤토리 정산 후 실행하여 가스 락 충돌 회피)
          if (capturedMonsters.length > 0) {
            try {
              // 청크 배치 크기
              const BATCH_SIZE = 10;
              const toRemoveRefs = new Set(capturedMonsters);
              const newMapped = [];
              const allEntries = capturedMonsters.map((captured) => {
                const species = speciesCatalog.find((s) => s.name === captured.species);
                const monId = species?.id ?? captured.species;
                return {
                  monId,
                  name: captured.name,
                  hp: Number(captured.maxHp ?? captured.hp ?? 0),
                  str: Number(captured.stats?.str ?? 0),
                  dex: Number(captured.stats?.dex ?? 0),
                  con: Number(captured.stats?.con ?? 0),
                  int: Number(captured.stats?.int ?? 0),
                  wis: Number(captured.stats?.wis ?? 0),
                  cha: Number(captured.stats?.cha ?? 0),
                  skillName: String(captured.skill?.name ?? ''),
                  skillDescription: String(captured.skill?.description ?? ''),
                };
              });

              // 실패 대비를 위해 전체를 큐에 저장해두고, 성공 시 제거
              try { savePendingMints([ ...loadPendingMints(), ...allEntries ]); } catch (_) {}

              for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
                const batch = allEntries.slice(i, i + BATCH_SIZE);
                try {
                  logTxStart('capture.batchMint', { size: batch.length, offset: i });
                  const res = await queueAndRetry('capture.batch', async () => onchainCreateManyBlockMon({ executor, packageId: pkg, sender: owner, entries: batch, client, signAndExecute }), { attempts: 4, baseDelayMs: 700 });
                  try {
                    const digest = res?.digest || res?.effects?.transactionDigest || res?.effectsDigest;
                    if (digest && typeof client.waitForTransactionBlock === 'function') {
                      await client.waitForTransactionBlock({ digest, options: { showEffects: true, showObjectChanges: true } });
                    }
                  } catch (_) {}
                  const fullType = `${pkg}::blockmon::BlockMon`;
                  const ids = extractCreatedManyByType(res, fullType);
                  if (ids?.length) {
                    const fetched = await Promise.all(ids.map(async (id) => {
                      try { const obj = await getBlockMon(client, id); return mapOnchainToLocal({ data: obj?.data ?? obj }); } catch (_) { return null; }
                    }));
                    newMapped.push(...fetched.filter(Boolean));
                  }
                  logTxSuccess('capture.batchMint', res, { size: batch.length, created: (ids?.length || 0), offset: i });
                } catch (err) {
                  logTxError('capture.batchMint', err, { size: batch.length, offset: i, fallback: true });
                  for (const entry of batch) {
                    try {
                      logTxStart('capture.mint', { monId: entry.monId, name: entry.name });
                      const res = await queueAndRetry('capture.single', async () => onchainCreateBlockMon({ executor, packageId: pkg, sender: owner, ...entry, client, signAndExecute }), { attempts: 6, baseDelayMs: 600 });
                      const fullType = `${pkg}::blockmon::BlockMon`;
                      const objectId = extractCreatedByType(res, fullType);
                      if (objectId) {
                        try { const fetched = await getBlockMon(client, objectId); const mapped = mapOnchainToLocal({ data: fetched?.data ?? fetched }); if (mapped) newMapped.push(mapped); } catch (_) {}
                        removeEntriesFromQueue([entry]);
                      }
                      logTxSuccess('capture.mint', res, { monId: entry.monId, name: entry.name, objectId });
                    } catch (e2) {
                      logTxError('capture.mint', e2, { monId: entry.monId, name: entry.name });
                    }
                  }
                }
              }

              if (newMapped.length > 0) {
                setBlockmons((prev) => {
                  const withoutLocal = prev.filter((m) => !toRemoveRefs.has(m));
                  return [...withoutLocal, ...newMapped];
                });
              }
            } catch (e) {
              console.error('[Onchain] mint captured failed', e);
            }
          }
        } catch (e) {
          console.error('[Onchain] post-adventure chain ops failed', e);
        }
      })();
    }

    return { success: true };
  };


  const performFusion = (parentIds) => {
    const uniqueIds = Array.from(new Set(parentIds)).filter(Boolean);
    if (uniqueIds.length < 2) {
      return { error: { key: 'fusion.error.selectTwo' } };
    }

    const parents = uniqueIds
      .map((id) => blockmons.find((mon) => mon.id === id))
      .filter(Boolean);

    if (parents.length !== uniqueIds.length) {
      return { error: { key: 'errors.missingSelected' } };
    }

    const baseSpecies = parents[0].species;
    if (!parents.every((parent) => parent.species === baseSpecies)) {
      return { error: { key: 'errors.sameSpeciesFusion' } };
    }

    const { cost: tokenCost, successChance } = evaluateFusionRecipe(parents);
    const chancePercent = Math.round(successChance * 100);
    if (tokens < tokenCost) {
      return { error: { key: 'fusion.error.cost', params: { cost: tokenCost } } };
    }

    const fusionSeed = generateSeed();
    setTokens((prev) => prev - tokenCost);
    const successRoll = Math.random();
    if (successRoll > successChance) {
      const dominant = parents.reduce((best, current) => {
        const bestPower = best?.power ?? -Infinity;
        return (current.power ?? 0) > bestPower ? current : best;
      }, parents[0]);
      const survivors = new Set([dominant.id]);
      const consumedIds = new Set(
        parents.filter((parent) => !survivors.has(parent.id)).map((parent) => parent.id),
      );
      const consumedSeeds = new Set(
        parents
          .filter((parent) => !survivors.has(parent.id))
          .map((parent) => parent.seed ?? parent.id),
      );

      if (consumedIds.size > 0) {
        setBlockmons((prev) => prev.filter((mon) => !consumedIds.has(mon.id)));
        setAdventureSelection((prev) => prev.filter((id) => !consumedIds.has(id)));
        setPvpSelection((prev) => prev.filter((id) => !consumedIds.has(id)));
        setDnaVault((prev) => prev.filter((entry) => !consumedSeeds.has(entry.seed)));
      }

      // 온체인: 실패 시 소모된 부모 소각 (지배적인 1마리 제외) - 단일 트랜잭션으로 처리
      const owner = signing.address ?? currentAccount?.address ?? null;
      if (owner) {
        (async () => {
          try {
            const pkg = resolvePackageId();
            const burnIds = parents
              .filter((p) => p.id && p.id !== dominant.id && /^0x[0-9a-fA-F]+$/.test(p.id))
              .map((p) => p.id);
            if (burnIds.length > 0) {
              logTxStart('fusionFail.burnMany', { size: burnIds.length });
              try {
                await queueAndRetry('fusionFail.burnMany', async () => onchainBurnMany({ executor, packageId: pkg, blockmonIds: burnIds, client, signAndExecute }), { attempts: 4, baseDelayMs: 700 });
                logTxSuccess('fusionFail.burnMany', { digest: null }, { size: burnIds.length });
              } catch (err) {
                logTxError('fusionFail.burnMany', err, { size: burnIds.length, enqueued: true });
                enqueuePendingBurns(burnIds);
              }
            }
          } catch (e) {
            console.error('[Onchain] fusion-fail burn failed', e);
          }
        })();
      }

      const failureRecord = {
        id: `fusion-fail-${formatSeed(fusionSeed)}`,
        result: null,
        parents: parents.map((parent) => ({ ...parent })),
        createdAt: new Date().toISOString(),
        tokensSpent: tokenCost,
        success: false,
        successChance,
      };
      setFusionHistory((prev) => [...prev, failureRecord]);
      setSystemMessage({
        key: 'system.fusionFailed',
        params: { chance: chancePercent },
      });
      setFusionFeedback({ type: 'failure', chance: chancePercent });
      return {
        error: {
          key: 'fusion.error.failure',
          params: { chance: chancePercent },
        },
      };
    }

    const newborn = fuseBlockmons(parents, fusionSeed);

    const parentIdSet = new Set(uniqueIds);
    const parentSeedSet = new Set(parents.map((parent) => parent.seed ?? parent.id));

    setBlockmons((prev) => [
      ...prev.filter((mon) => !parentIdSet.has(mon.id)),
      newborn,
    ]);
    setAdventureSelection((prev) => prev.filter((id) => !parentIdSet.has(id)));
    setPvpSelection((prev) => prev.filter((id) => !parentIdSet.has(id)));
    setDnaVault((prev) => [
      ...prev.filter((entry) => !parentSeedSet.has(entry.seed)),
      {
        dna: newborn.dna,
        species: newborn.species,
        seed: newborn.seed,
        status: '보관',
        acquiredAt: new Date().toISOString(),
        note: '합성 결과',
      },
    ]);
    appendSeed(formatSeed(fusionSeed), 'Fusion Result');

    const record = {
      id: `fusion-${newborn.seed}`,
      result: newborn,
      parents: parents.map((parent) => ({ ...parent })),
      createdAt: new Date().toISOString(),
      tokensSpent: tokenCost,
      success: true,
      successChance,
    };
    setFusionHistory((prev) => [...prev, record]);
    setSystemMessage({ key: 'system.fusionCreated' });
    setFusionFeedback({
      type: 'success',
      chance: chancePercent,
      blockmon: { name: newborn.name, species: newborn.species },
    });
    // 온체인: 성공 시 부모 소각 + 신생 민트
    const owner = signing.address ?? currentAccount?.address ?? null;
    if (owner) {
      (async () => {
        try {
          const pkg = resolvePackageId();
          // 부모 소각을 하나의 트랜잭션으로 직렬화 실행 (gas version 충돌 방지)
          const burnIds = parents.filter((p) => p.id && /^0x[0-9a-fA-F]+$/.test(p.id)).map((p) => p.id);
          try {
            await queueAndRetry('fusion.burnMany', async () => {
              if (burnIds.length) {
                await onchainBurnMany({ executor, packageId: pkg, blockmonIds: burnIds, client, signAndExecute });
              }
            }, { attempts: 4, baseDelayMs: 700 });
          } catch (burnErr) {
            // enqueue for later flush
            enqueuePendingBurns(burnIds);
            throw burnErr;
          }
          const species = speciesCatalog.find((s) => s.name === newborn.species);
          const monId = species?.id ?? newborn.species;
          const res = await queueAndRetry('fusion.mint', async () => onchainCreateBlockMon({
            executor,
            packageId: pkg,
            sender: owner,
            monId,
            name: newborn.name,
            hp: Number(newborn.maxHp ?? newborn.hp ?? 0),
            str: Number(newborn.stats?.str ?? 0),
            dex: Number(newborn.stats?.dex ?? 0),
            con: Number(newborn.stats?.con ?? 0),
            int: Number(newborn.stats?.int ?? 0),
            wis: Number(newborn.stats?.wis ?? 0),
            cha: Number(newborn.stats?.cha ?? 0),
            skillName: String(newborn.skill?.name ?? ''),
            skillDescription: String(newborn.skill?.description ?? ''),
            client,
            signAndExecute,
          }), { attempts: 5, baseDelayMs: 700 });
          const fullType = `${pkg}::blockmon::BlockMon`;
          const objectId = extractCreatedByType(res, fullType);
          if (objectId) {
            try {
              const fetched = await getBlockMon(client, objectId);
              const mapped = mapOnchainToLocal({ data: fetched?.data ?? fetched });
              if (mapped) {
                setBlockmons((prev) => {
                  return [...prev.filter((m) => m.id !== objectId), mapped];
                });
              }
            } catch (e) {
              setBlockmons((prev) => [...prev, { ...newborn, id: objectId, onchain: true }]);
            }
          }
        } catch (e) {
          console.error('[Onchain] fusion success ops failed', e);
        }
      })();
    }
    return { success: true, newborn: record };
  };

  const purchaseTokens = (amount) => {
    setTokens((prev) => prev + amount);
    setSystemMessage({ key: 'token.purchaseConfirm', params: { amount } });
    // 온체인 반영 (비동기): BM 토큰 add 또는 create
    const owner = signing.address ?? currentAccount?.address ?? null;
    if (owner) {
      (async () => {
        try {
          const pkg = resolvePackageId();
          // 기존 BMToken 객체 탐색
          let bmTokenId = null;
          try {
            const res = await listOwnedBMTokens(client, owner, pkg, null, 50);
            const first = (res?.data ?? [])[0];
            bmTokenId = first?.data?.objectId ?? first?.objectId ?? null;
          } catch (e) {
            console.warn('[Onchain] listOwnedBMTokens failed, will try create', e);
          }
          if (bmTokenId) {
            await onchainAddBMTokens({ executor, packageId: pkg, bmTokenId, amount, client, signAndExecute });
          } else {
            await onchainCreateBMToken({ executor, packageId: pkg, sender: owner, amount, tokenType: 'BM', client, signAndExecute });
          }
          // 체인 기준으로 동기화
          try {
            const total = await getTotalBMTokenBalance(client, owner, pkg);
            if (Number.isFinite(total)) setTokens(total);
          } catch (e) {
            console.warn('[Onchain] refresh BM total failed', e);
          }
        } catch (e) {
          console.error('[Onchain] purchaseTokens failed', e);
        }
      })();
    }
  };

  const runPvpMatch = () => {
    if (!blockmons.length) return { error: t("errors.noBlockmonPvp") };
    if (tokens < 3) return { error: t("errors.noTokensPvp") };

    const selectedIds = (
      pvpSelection.length
        ? pvpSelection
        : blockmons.slice(0, 4).map((mon) => mon.id)
    ).slice(0, 4);
    const team = selectedIds
      .map((id) => blockmons.find((mon) => mon.id === id))
      .filter(Boolean);

    if (team.length === 0) {
      return { error: t("pvp.error.selectTeam") };
    }

    const combinedStats = team.reduce((acc, mon) => {
      Object.keys(mon.stats).forEach((key) => {
        acc[key] = (acc[key] ?? 0) + mon.stats[key];
      });
      return acc;
    }, {});

    const averagedStats = Object.fromEntries(
      Object.entries(combinedStats).map(([key, value]) => [
        key,
        Math.max(1, Math.round(value / team.length)),
      ])
    );

    const teamMaxHp = team.reduce((sum, mon) => sum + (mon.maxHp ?? mon.hp), 0);
    const contender = {
      id: `pvp-team-${Date.now()}`,
      name: language === "en" ? "My Squad" : "내 팀",
      species: language === "en" ? "Squad" : "팀",
      stats: averagedStats,
      hp: teamMaxHp,
      maxHp: teamMaxHp,
    };

    const opponentSeed = generateSeed();
    const opponent = createBlockmonFromSeed(opponentSeed, {
      origin: "PVP 상대",
    });
    const result = rollBattleOutcome(contender, opponent, opponentSeed, {
      language,
      t: (key, params) => translate(language, key, params),
    });
    const logs = assembleBattleLog(
      result.rounds,
      result.outcome,
      0,
      language,
      contender.species,
      opponent.species,
      contender.name ?? contender.species
    );

    const stake = 3;
    const reward = result.outcome === "win" ? 5 : 0;
    const fee = result.outcome === "win" ? 1 : 0;
    const netTokens = reward - fee - stake;

    setTokens((prev) => prev + netTokens);
    // 온체인 BM 토큰 반영 (비동기): PVP 스테이크/보상/수수료 정산
    const ownerForPvp = signing.address ?? currentAccount?.address ?? null;
    if (ownerForPvp) {
      (async () => {
        try {
          const pkg = resolvePackageId();
          let bmTokenId = null;
          const resBM = await listOwnedBMTokens(client, ownerForPvp, pkg, null, 50);
          const firstBM = (resBM?.data ?? [])[0];
          bmTokenId = firstBM?.data?.objectId ?? firstBM?.objectId ?? null;
          if (bmTokenId) {
            if (reward > 0) {
              await onchainAddBMTokens({ executor, packageId: pkg, bmTokenId, amount: reward, client, signAndExecute });
            }
            const totalCost = fee + stake;
            if (totalCost > 0) {
              await onchainSubtractBMTokens({ executor, packageId: pkg, bmTokenId, amount: totalCost, client, signAndExecute });
            }
          }
          const bmTotal = await getTotalBMTokenBalance(client, ownerForPvp, pkg);
          if (Number.isFinite(bmTotal)) setTokens(bmTotal);
        } catch (e) {
          console.error('[Onchain] reflect BM after PVP failed', e);
        }
      })();
    }
    appendSeed(formatSeed(opponentSeed), "PVP Match");

    const record = {
      id: `pvp-${formatSeed(opponentSeed)}`,
      player: {
        ...contender,
        members: team.map((mon) => ({
          id: mon.id,
          name: mon.name,
          species: mon.species,
        })),
      },
      opponent,
      outcome: result.outcome,
      logs,
      tokensStaked: stake,
      tokensReward: reward,
      fee,
      netTokens,
      completedAt: new Date().toISOString(),
    };

    setPvpHistory((prev) => [...prev, record]);
    setSystemMessage({
      key: result.outcome === 'win' ? 'system.pveWin' : 'system.pveLose',
    });
    setCurrentPage("pvp");
    return { success: true, record };
  };

  const gameState = useMemo(
    () => ({
      player,
      tokens,
      blockmons,
      dnaVault,
      seedHistory,
      adventure,
      battle,
      battleHistory,
      fusionHistory,
      pvpHistory,
      systemMessage,
      adventureSelection,
      pvpSelection,
      potions,
      language,
      t,
      signing,
    }),
    [
      player,
      tokens,
      blockmons,
      dnaVault,
      seedHistory,
      adventure,
      battle,
      battleHistory,
      fusionHistory,
      pvpHistory,
      systemMessage,
      adventureSelection,
      pvpSelection,
      potions,
      language,
      t,
      signing,
    ]
  );

  const inventoryService = useMemo(() => createInventoryService({
    client,
    resolvePackageId,
    listOwnedBMTokens,
    listOwnedPotions,
    getTotalPotionCountByType,
    getTotalBMTokenBalance,
    onchainAddBMTokens,
    onchainCreateBMToken,
    onchainSubtractBMTokens,
    setPotions,
    setTokens,
    setSystemMessage,
    setPurchasingPotion,
    signing,
    currentAccount,
    executor,
  }), [client, resolvePackageId, signing, currentAccount?.address, executor]);

  const actions = {
    navigate,
    startAdventure,
    performFusion,
    runPvpMatch,
    registerUser,
    executor,
    setAdventureSelection,
    setPvpSelection,
    setLanguage,
    purchaseTokens: (amount) => inventoryService.purchaseTokens(amount),
    purchasePotions: async (amount, cost) => {
      if (purchasingPotion) return { error: 'busy' };
      if (tokens < cost) {
        setSystemMessage({ key: 'inventory.potionError' });
        return { error: "insufficient tokens" };
      }
      return inventoryService.purchasePotions(amount, cost);
    },
    toggleChainLog: () => uiService.toggleChainLog(),
    clearChainLog: () => uiService.clearChainLog(),
  };

  const navItems = Object.entries(pages).filter(([, page]) => page.showInNav !== false);

  if (!player) {
    return (
      <AppView
        t={t}
        player={player}
        navItems={navItems}
        currentPage={currentPage}
        onNavigate={navigate}
        language={language}
        onSetLanguage={setLanguage}
        systemMessage={systemMessage}
        pages={pages}
        gameState={gameState}
        actions={{ ...actions, registerUser }}
        fusionFeedbackSlot={null}
        showChainLogSlot={
          <main className="app__content">
            <Signup onRegister={registerUser} language={language} t={t} signing={signing} />
          </main>
        }
      />
    );
  }

  return (
    <AppView
      t={t}
      player={player}
      navItems={navItems}
      currentPage={currentPage}
      onNavigate={navigate}
      language={language}
      onSetLanguage={setLanguage}
      systemMessage={systemMessage}
      pages={pages}
      gameState={gameState}
      actions={actions}
      fusionFeedbackSlot={
        <FusionFeedback
          feedback={fusionFeedback}
          onClose={() => setFusionFeedback(null)}
          t={t}
          language={language}
        />
      }
      showChainLogSlot={
        <>
          <div style={{ position: 'fixed', right: 12, bottom: showChainLog ? 260 : 12, zIndex: 999 }}>
            <button onClick={() => setShowChainLog((v) => !v)}>
              {showChainLog ? 'Hide Chain Logs' : 'Show Chain Logs'}
            </button>
          </div>
          {showChainLog && (
            <ChainLog
              entries={chainLog}
              mintQueue={loadPendingMints()}
              burnQueue={loadPendingBurns()}
              onClear={() => { try { localStorage.setItem(CHAIN_LOG_KEY, JSON.stringify([])); } catch (_) {}; setChainLog([]) }}
              onClose={() => setShowChainLog(false)}
              onFlushMints={() => {
                (async () => {
                  const owner = signing.address ?? currentAccount?.address ?? null;
                  if (!owner) return;
                  const pkg = resolvePackageId();
                  const q = loadPendingMints();
                  const BATCH_SIZE = 5;
                  for (let i = 0; i < q.length; i += BATCH_SIZE) {
                    const batch = q.slice(i, i + BATCH_SIZE);
                    try {
                      await queueAndRetry('ui.flush.mints.batch', async () => onchainCreateManyBlockMon({ executor, packageId: pkg, sender: owner, entries: batch, client, signAndExecute }), { attempts: 4, baseDelayMs: 600 });
                      removeEntriesFromQueue([...batch]);
                    } catch (_) {
                      for (const entry of batch) {
                        try {
                          await queueAndRetry('ui.flush.mints.single', async () => onchainCreateBlockMon({ executor, packageId: pkg, sender: owner, ...entry, client, signAndExecute }), { attempts: 6, baseDelayMs: 600 });
                          removeEntriesFromQueue([entry]);
                        } catch (_) {}
                      }
                    }
                  }
                  setShowChainLog(true);
                })();
              }}
              onFlushBurns={() => {
                (async () => {
                  const owner = signing.address ?? currentAccount?.address ?? null;
                  if (!owner) return;
                  const pkg = resolvePackageId();
                  const all = loadPendingBurns();
                  const BATCH_SIZE = 10;
                  for (let i = 0; i < all.length; i += BATCH_SIZE) {
                    const batch = all.slice(i, i + BATCH_SIZE);
                    try {
                      await queueAndRetry('ui.flush.burns.batch', async () => onchainBurnMany({ executor, packageId: pkg, blockmonIds: batch, client, signAndExecute }), { attempts: 5, baseDelayMs: 700 });
                      removeBurnIdsFromQueue(batch);
                    } catch (_) {
                      for (const id of batch) {
                        try { await queueAndRetry('ui.flush.burns.single', async () => onchainBurn({ executor, packageId: pkg, blockmonId: id, client, signAndExecute }), { attempts: 6, baseDelayMs: 600 }); removeBurnIdsFromQueue([id]); } catch (_) {}
                      }
                    }
                  }
                  setShowChainLog(true);
                })();
              }}
              onClearMints={() => { clearPendingMints(); setShowChainLog(true); }}
              onClearBurns={() => { clearPendingBurns(); setShowChainLog(true); }}
            />
          )}
        </>
      }
    />
  );
}

// RegisterEnokiWallets moved to components/RegisterEnokiWallets

export default App;
