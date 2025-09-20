import { translate } from "../i18n";
import { assembleBattleLog } from "../utils/battleLog";

export function createPvpService({
  getTokens,
  setTokens,
  getPvpSelection,
  getBlockmons,
  setPvpHistory,
  setSystemMessage,
  setCurrentPage,
  languageRef,
  rollBattleOutcome,
  createBlockmonFromSeed,
  generateSeed,
  appendSeed,
  // chain deps
  client,
  resolvePackageId,
  listOwnedBMTokens,
  onchainAddBMTokens,
  onchainSubtractBMTokens,
  getTotalBMTokenBalance,
  queueAndRetry,
  signing,
  currentAccount,
  executor,
}) {
  const runPvpMatch = () => {
    const language = languageRef();
    const blockmons = getBlockmons();
    const tokens = getTokens();
    const pvpSelection = getPvpSelection();

    if (!blockmons.length) return { error: translate(language, "errors.noBlockmonPvp") };
    if (tokens < 3) return { error: translate(language, "errors.noTokensPvp") };

    const selectedIds = (
      pvpSelection.length ? pvpSelection : blockmons.slice(0, 4).map((mon) => mon.id)
    ).slice(0, 4);
    const team = selectedIds
      .map((id) => blockmons.find((mon) => mon.id === id))
      .filter(Boolean);

    if (team.length === 0) {
      return { error: translate(language, "pvp.error.selectTeam") };
    }

    const combinedStats = team.reduce((acc, mon) => {
      Object.keys(mon.stats).forEach((key) => {
        acc[key] = (acc[key] ?? 0) + mon.stats[key];
      });
      return acc;
    }, {});

    const averagedStats = Object.fromEntries(
      Object.entries(combinedStats).map(([key, value]) => [key, Math.max(1, Math.round(value / team.length))])
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
    const opponent = createBlockmonFromSeed(opponentSeed, { origin: "PVP 상대" });

    // rollBattleOutcome expects two mons and seed
    const opp = opponent || { id: `opp-${Date.now()}`, species: "Opponent", hp: teamMaxHp, maxHp: teamMaxHp, stats: averagedStats };
    const result = rollBattleOutcome(contender, opp, opponentSeed, {
      language,
      t: (key, params) => translate(language, key, params),
    });

    const logs = assembleBattleLog(
      result.rounds,
      result.outcome,
      0,
      language,
      contender.species,
      opp.species,
      contender.name ?? contender.species
    );

    const stake = 3;
    const reward = result.outcome === "win" ? 5 : 0;
    const fee = result.outcome === "win" ? 1 : 0;
    const netTokens = reward - fee - stake;

    setTokens((prev) => prev + netTokens);
    // reflect on-chain BM token changes asynchronously
    const ownerForPvp = signing?.address ?? currentAccount?.address ?? null;
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
              await queueAndRetry('pvp.addBMTokens', async () => onchainAddBMTokens({ executor, packageId: pkg, bmTokenId, amount: reward, client }), { attempts: 4, baseDelayMs: 600 });
            }
            const totalCost = fee + stake;
            if (totalCost > 0) {
              await queueAndRetry('pvp.subtractBMTokens', async () => onchainSubtractBMTokens({ executor, packageId: pkg, bmTokenId, amount: totalCost, client }), { attempts: 4, baseDelayMs: 600 });
            }
          }
          const bmTotal = await getTotalBMTokenBalance(client, ownerForPvp, pkg);
          if (Number.isFinite(bmTotal)) setTokens(bmTotal);
        } catch (e) {
          console.error('[Onchain] reflect BM after PVP failed', e);
        }
      })();
    }

    appendSeed?.(typeof opponentSeed === 'bigint' ? opponentSeed.toString(16) : String(opponentSeed), "PVP Match");
    const record = {
      id: `pvp-${Date.now()}`,
      player: {
        ...contender,
        members: team.map((mon) => ({ id: mon.id, name: mon.name, species: mon.species })),
      },
      opponent: opp,
      outcome: result.outcome,
      logs,
      tokensStaked: stake,
      tokensReward: reward,
      fee,
      netTokens,
      completedAt: new Date().toISOString(),
    };
    setPvpHistory((prev) => [...prev, record]);
    setSystemMessage({ key: result.outcome === 'win' ? 'system.pveWin' : 'system.pveLose' });
    setCurrentPage("pvp");
    return { success: true, record };
  };

  return { runPvpMatch };
}


