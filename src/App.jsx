import React, { useMemo, useState, useEffect } from "react";
import Adventure from "./pages/Adventure";
import Fusion from "./pages/Fusion";
import Home from "./pages/Home";
import Inventory from "./pages/Inventory";
import Pvp from "./pages/Pvp";
import Signup from "./pages/Signup";
import {
  createBlockmonFromSeed,
  fuseBlockmons,
  generateSeed,
  rollBattleOutcome,
  formatSeed,
  evaluateFusionRecipe,
} from "./utils/random";
import {
  translate,
  translateSpecies,
  translateAction,
  translateDetail,
} from "./i18n";
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
import { getFullnodeUrl } from "@mysten/sui.js/client";
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
  extractCreatedByType,
  getBlockMon,
  burn as onchainBurn,
  resolvePackageId,
} from "./utils/blockmon";
import { catalog as speciesCatalog } from "./utils/random";

const pages = {
  home: { labelKey: "nav.home", component: Home, showInNav: true },
  adventure: {
    labelKey: "nav.adventure",
    component: Adventure,
    showInNav: true,
  },
  fusion: { labelKey: "nav.fusion", component: Fusion, showInNav: true },
  pvp: { labelKey: "nav.pvp", component: Pvp, showInNav: true },
  inventory: {
    labelKey: "nav.inventory",
    component: Inventory,
    showInNav: true,
  },
};

