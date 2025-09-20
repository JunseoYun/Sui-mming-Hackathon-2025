import { evaluateFusionRecipe } from "../utils/random";
import { formatSeed } from "../utils/random";
import { translate } from "../i18n";

export function createFusionService({
  getTokens,
  setTokens,
  getBlockmons,
  setBlockmons,
  setAdventureSelection,
  setPvpSelection,
  setDnaVault,
  setFusionHistory,
  setSystemMessage,
  setFusionFeedback,
  languageRef,
  fuseBlockmons,
  speciesCatalog,
  // chain deps
  resolvePackageId,
  onchainBurnMany,
  onchainCreateBlockMon,
  listOwnedBMTokens,
  extractCreatedByType,
  getBlockMon,
  mapOnchainToLocal,
  queueAndRetry,
  enqueuePendingBurns,
  client,
  signing,
  currentAccount,
  executor,
}) {
  const performFusion = (parentIds) => {
    const uniqueIds = Array.from(new Set(parentIds)).filter(Boolean);
    if (uniqueIds.length < 2) {
      return { error: { key: 'fusion.error.selectTwo' } };
    }

    const blockmons = getBlockmons();
    const tokens = getTokens();
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

    const fusionSeed = BigInt(`0x${formatSeed(crypto.getRandomValues(new Uint32Array(2)).join(''))}`);
    setTokens((prev) => prev - tokenCost);
    const successRoll = Math.random();
    if (successRoll > successChance) {
      const dominant = parents.reduce((best, current) => {
        const bestPower = best?.power ?? -Infinity;
        return (current.power ?? 0) > bestPower ? current : best;
      }, parents[0]);
      const survivors = new Set([dominant.id]);
      const consumedIds = new Set(parents.filter((p) => !survivors.has(p.id)).map((p) => p.id));
      const consumedSeeds = new Set(parents.filter((p) => !survivors.has(p.id)).map((p) => p.seed ?? p.id));

      if (consumedIds.size > 0) {
        setBlockmons((prev) => prev.filter((mon) => !consumedIds.has(mon.id)));
        setAdventureSelection((prev) => prev.filter((id) => !consumedIds.has(id)));
        setPvpSelection((prev) => prev.filter((id) => !consumedIds.has(id)));
        setDnaVault((prev) => prev.filter((entry) => !consumedSeeds.has(entry.seed)));
      }

      const failureRecord = {
        id: `fusion-fail-${formatSeed(fusionSeed)}`,
        result: null,
        parents: parents.map((p) => ({ ...p })),
        createdAt: new Date().toISOString(),
        tokensSpent: tokenCost,
        success: false,
        successChance,
      };
      setFusionHistory((prev) => [...prev, failureRecord]);
      setSystemMessage({ key: 'system.fusionFailed', params: { chance: chancePercent } });
      setFusionFeedback({ type: 'failure', chance: chancePercent });

      const owner = signing.address ?? currentAccount?.address ?? null;
      if (owner) {
        (async () => {
          try {
            const pkg = resolvePackageId();
            const burnIds = parents.filter((p) => p.id && p.id !== dominant.id && /^0x[0-9a-fA-F]+$/.test(p.id)).map((p) => p.id);
            if (burnIds.length > 0) {
              try {
                await queueAndRetry('fusionFail.burnMany', async () => onchainBurnMany({ executor, packageId: pkg, blockmonIds: burnIds, client }), { attempts: 4, baseDelayMs: 700 });
              } catch (err) {
                enqueuePendingBurns(burnIds);
              }
            }
          } catch (e) {
            console.error('[Onchain] fusion-fail burn failed', e);
          }
        })();
      }
      return { error: { key: 'fusion.error.failure', params: { chance: chancePercent } } };
    }

    const newborn = fuseBlockmons(parents, fusionSeed);
    const parentIdSet = new Set(uniqueIds);
    const parentSeedSet = new Set(parents.map((p) => p.seed ?? p.id));
    setBlockmons((prev) => [...prev.filter((m) => !parentIdSet.has(m.id)), newborn]);
    setAdventureSelection((prev) => prev.filter((id) => !parentIdSet.has(id)));
    setPvpSelection((prev) => prev.filter((id) => !parentIdSet.has(id)));
    setDnaVault((prev) => [
      ...prev.filter((entry) => !parentSeedSet.has(entry.seed)),
      { dna: newborn.dna, species: newborn.species, seed: newborn.seed, status: '보관', acquiredAt: new Date().toISOString(), note: '합성 결과' },
    ]);

    const record = {
      id: `fusion-${newborn.seed}`,
      result: newborn,
      parents: parents.map((p) => ({ ...p })),
      createdAt: new Date().toISOString(),
      tokensSpent: tokenCost,
      success: true,
      successChance,
    };
    setFusionHistory((prev) => [...prev, record]);
    setSystemMessage({ key: 'system.fusionCreated' });
    setFusionFeedback({ type: 'success', chance: Math.round(successChance * 100), blockmon: { name: newborn.name, species: newborn.species } });

    const owner = signing.address ?? currentAccount?.address ?? null;
    if (owner) {
      (async () => {
        try {
          const pkg = resolvePackageId();
          const burnIds = parents.filter((p) => p.id && /^0x[0-9a-fA-F]+$/.test(p.id)).map((p) => p.id);
          try {
            await queueAndRetry('fusion.burnMany', async () => {
              if (burnIds.length) {
                await onchainBurnMany({ executor, packageId: pkg, blockmonIds: burnIds, client });
              }
            }, { attempts: 4, baseDelayMs: 700 });
          } catch (burnErr) {
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
          }), { attempts: 5, baseDelayMs: 700 });
          const fullType = `${pkg}::blockmon::BlockMon`;
          const objectId = extractCreatedByType(res, fullType);
          if (objectId) {
            try {
              const fetched = await getBlockMon(client, objectId);
              const mapped = mapOnchainToLocal({ data: fetched?.data ?? fetched });
              if (mapped) {
                setBlockmons((prev) => [...prev.filter((m) => m.id !== objectId), mapped]);
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

  return { performFusion };
}


