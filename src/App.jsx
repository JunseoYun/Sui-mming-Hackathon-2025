import React, { useMemo, useState, useEffect } from "react";
import Adventure from "./pages/Adventure";
import Battle from "./pages/Battle";
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
} from "./utils/random";
import {
  translate,
  translateSpecies,
  translateTemperament,
  translateOrigin,
  translateAction,
  translateDetail,
  translateStatus,
  translateNote,
} from "./i18n";
import "./App.css";
import "./index.css";
import {
  createNetworkConfig,
  SuiClientProvider,
  useSuiClientContext,
  WalletProvider,
} from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isEnokiNetwork, registerEnokiWallets } from "@mysten/enoki";
import { getFullnodeUrl } from "@mysten/sui/client";

const pages = {
  home: { labelKey: "nav.home", component: Home, showInNav: true },
  adventure: {
    labelKey: "nav.adventure",
    component: Adventure,
    showInNav: true,
  },
  battle: { labelKey: "nav.battle", component: Battle, showInNav: false },
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
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
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
  playerDisplayName,
  opponentDisplayName
) {
  const playerDisplay =
    translateSpecies(playerDisplayName, language) || playerDisplayName;
  const opponentDisplay =
    translateSpecies(opponentDisplayName, language) || opponentDisplayName;

  const entries = rounds.map((round, index) => {
    const isPlayer = round.actor === playerActor;
    const action = translateAction(round.action, language);
    const detail = translateDetail(round.detail, language);
    const message = translate(
      language,
      isPlayer ? "battleLog.entry.player" : "battleLog.entry.opponent",
      {
        name: isPlayer ? playerDisplay : opponentDisplay,
        action,
        detail,
        target: isPlayer ? opponentDisplay : playerDisplay,
        hp: round.opponentHp,
      }
    );
    return {
      time: formatLogTime(language, startOffset + index),
      actorType: isPlayer ? "player" : "opponent",
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
  const [systemMessage, setSystemMessage] = useState("");
  const [adventureSelection, setAdventureSelection] = useState([]);
  const [pvpSelection, setPvpSelection] = useState([]);
  const [potions, setPotions] = useState(2);
  const [language, setLanguage] = useState("ko");

  const t = useMemo(() => {
    const translateFn = (key, params) => translate(language, key, params);
    translateFn.language = language;
    return translateFn;
  }, [language]);

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
    const starterSeed = generateSeed();
    const starter = createBlockmonFromSeed(starterSeed, {
      origin: "스타터 DNA",
    });
    setPlayer({
      nickname,
      joinedAt: new Date().toISOString(),
      starterSeed: formatSeed(starterSeed),
    });
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
    setSystemMessage(t("system.starterCreated"));
    setCurrentPage("home");
  };

  const navigate = (pageKey) => {
    if (pages[pageKey]) {
      setCurrentPage(pageKey);
      setSystemMessage("");
    }
  };

  const startAdventure = (selectedIdsParam) => {
    if (!blockmons.length) return { error: t("errors.noBlockmon") };
    if (tokens < 1) return { error: t("errors.noTokensAdventure") };

    const selectedIds = (selectedIdsParam ?? adventureSelection).slice(0, 4);
    if (!selectedIds.length) {
      return { error: t("errors.selectTeam") };
    }

    const team = selectedIds
      .map((id) => blockmons.find((mon) => mon.id === id))
      .filter(Boolean)
      .slice(0, 4);

    if (!team.length) {
      return { error: t("errors.missingSelected") };
    }

    if (selectedIds.length !== team.length) {
      setAdventureSelection(team.map((mon) => mon.id));
    }
    let potionsToCarry = 0;
    if (potions > 0) {
      const input = window.prompt(
        `${t("inventory.potions")}\n${t("inventory.potionStock", {
          value: potions,
        })}`,
        Math.min(potions, 2).toString()
      );
      const desired = parseInt(input ?? "0", 10);
      if (!Number.isNaN(desired) && desired > 0) {
        potionsToCarry = Math.min(desired, potions);
      }
    }

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
    }));

    let logs = [
      {
        time: formatLogTime(language),
        message: t("adventure.log.start", { count: team.length }),
      },
    ];
    const battleRecords = [];
    const capturedMonsters = [];
    let defeats = 0;
    let tokensEarned = 0;
    let offset = 1;
    let potionsRemaining = potionsToCarry;
    let potionsUsed = 0;

    appendSeed(seedHex, "Adventure Start");

    if (potionsToCarry > 0) {
      setPotions((prev) => prev - potionsToCarry);
    }

    while (teamRecords.some((member) => !member.knockedOut)) {
      const activeMember = teamRecords.find((member) => !member.knockedOut);
      if (!activeMember) break;

      const baseMon =
        blockmons.find((mon) => mon.id === activeMember.id) ??
        team.find((mon) => mon.id === activeMember.id);
      if (!baseMon) {
        activeMember.knockedOut = true;
        continue;
      }
      const playerMon = { ...baseMon, hp: activeMember.remainingHp };
      const battleSeed = generateSeed();
      const battleSeedHex = formatSeed(battleSeed);
      const wild = createBlockmonFromSeed(battleSeed, { origin: "야생 조우" });
      const result = rollBattleOutcome(playerMon, wild, battleSeed, t);

      const encounterEntry = {
        time: formatLogTime(language, offset++),
        message: t("adventure.log.encounter", {
          species: translateSpecies(wild.species, language),
        }),
      };

      const battleLogEntries = assembleBattleLog(
        result.rounds,
        result.outcome,
        offset,
        language,
        playerMon.species,
        wild.species,
        playerMon.name ?? playerMon.species,
        wild.name ?? wild.species
      );
      const logCount = battleLogEntries.length;
      offset += logCount + 1;

      let battleEntryLog = [encounterEntry, ...battleLogEntries];
      logs = [...logs, ...battleEntryLog];

      const reward = 0;
      defeats += result.outcome === "win" ? 0 : 1;
      activeMember.remainingHp = result.remainingHp;
      activeMember.knockedOut = result.outcome !== "win";
      const memberMaxHp = activeMember.maxHp ?? playerMon.maxHp ?? playerMon.hp;

      if (
        result.outcome === "win" &&
        !activeMember.knockedOut &&
        potionsRemaining > 0 &&
        activeMember.remainingHp < memberMaxHp * 0.5
      ) {
        potionsRemaining -= 1;
        potionsUsed += 1;
        activeMember.remainingHp = memberMaxHp;
        const potionEntry = {
          time: formatLogTime(language, offset++),
          message: t("adventure.log.potion", {
            name:
              language === "en"
                ? translateSpecies(activeMember.species, language)
                : activeMember.name,
          }),
          actorType: "player",
        };
        logs.push(potionEntry);
        battleEntryLog = [...battleEntryLog, potionEntry];
      }

      if (result.outcome === "win") {
        const captured = {
          ...wild,
          id: wild.id,
          stats: { ...wild.stats },
          origin: "포획된 야생 블록몬",
        };
        capturedMonsters.push(captured);
        const captureMessage = {
          time: formatLogTime(language, offset++),
          message: t("adventure.log.capture", {
            species: translateSpecies(wild.species, language),
          }),
        };
        logs.push(captureMessage);
        battleEntryLog = [...battleEntryLog, captureMessage];
      }

      appendSeed(battleSeedHex, `Wild Battle #${battleRecords.length + 1}`);

      const completedAt = new Date().toISOString();
      const playerSnapshot = {
        ...playerMon,
        hp: result.remainingHp,
        maxHp: playerMon.maxHp ?? playerMon.hp,
      };
      const opponentSnapshot = {
        ...wild,
        hp: result.opponentRemainingHp,
        maxHp: wild.maxHp ?? wild.hp,
      };

      battleRecords.push({
        id: `battle-${battleSeedHex}`,
        seed: battleSeedHex,
        player: playerSnapshot,
        opponent: opponentSnapshot,
        outcome: result.outcome,
        logEntries: battleEntryLog,
        tokensSpent: 0,
        tokensReward: reward,
        completedAt,
      });
    }

    logs.push({
      time: formatLogTime(language, offset),
      message: t("adventure.log.complete"),
    });

    const adventureState = {
      id: `adv-${seedHex}`,
      seed: seedHex,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      team: teamRecords,
      potions,
      logs,
      status: "complete",
      tokensSpent: 1,
      tokensEarned,
      defeats,
      battles: battleRecords.length,
      capturedCount: capturedMonsters.length,
      potionsCarried: potionsToCarry,
      potionsRemaining,
      potionsUsed,
    };

    if (potionsRemaining > 0) {
      setPotions((prev) => prev + potionsRemaining);
    }

    if (capturedMonsters.length) {
      setBlockmons((prev) => [...prev, ...capturedMonsters]);
      setDnaVault((prev) => [
        ...prev,
        ...capturedMonsters.map((mon) => ({
          dna: mon.dna,
          species: mon.species,
          seed: mon.seed,
          status: "활성",
          acquiredAt: new Date().toISOString(),
          note: "모험 포획",
        })),
      ]);
    }

    setTokens((prev) => prev - 1 + tokensEarned);
    setAdventure(adventureState);
    setBattle(battleRecords[battleRecords.length - 1] ?? null);
    setBattleHistory((prev) => [...prev, ...battleRecords]);
    setSystemMessage(
      t("system.adventureSummary", {
        battles: battleRecords.length,
        captured: capturedMonsters.length,
        tokens: tokensEarned,
      })
    );
    setCurrentPage("adventure");
    return { success: true };
  };

  const performFusion = (firstId, secondId) => {
    if (firstId === secondId) {
      return { error: t("errors.sameBlockmon") };
    }
    const first = blockmons.find((mon) => mon.id === firstId);
    const second = blockmons.find((mon) => mon.id === secondId);
    if (!first || !second) {
      return { error: t("errors.missingSelected") };
    }
    if (first.species !== second.species) {
      return { error: t("errors.sameSpeciesFusion") };
    }
    if (tokens < 1) {
      return { error: t("errors.noTokensFusion") };
    }

    const fusionSeed = generateSeed();
    const newborn = fuseBlockmons([first, second], fusionSeed);

    setTokens((prev) => prev - 1);
    setBlockmons((prev) => [
      ...prev.filter((mon) => mon.id !== firstId && mon.id !== secondId),
      newborn,
    ]);
    setAdventureSelection((prev) =>
      prev.filter((id) => id !== firstId && id !== secondId)
    );
    setPvpSelection((prev) =>
      prev.filter((id) => id !== firstId && id !== secondId)
    );
    setDnaVault((prev) => [
      ...prev.filter(
        (entry) =>
          entry.seed !== (first.seed ?? first.id) &&
          entry.seed !== (second.seed ?? second.id)
      ),
      {
        dna: newborn.dna,
        species: newborn.species,
        seed: newborn.seed,
        status: "보관",
        acquiredAt: new Date().toISOString(),
        note: "합성 결과",
      },
    ]);
    appendSeed(formatSeed(fusionSeed), "Fusion Result");

    const record = {
      id: `fusion-${newborn.seed}`,
      result: newborn,
      parents: [first, second],
      createdAt: new Date().toISOString(),
    };
    setFusionHistory((prev) => [...prev, record]);
    setSystemMessage(t("system.fusionCreated"));
    return { success: true, newborn: record };
  };

  const purchaseTokens = (amount) => {
    setTokens((prev) => prev + amount);
    setSystemMessage(t("token.purchaseConfirm", { amount }));
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

    if (team.length < 4) {
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
    const result = rollBattleOutcome(contender, opponent, opponentSeed, t);
    const logs = assembleBattleLog(
      result.rounds,
      result.outcome,
      0,
      language,
      contender.species,
      opponent.species,
      contender.name ?? contender.species,
      opponent.name ?? opponent.species
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
    setSystemMessage(
      result.outcome === "win" ? t("system.pveWin") : t("system.pveLose")
    );
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
    ]
  );

  const actions = {
    navigate,
    startAdventure,
    performFusion,
    runPvpMatch,
    registerUser,
    setAdventureSelection,
    setPvpSelection,
    setLanguage,
    purchaseTokens,
    purchasePotions: (amount, cost) => {
      if (tokens < cost) {
        setSystemMessage(t("inventory.potionError"));
        return { error: "insufficient tokens" };
      }
      setTokens((prev) => prev - cost);
      setPotions((prev) => prev + amount);
      setSystemMessage(t("inventory.potionConfirm", { amount }));
      return { success: true };
    },
  };

  const navItems = Object.entries(pages).filter(
    ([, page]) => page.showInNav !== false
  );

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
          <Signup onRegister={registerUser} language={language} t={t} />
        </main>
      </div>
    );
  }

  const CurrentComponent = pages[currentPage]?.component ?? Home;

  return (
    <div className="app">
      {header}

      {systemMessage && <div className="app__notice">{systemMessage}</div>}

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