function formatLogTime(language, offsetMinutes = 0) {
  const base = new Date(Date.now() + offsetMinutes * 60_000);
  const locale = language === "en" ? "en-US" : "ko-KR";
  return base.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function assembleBattleLog(
  rounds,
  outcome,
  startOffset = 0,
  language,
  playerActor,
  opponentActor,
  playerDisplayName
) {
  const getSpeciesLabel = (species) =>
    translateSpecies(species, language) || species;

  const localizeName = (name, fallbackSpecies) => {
    if (!name) return getSpeciesLabel(fallbackSpecies);
    if (name === fallbackSpecies) return getSpeciesLabel(fallbackSpecies);

    const [candidateSpecies, suffix] = name.split('-', 2);
    const translatedSpecies =
      translateSpecies(candidateSpecies, language) || getSpeciesLabel(fallbackSpecies);

    if (suffix !== undefined) {
      return suffix.length > 0 ? `${translatedSpecies}-${suffix}` : translatedSpecies;
    }

    const directTranslation = translateSpecies(name, language);
    if (directTranslation && directTranslation !== name) {
      return directTranslation;
    }

    return name;
  };

  const playerDisplay = localizeName(playerDisplayName, playerActor);
  const playerSpeciesDisplay = getSpeciesLabel(playerActor);
  const opponentSpeciesDisplay = getSpeciesLabel(opponentActor);

  const entries = rounds.map((round, index) => {
    if (round.actor === 'potion') {
      return {
        time: formatLogTime(language, startOffset + index),
        actorType: 'potion',
        message: translate(language, 'battleLog.entry.potion', {
          name: playerDisplay,
          hp: Math.round(round.playerHp ?? round.hpAfterPotion ?? 0),
        }),
      };
    }

    const actorType = round.actor === 'player' ? 'player' : 'opponent';
    const actorSpecies = round.actorSpecies ?? (actorType === 'player' ? playerActor : opponentActor);
    const actorDisplay = translateSpecies(actorSpecies, language) || actorSpecies;
    const targetDisplay =
      actorType === 'player' ? opponentSpeciesDisplay : playerSpeciesDisplay;
    const hpValue = actorType === 'player'
      ? Math.round(round.opponentHp ?? 0)
      : Math.round(round.playerHp ?? 0);

    const action = translateAction(round.action, language);
    const detail = translateDetail(round.detail, language);
    const message = translate(
      language,
      actorType === 'player' ? 'battleLog.entry.player' : 'battleLog.entry.opponent',
      {
        name: actorDisplay,
        action,
        detail,
        target: targetDisplay,
        hp: hpValue,
      }
    );
    return {
      time: formatLogTime(language, startOffset + index),
      actorType,
      message,
    };
  });

  const summaryKey =
    outcome === "win" ? "battleLog.summary.win" : "battleLog.summary.defeat";
  entries.push({
    time: formatLogTime(language, startOffset + rounds.length + 1),
    message: translate(language, summaryKey),
  });
  return entries;
}

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
  const [currentPage, setCurrentPage] = useState("home");
  const [systemMessage, setSystemMessage] = useState(null);
  const [adventureSelection, setAdventureSelection] = useState([]);
  const [pvpSelection, setPvpSelection] = useState([]);
  const [potions, setPotions] = useState(2);
  const [language, setLanguage] = useState("ko");
  const [fusionFeedback, setFusionFeedback] = useState(null);
  const [signing, setSigning] = useState({ strategy: "wallet", address: null });
  const [starterAttempted, setStarterAttempted] = useState(false);

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

  // 체인 BlockMon -> 로컬 모델 매핑
  const mapOnchainToLocal = (entry) => {
    try {
      const objectId = entry?.data?.objectId ?? entry?.objectId ?? null;
      const content = entry?.data?.content ?? entry?.content ?? null;
      const fields = content?.fields ?? null;
      if (!objectId || !fields) return null;
      const base = fields.base?.fields ?? {};
      const skill = fields.skill?.fields ?? {};
      const monId = fields.monId ?? fields.mon_id ?? fields.monID ?? fields.monid ?? "";
      const speciesEntry = speciesCatalog.find((s) => s.id === monId);
      const speciesName = speciesEntry?.name ?? monId ?? "";
      const stats = {
        str: Number(base.str ?? 0),
        dex: Number(base.dex ?? 0),
        con: Number(base.con ?? 0),
        int: Number(base.int ?? 0),
        wis: Number(base.wis ?? 0),
        cha: Number(base.cha ?? 0),
      };
      const hp = Number(base.hp ?? 0);
      const power = hp + Object.values(stats).reduce((a, b) => a + Number(b || 0), 0);
      return {
        id: objectId,
        onchain: true,
        speciesId: monId,
        species: speciesName,
        name: fields.name ?? speciesName,
        dna: objectId,
        hp,
        maxHp: hp,
        stats,
        skill: {
          name: String(skill.name ?? ""),
          description: String(skill.description ?? ""),
        },
        rank: undefined,
        origin: "온체인",
        power,
      };
    } catch (e) {
      console.warn("[Onchain->Local] map failed", e, entry);
      return null;
    }
  };

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
            setTokens(10);
            setBlockmons(all);
            setAdventureSelection(all.slice(0, 4).map((m) => m.id));
            setPvpSelection(all.slice(0, 4).map((m) => m.id));
            setPotions(2);
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
          setTokens(10);
          setBlockmons([starter]);
          setAdventureSelection([starter.id]);
          setPvpSelection([starter.id]);
          setPotions(2);
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
          setTokens(10);
          setBlockmons([starter]);
          setAdventureSelection([starter.id]);
          setPvpSelection([starter.id]);
          setPotions(2);
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
    setTokens(10);
    setBlockmons([starter]);
    setAdventureSelection([starter.id]);
    setPvpSelection([starter.id]);
    setPotions(2);
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

  const navigate = (pageKey) => {
    if (pages[pageKey]) {
      setCurrentPage(pageKey);
      setSystemMessage(null);
    }
  };

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
    
    // 온체인에 포획된 블록몬 민트 (비동기 실행)
    const owner = signing.address ?? currentAccount?.address ?? null;
    if (owner && capturedMonsters.length > 0) {
      (async () => {
        try {
          const pkg = resolvePackageId();
          for (const captured of capturedMonsters) {
            const species = speciesCatalog.find((s) => s.name === captured.species);
            const monId = species?.id ?? captured.species;
            const res = await onchainCreateBlockMon({
              executor,
              packageId: pkg,
              sender: owner,
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
                  setBlockmons((prev) => {
                    const withoutLocal = prev.filter((m) => m !== captured);
                    return [...withoutLocal, mapped];
                  });
                }
              } catch (e) {
                setBlockmons((prev) => [...prev, { ...captured, id: objectId, onchain: true }]);
              }
            }
          }
        } catch (e) {
          console.error('[Onchain] mint captured failed', e);
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

      // 온체인: 실패 시 소모된 부모 소각 (지배적인 1마리 제외)
      const owner = signing.address ?? currentAccount?.address ?? null;
      if (owner) {
        (async () => {
          try {
            const pkg = resolvePackageId();
            for (const p of parents) {
              if (p.id && p.id !== dominant.id && /^0x[0-9a-fA-F]+$/.test(p.id)) {
                await onchainBurn({ executor, packageId: pkg, blockmonId: p.id, client, signAndExecute });
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
          for (const p of parents) {
            if (p.id && /^0x[0-9a-fA-F]+$/.test(p.id)) {
              await onchainBurn({ executor, packageId: pkg, blockmonId: p.id, client, signAndExecute });
            }
          }
          const species = speciesCatalog.find((s) => s.name === newborn.species);
          const monId = species?.id ?? newborn.species;
          const res = await onchainCreateBlockMon({
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
          });
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
    purchaseTokens,
    purchasePotions: (amount, cost) => {
      if (tokens < cost) {
        setSystemMessage({ key: 'inventory.potionError' });
        return { error: "insufficient tokens" };
      }
      setTokens((prev) => prev - cost);
      setPotions((prev) => prev + amount);
      setSystemMessage({ key: 'inventory.potionConfirm', params: { amount } });
      return { success: true };
    },
  };

  const navItems = Object.entries(pages).filter(
    ([, page]) => page.showInNav !== false
  );

  const resolvedSystemMessage = systemMessage
    ? t(systemMessage.key, systemMessage.params)
    : '';

  const header = (
    <header className="app__top">
      <span className="app__brand">{t("app.brand")}</span>
      {player && (
        <nav className="app__nav">
          {navItems.map(([key, { labelKey }]) => (
            <button
              key={key}
              className={currentPage === key ? "is-active" : ""}
              onClick={() => navigate(key)}
            >
              {t(labelKey)}
            </button>
          ))}
        </nav>
      )}
      <div className="app__language">
        <button
          className={language === "ko" ? "is-active" : ""}
          onClick={() => setLanguage("ko")}
        >
          {t("home.language.korean")}
        </button>
        <button
          className={language === "en" ? "is-active" : ""}
          onClick={() => setLanguage("en")}
        >
          {t("home.language.english")}
        </button>
      </div>
    </header>
  );

  if (!player) {
    return (
      <div className="app signup-app">
        {header}
        <main className="app__content">
          <Signup onRegister={registerUser} language={language} t={t} signing={signing} />
        </main>
      </div>
    );
  }

  const CurrentComponent = pages[currentPage]?.component ?? Home;

  return (
    <div className="app">
      {header}

      {resolvedSystemMessage && <div className="app__notice">{resolvedSystemMessage}</div>}

      <FusionFeedback
        feedback={fusionFeedback}
        onClose={() => setFusionFeedback(null)}
        t={t}
        language={language}
      />

      <main className="app__content">
        <CurrentComponent gameState={gameState} actions={actions} />
      </main>
    </div>
  );
}

function RegisterEnokiWallets() {
  const { client, network } = useSuiClientContext();

  useEffect(() => {
    if (!isEnokiNetwork(network)) {
      console.log("[Enoki] 지원되지 않는 네트워크, 등록 건너뜀", network);
      return;
    }

    const redirectUrl = `${window.location.origin}${window.location.pathname}`;

    console.log("[Enoki] 지갑 등록 시작", { network, redirectUrl });

    const registration = registerEnokiWallets({
      apiKey: import.meta.env.VITE_ENOKI_API_KEY,
      providers: {
        google: {
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          redirectUrl,
        },
      },
      client,
      network,
    });

    console.log("[Enoki] 지갑 등록 성공", {
      network,
      wallets: Object.keys(registration.wallets ?? {}),
    });

    return registration.unregister;
  }, [client, network]);

  return null;
}

export default App;
