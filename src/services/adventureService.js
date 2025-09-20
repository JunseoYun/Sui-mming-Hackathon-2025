import { translate, translateSpecies } from "../i18n";
import { generateSeed, createBlockmonFromSeed, formatSeed } from "../utils/random";
import { assembleBattleLog, formatLogTime } from "../utils/battleLog";

export function createAdventureService({
  getBlockmons,
  getTokens,
  getPotions,
  setPotions,
  setTokens,
  setSystemMessage,
  setAdventure,
  setBattle,
  setBattleHistory,
  setBlockmons,
  setDnaVault,
  appendSeed,
  setCurrentPage,
  languageRef,
  getAdventureSelection,
  setAdventureSelection,
  rollBattleOutcome,
  // chain deps
  resolvePackageId,
  getTotalBMTokenBalance,
  getTotalPotionCountByType,
  listOwnedBMTokens,
  listOwnedPotions,
  onchainAddBMTokens,
  onchainSubtractBMTokens,
  onchainCreateBlockMon,
  onchainCreateManyBlockMon,
  extractCreatedByType,
  extractCreatedManyByType,
  getBlockMon,
  queueAndRetry,
  savePendingMints,
  removeEntriesFromQueue,
  speciesCatalog,
  client,
  executor,
  signing,
  currentAccount,
}) {
  const startAdventure = (selectedIdsParam, potionsSelected = 0) => {
    const language = languageRef();
    const blockmons = getBlockmons();
    const tokens = getTokens();
    const potions = getPotions();

    if (!blockmons.length) return { error: translate(language, 'errors.noBlockmon') };
    if (tokens < 1) return { error: translate(language, 'errors.noTokensAdventure') };

    const selectedIds = (selectedIdsParam ?? getAdventureSelection()).slice(0, 4);
    if (!selectedIds.length) return { error: translate(language, 'errors.selectTeam') };
    const team = selectedIds.map((id) => blockmons.find((m) => m.id === id)).filter(Boolean).slice(0, 4);
    if (!team.length) return { error: translate(language, 'errors.missingSelected') };
    if (selectedIds.length !== team.length) setAdventureSelection(team.map((m) => m.id));

    const maxPotionsCarry = Math.min(potions, team.length);
    const potionsToCarry = Math.max(0, Math.min(maxPotionsCarry, Number.isFinite(potionsSelected) ? Math.trunc(potionsSelected) : 0));

    const seed = generateSeed();
    const seedHex = formatSeed(seed);
    const startedAt = new Date();

    const teamRecords = team.map((mon) => ({ id: mon.id, dna: mon.dna, species: mon.species, name: mon.name, remainingHp: mon.hp, maxHp: mon.maxHp ?? mon.hp, knockedOut: false, potionUsed: false }));

    let logs = [{ time: formatLogTime(language), message: translate(language, 'adventure.log.start', { count: team.length }) }];
    const battleRecords = [];
    const capturedMonsters = [];
    let defeats = 0;
    let tokensEarned = 0;
    let offset = 1;
    let potionsRemaining = potionsToCarry;
    let potionsUsed = 0;

    appendSeed(seedHex, 'Adventure Start');
    if (potionsToCarry > 0) setPotions((prev) => prev - potionsToCarry);

    outer: while (teamRecords.some((m) => !m.knockedOut)) {
      const encounterSeed = generateSeed();
      const wildBase = createBlockmonFromSeed(encounterSeed, { origin: '야생 조우' });
      let wildHp = wildBase.hp;
      let encounterEntry = null;
      while (wildHp > 0 && teamRecords.some((m) => !m.knockedOut)) {
        const activeMember = teamRecords.find((m) => !m.knockedOut);
        if (!activeMember) break;
        const baseMon = blockmons.find((mon) => mon.id === activeMember.id) ?? team.find((mon) => mon.id === activeMember.id);
        if (!baseMon) { activeMember.knockedOut = true; continue; }
        const playerMon = { ...baseMon, hp: activeMember.remainingHp };
        const wild = { ...wildBase, hp: wildHp, maxHp: wildBase.maxHp ?? wildBase.hp };
        if (!encounterEntry) {
          encounterEntry = { time: formatLogTime(language, offset++), message: translate(language, 'adventure.log.encounter', { species: translateSpecies(wildBase.species, language) }) };
          logs.push(encounterEntry);
        }
        const battleSeed = generateSeed();
        const battleSeedHex = formatSeed(battleSeed);
        const result = rollBattleOutcome(playerMon, wild, battleSeed, { potionsAvailable: !activeMember.potionUsed && potionsRemaining > 0 ? 1 : 0, playerMaxHp: activeMember.maxHp ?? playerMon.maxHp ?? playerMon.hp, t: (key, params) => translate(language, key, params), language });
        const battleLogEntries = assembleBattleLog(result.rounds, result.outcome, offset, language, playerMon.species, wild.species, playerMon.name ?? playerMon.species);
        const logCount = battleLogEntries.length;
        offset += logCount + 1;
        logs = [...logs, ...battleLogEntries];
        defeats += result.outcome === 'win' ? 0 : 1;
        activeMember.remainingHp = result.remainingHp;
        const potionsConsumed = Math.min(result.potionsUsed ?? 0, potionsRemaining);
        if (potionsConsumed > 0) { potionsRemaining -= potionsConsumed; potionsUsed += potionsConsumed; activeMember.potionUsed = true; }
        activeMember.knockedOut = activeMember.remainingHp <= 0;
        if (activeMember.knockedOut) {
          const finalRound = result.rounds[result.rounds.length - 1];
          const attackerName = translateSpecies(finalRound?.actorSpecies, language) ?? finalRound?.actorSpecies ?? translate(language, 'battleLog.actor.opponent');
          const defenderName = language === 'en' ? translateSpecies(activeMember.species, language) : activeMember.name;
          logs.push({ time: formatLogTime(language, offset++), message: translate(language, 'adventure.log.knockout', { defender: defenderName, attacker: attackerName }) });
        }
        wildHp = result.opponentRemainingHp;
        appendSeed(battleSeedHex, `Wild Battle #${battleRecords.length + 1}`);
        const completedAt = new Date().toISOString();
        const playerSnapshot = { ...playerMon, hp: result.remainingHp, maxHp: playerMon.maxHp ?? playerMon.hp };
        const wildSnapshot = { ...wild, hp: result.opponentRemainingHp, maxHp: wild.maxHp ?? wild.hp };
        const logEntriesForRecord = encounterEntry ? [encounterEntry, ...battleLogEntries] : battleLogEntries;
        battleRecords.push({ id: `battle-${battleSeedHex}`, seed: battleSeedHex, player: playerSnapshot, opponent: wildSnapshot, outcome: result.outcome, rounds: result.rounds, logEntries: logEntriesForRecord, tokensSpent: 0, tokensReward: 0, completedAt });
        encounterEntry = null;
        if (wildHp <= 0) {
          const captured = { ...wildBase, hp: wildBase.maxHp ?? wildBase.hp, maxHp: wildBase.maxHp ?? wildBase.hp, id: wildBase.id, stats: { ...wildBase.stats }, origin: '포획된 야생 블록몬' };
          capturedMonsters.push(captured);
          logs.push({ time: formatLogTime(language, offset++), message: translate(language, 'adventure.log.capture', { species: translateSpecies(wildBase.species, language) }) });
          break;
        }
        if (teamRecords.every((m) => m.knockedOut)) break outer;
      }
    }

    logs.push({ time: formatLogTime(language, offset), message: translate(language, 'adventure.log.complete') });
    const teamMaxHpMap = new Map(teamRecords.map((m) => [m.id, m.maxHp ?? m.remainingHp ?? 0]));
    const adventureState = { id: `adv-${seedHex}`, seed: seedHex, startedAt: startedAt.toISOString(), finishedAt: new Date().toISOString(), team: teamRecords, potions, logs, status: 'complete', tokensSpent: 1, tokensEarned, defeats, battles: battleRecords.length, capturedCount: capturedMonsters.length, potionsCarried: potionsToCarry, potionsRemaining, potionsUsed, capturedMonsters };
    if (potionsRemaining > 0) setPotions((prev) => prev + potionsRemaining);
    setBlockmons((prev) => {
      const restored = prev.map((mon) => {
        const maxHp = teamMaxHpMap.get(mon.id);
        if (!maxHp) return mon;
        const appliedMaxHp = mon.maxHp ?? maxHp;
        return { ...mon, hp: appliedMaxHp, maxHp: appliedMaxHp };
      });
      if (!capturedMonsters.length) return restored;
      return [...restored, ...capturedMonsters];
    });
    if (capturedMonsters.length) {
      setDnaVault((prev) => [ ...prev, ...capturedMonsters.map((mon) => ({ dna: mon.dna, species: mon.species, seed: mon.seed, status: '활성', acquiredAt: new Date().toISOString(), note: '모험 포획' })) ]);
    }
    setTokens((prev) => prev - 1 + tokensEarned);
    setAdventure(adventureState);
    setBattle(battleRecords[battleRecords.length - 1] ?? null);
    setBattleHistory((prev) => [...prev, ...battleRecords]);
    setSystemMessage({ key: 'system.adventureSummary', params: { battles: battleRecords.length, captured: capturedMonsters.length, tokens: tokensEarned } });
    setCurrentPage('adventure');

    const owner = signing.address ?? currentAccount?.address ?? null;
    if (owner) {
      (async () => {
        try {
          const pkg = resolvePackageId();
          // settle BM and potions
          try {
            let bmTokenId = null;
            try {
              const resBM = await listOwnedBMTokens(client, owner, pkg, null, 50);
              const firstBM = (resBM?.data ?? [])[0];
              bmTokenId = firstBM?.data?.objectId ?? firstBM?.objectId ?? null;
            } catch (_) {}
            let potionId = null;
            if (potionsUsed > 0) {
              try {
                const res = await listOwnedPotions(client, owner, pkg, null, 50);
                const hpEntry = (res?.data ?? []).find((item) => {
                  const fields = item?.data?.content?.fields ?? item?.content?.fields;
                  return fields?.potion_type === 'HP';
                });
                potionId = hpEntry?.data?.objectId ?? hpEntry?.objectId ?? null;
              } catch (_) {}
            }
            if (bmTokenId || (potionsUsed > 0 && potionId)) {
              const tx = new (await import("@mysten/sui.js/transactions")).TransactionBlock();
              if (bmTokenId) {
                if (tokensEarned > 0) tx.moveCall({ target: `${pkg}::inventory::add_bm_tokens`, arguments: [tx.object(bmTokenId), tx.pure.u64(tokensEarned)] });
                tx.moveCall({ target: `${pkg}::inventory::subtract_bm_tokens`, arguments: [tx.object(bmTokenId), tx.pure.u64(1)] });
              }
              if (potionsUsed > 0 && potionId) {
                tx.moveCall({ target: `${pkg}::inventory::use_potion`, arguments: [tx.object(potionId), tx.pure.u64(potionsUsed)] });
              }
              await queueAndRetry('adventure.settle', async () => executor(tx), { attempts: 4, baseDelayMs: 500 });
            }
            try {
              const bmTotal = await getTotalBMTokenBalance(client, owner, pkg);
              if (Number.isFinite(bmTotal)) setTokens(bmTotal);
            } catch (_) {}
            try {
              const total = await getTotalPotionCountByType(client, owner, pkg, 'HP');
              if (Number.isFinite(total)) setPotions(total);
            } catch (_) {}
          } catch (e) {}

          if (capturedMonsters.length > 0) {
            try {
              const BATCH_SIZE = 10;
              const allEntries = capturedMonsters.map((captured) => {
                const species = speciesCatalog.find((s) => s.name === captured.species);
                const monId = species?.id ?? captured.species;
                return { monId, name: captured.name, hp: Number(captured.maxHp ?? captured.hp ?? 0), str: Number(captured.stats?.str ?? 0), dex: Number(captured.stats?.dex ?? 0), con: Number(captured.stats?.con ?? 0), int: Number(captured.stats?.int ?? 0), wis: Number(captured.stats?.wis ?? 0), cha: Number(captured.stats?.cha ?? 0), skillName: String(captured.skill?.name ?? ''), skillDescription: String(captured.skill?.description ?? '') };
              });
              try { savePendingMints([ ...allEntries, ...[] ]); } catch (_) {}
              for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
                const batch = allEntries.slice(i, i + BATCH_SIZE);
                try {
                  const res = await queueAndRetry('capture.batch', async () => onchainCreateManyBlockMon({ executor, packageId: pkg, sender: owner, entries: batch, client }), { attempts: 4, baseDelayMs: 700 });
                  const fullType = `${pkg}::blockmon::BlockMon`;
                  const ids = extractCreatedManyByType(res, fullType);
                  if (ids?.length) {
                    const fetched = await Promise.all(ids.map(async (id) => { try { const obj = await getBlockMon(client, id); return { data: obj?.data ?? obj }; } catch (_) { return null; } }));
                    // mapping is done in caller
                  }
                } catch (err) {
                  for (const entry of batch) {
                    try {
                      const res = await queueAndRetry('capture.single', async () => onchainCreateBlockMon({ executor, packageId: pkg, sender: owner, ...entry, client }), { attempts: 6, baseDelayMs: 600 });
                      const fullType = `${pkg}::blockmon::BlockMon`;
                      const objectId = extractCreatedByType(res, fullType);
                      if (objectId) removeEntriesFromQueue([entry]);
                    } catch (_) {}
                  }
                }
              }
            } catch (e) {}
          }
        } catch (e) {}
      })();
    }

    return { success: true };
  };

  return { startAdventure };
}


