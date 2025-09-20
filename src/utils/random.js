import { translateSpecies } from '../i18n';

const speciesCatalog = [
  {
    id: "orca",
    name: "범고래",
    base: { hp: 120, str: 14, dex: 8, con: 13, int: 6, wis: 7, cha: 10 },
    skill: {
      name: "skill.orca.name",
      description: "skill.orca.description",
    },
  },
  {
    id: "plankton",
    name: "플랑크톤",
    base: { hp: 70, str: 6, dex: 14, con: 7, int: 12, wis: 11, cha: 9 },
    skill: {
      name: "skill.plankton.name",
      description: "skill.plankton.description",
    },
  },
  {
    id: "turtle",
    name: "거북이",
    base: { hp: 140, str: 11, dex: 6, con: 16, int: 8, wis: 12, cha: 6 },
    skill: { 
      name: "skill.turtle.name",
      description: "skill.turtle.description"
    },
  },
  {
    id: "kraken",
    name: "크라켄",
    base: { hp: 150, str: 17, dex: 9, con: 14, int: 9, wis: 8, cha: 7 },
    skill: { 
      name: "skill.kraken.name",
      description: "skill.kraken.description"
    },
  },
  {
    id: "leviathan",
    name: "레비아탄",
    base: { hp: 168, str: 18, dex: 11, con: 15, int: 10, wis: 10, cha: 9 },
    skill: {
      name: "skill.leviathan.name",
      description: "skill.leviathan.description",
    },
  },
  {
    id: "mermaid",
    name: "인어",
    base: { hp: 104, str: 10, dex: 13, con: 9, int: 13, wis: 14, cha: 16 },
    skill: { 
      name: "skill.mermaid.name",
      description: "skill.mermaid.description"
    },
  },
];

const statKeys = ["str", "dex", "con", "int", "wis", "cha"];

const RARITY_BRACKETS = [
  { label: "Legendary", threshold: 88 },
  { label: "Epic", threshold: 78 },
  { label: "Rare", threshold: 66 },
  { label: "Uncommon", threshold: 54 },
  { label: "Common", threshold: 0 },
];

function lcg(seed) {
  let state = BigInt(seed) & ((1n << 64n) - 1n);
  return () => {
    state =
      (6364136223846793005n * state + 1442695040888963407n) &
      ((1n << 64n) - 1n);
    return Number(state >> 32n) / 0xffffffff;
  };
}

export function createSeededRng(seed) {
  return lcg(seed);
}

export function generateSeed() {
  const upper = BigInt(Math.floor(Math.random() * 2 ** 32));
  const lower = BigInt(Math.floor(Math.random() * 2 ** 32));
  return (upper << 32n) | lower;
}

export function formatSeed(seed) {
  return seed.toString(16).padStart(16, "0");
}

export function formatDna(seed) {
  const hex = formatSeed(seed).toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}`;
}

export function pickSpecies(seed) {
  const index = Number(seed % BigInt(speciesCatalog.length));
  return speciesCatalog[index];
}

function determineRarity(totalStats) {
  return (
    RARITY_BRACKETS.find((tier) => totalStats >= tier.threshold)?.label ??
    "Common"
  );
}

function generateNickname(speciesName, seed) {
  return `${speciesName}-${formatSeed(seed).slice(-4).toUpperCase()}`;
}

export function createBlockmonFromSeed(seed, options = {}) {
  const species = options.speciesOverride ?? pickSpecies(seed);
  const roll = lcg(seed);
  const hpVariance = Math.floor(roll() * 24);
  const stats = {};

  let statSum = 0;
  statKeys.forEach((key, index) => {
    const baseValue = species.base[key];
    const variance = Math.floor(roll() * (6 + index));
    const chunk = Number((seed >> BigInt(index * 5)) & 0x1fn);
    const bonusFromSeed = Math.floor(chunk / 4);
    const value = baseValue + variance + bonusFromSeed;
    stats[key] = value;
    statSum += value;
  });

  const hp = species.base.hp + hpVariance + Math.floor(statSum / 12);
  const rarity = determineRarity(statSum);

  return {
    id: options.id ?? `dna-${formatSeed(seed)}`,
    dna: formatDna(seed),
    seed: formatSeed(seed),
    species: species.name,
    name: options.name ?? generateNickname(species.name, seed),
    hp,
    maxHp: hp,
    stats,
    skill: species.skill,
    rank: rarity,
    origin: options.origin ?? "야생 탄생",
    power: statSum + hp,
  };
}

export function fuseBlockmons(parents, seed) {
  if (!Array.isArray(parents) || parents.length < 2) {
    throw new Error("fusion requires at least two parents");
  }

  const primarySpecies = parents[0].species;
  if (!parents.every((parent) => parent.species === primarySpecies)) {
    throw new Error("fusion parents must share the same species");
  }

  const baseSpecies =
    speciesCatalog.find((entry) => entry.name === primarySpecies) ??
    pickSpecies(seed);

  let fusionSeed = seed;
  parents.forEach((parent) => {
    const seedHex = parent.seed ?? formatSeed(generateSeed());
    fusionSeed ^= BigInt(`0x${seedHex}`);
  });
  const rng = lcg(fusionSeed);

  const dominant = parents.reduce((best, current) => {
    const bestPower = best?.power ?? -Infinity;
    return (current.power ?? 0) > bestPower ? current : best;
  }, parents[0]);

  const countBonus = parents.length;
  const stats = {};
  let statSum = 0;
  statKeys.forEach((key, index) => {
    const total = parents.reduce((sum, parent) => sum + (parent.stats?.[key] ?? 0), 0);
    const avg = total / parents.length;
    const dominantValue = dominant.stats?.[key] ?? avg;
    const swing = (dominantValue - avg) * 0.6;
    const variance = Math.floor(rng() * (4 + index));
    const base = avg + swing + countBonus * 0.75 + variance;
    const value = Math.max(4, Math.round(base));
    stats[key] = value;
    statSum += value;
  });

  const avgHp = parents.reduce(
    (sum, parent) => sum + (parent.maxHp ?? parent.hp ?? 0),
    0,
  ) / parents.length;
  const dominantHp = dominant.maxHp ?? dominant.hp ?? avgHp;
  const hpBase = avgHp + (dominantHp - avgHp) * 0.6 + countBonus * 10;
  const hp = Math.max(10, Math.round(hpBase + rng() * 12));

  const rarityScore = statSum + Math.floor(hp / 3) + countBonus * 6;
  const rarity = determineRarity(rarityScore);

  return {
    id: `fusion-${formatSeed(seed)}`,
    dna: formatDna(seed),
    seed: formatSeed(seed),
    species: baseSpecies.name,
    name: generateNickname(baseSpecies.name, seed),
    hp,
    maxHp: hp,
    stats,
    skill: baseSpecies.skill,
    rank: rarity,
    origin: "합성 DNA",
    power: statSum + hp,
    parents: parents.map((p) => ({ id: p.id, dna: p.dna, species: p.species })),
    fusionCount: parents.length,
  };
}

export function evaluateFusionRecipe(parents) {
  if (!Array.isArray(parents) || parents.length < 2) {
    return { cost: 0, successChance: 0, dominantPower: 0 };
  }

  const dominant = parents.reduce((best, current) => {
    const bestPower = best?.power ?? -Infinity;
    return (current.power ?? 0) > bestPower ? current : best;
  }, parents[0]);

  const dominantPower = dominant?.power ?? 0;
  const count = parents.length;
  const baseCost = Math.max(1, count - 1);
  const powerCost = Math.max(0, Math.floor(dominantPower / 150));
  const cost = baseCost + powerCost;

  const rawChance = 0.98 - dominantPower / 520 - (count - 2) * 0.05;
  const successChance = Math.min(0.95, Math.max(0.25, rawChance));

  return { cost, successChance, dominantPower };
}

export function rollBattleOutcome(player, opponent, seed, options = {}) {
  const rng = lcg(seed);
  const initiativeScore =
    player.stats.dex - opponent.stats.dex + Math.floor(rng() * 6) - 3;
  const firstAttacker = initiativeScore >= 0 ? "player" : "opponent";
  const rounds = [];

  const language = options.language ?? 'ko';
  const nameFor = (species) => translateSpecies(species, language) || species;

  const battleState = {
    player: {
      hp: player.hp,
      maxHp: player.hp,
      ...player,
      effects: {
        turtleShell: 0,
        planktonHealUsed: false,
        mermaidSkip: null,
        krakenMiss: false,
        skillsUsed: Object.create(null),
      },
      potionUsed: false,
    },
    opponent: {
      hp: opponent.hp,
      maxHp: opponent.hp,
      ...opponent,
      effects: {
        turtleShell: 0,
        planktonHealUsed: false,
        mermaidSkip: null,
        krakenMiss: false,
        skillsUsed: Object.create(null),
      },
    },
    rng,
    rounds,
    t: options.t ?? (() => ''),
    language,
    nameFor,
    potionsRemaining: Math.max(0, options.potionsAvailable ?? 0),
  };

  const { t } = battleState;

  let attacker = firstAttacker === 'player' ? battleState.player : battleState.opponent;
  let defender = firstAttacker === 'player' ? battleState.opponent : battleState.player;

  while (battleState.player.hp > 0 && battleState.opponent.hp > 0 && battleState.rounds.length < 40) {
    applySkills(attacker, defender, battleState);

    if (defender.hp <= 0) {
        break;
    }

    if (attacker.effects.mermaidSkip) {
        const skipEffect = attacker.effects.mermaidSkip;
        attacker.effects.mermaidSkip = null;
        battleState.rounds.push({
            actor: attacker === battleState.player ? 'player' : 'opponent',
            actorSpecies: attacker.species,
            action: t('battleLog.skill.effect.skipTurn', {
              source: battleState.nameFor(skipEffect?.sourceSpecies ?? defender.species),
              skill: t(skipEffect?.skillName ?? 'skill.mermaid.name'),
            }),
            detail: t('battleLog.detail.noAction'),
            playerHp: battleState.player.hp,
            opponentHp: battleState.opponent.hp,
        });
        [attacker, defender] = [defender, attacker];
        continue;
    }

    const phase = attackPhase(attacker, defender, battleState);
    
    // Update hp in battleState
    if (attacker === battleState.player) {
        battleState.opponent.hp = defender.hp;
    } else {
        battleState.player.hp = defender.hp;
    }

    const actorSide = attacker === battleState.player ? 'player' : 'opponent';
    const defaultActionKey =
      phase.result === 'miss'
        ? 'battleLog.action.miss'
        : phase.result === 'crit'
        ? 'battleLog.action.crit'
        : 'battleLog.action.basic';
    const actionText = phase.skillUsed?.action ?? t(defaultActionKey);
    const baseDetail =
      phase.result === 'miss' && !phase.skillUsed
        ? t('battleLog.detail.noDamage')
        : t('battleLog.detail.damage', { value: phase.damage });
    const detailText = phase.skillUsed?.detail ?? baseDetail;

    battleState.rounds.push({
        actor: actorSide,
        actorSpecies: attacker.species,
        action: actionText,
        detail: detailText,
        playerHp: battleState.player.hp,
        opponentHp: battleState.opponent.hp,
    });

    if (defender.hp <= 0) {
        break;
    }

    if (
      attacker === battleState.opponent &&
      battleState.player.hp > 0 &&
      battleState.potionsRemaining > 0 &&
      !battleState.player.potionUsed &&
      battleState.player.hp < (options.playerMaxHp ?? battleState.player.maxHp ?? battleState.player.hp) * 0.5
    ) {
      battleState.potionsRemaining -= 1;
      battleState.player.potionUsed = true;
      battleState.player.hp = options.playerMaxHp ?? battleState.player.maxHp ?? battleState.player.hp;
      battleState.rounds.push({
        actor: 'potion',
        actorSpecies: battleState.player.species,
        action: 'potion',
        detail: '',
        playerHp: battleState.player.hp,
        opponentHp: battleState.opponent.hp,
      });
    }

    [attacker, defender] = [defender, attacker];
  }

  const playerWon = battleState.opponent.hp <= 0;
  const outcome = playerWon ? "win" : "defeat";

  return {
    rounds: battleState.rounds,
    outcome,
    remainingHp: Math.max(battleState.player.hp, 0),
    opponentRemainingHp: Math.max(battleState.opponent.hp, 0),
    potionsUsed: battleState.player.potionUsed ? 1 : 0,
  };
}

function markSkillUsed(entity, key) {
    const skills = entity.effects.skillsUsed ?? (entity.effects.skillsUsed = Object.create(null));
    skills[key] = true;
}

function hasUsedSkill(entity, key) {
    return !!(entity.effects.skillsUsed && entity.effects.skillsUsed[key]);
}

function applySkills(attacker, defender, battleState) {
    const { t, nameFor } = battleState;
    const actorSide = attacker === battleState.player ? 'player' : 'opponent';
    const attackerName = nameFor(attacker.species);
    const attackerSkill = t(attacker.skill.name);
    // Leviathan Skill
    if (
      attacker.skill.name === "skill.leviathan.name" &&
      !hasUsedSkill(attacker, 'leviathan') &&
      battleState.rng() < 0.05
    ) {
        markSkillUsed(attacker, 'leviathan');
        if (defender.effects.turtleShell > 0) {
            battleState.rounds.push({
                actor: actorSide,
                actorSpecies: attacker.species,
                action: t('battleLog.skill.activate', {
                  name: attackerName,
                  skill: attackerSkill,
                }),
                detail: t('battleLog.skill.detail.blocked', {
                  defender: nameFor(defender.species),
                  skill: t('skill.turtle.name'),
                }),
                playerHp: battleState.player.hp,
                opponentHp: battleState.opponent.hp,
            });
        } else {
            defender.hp = 0;
            const playerHp = attacker === battleState.player ? battleState.player.hp : defender.hp;
            const opponentHp = attacker === battleState.player ? defender.hp : battleState.player.hp;
            battleState.rounds.push({
                actor: actorSide,
                actorSpecies: attacker.species,
                action: t('battleLog.skill.activate', {
                  name: attackerName,
                  skill: attackerSkill,
                }),
                detail: t('battleLog.skill.detail.instant'),
                playerHp,
                opponentHp,
            });
        }
        return;
    }

    // Turtle Skill
    if (
      attacker.skill.name === "skill.turtle.name" &&
      attacker.effects.turtleShell === 0 &&
      !hasUsedSkill(attacker, 'turtle') &&
      battleState.rng() < 0.25
    ) {
        markSkillUsed(attacker, 'turtle');
        attacker.effects.turtleShell = 2;
        battleState.rounds.push({
            actor: actorSide,
            actorSpecies: attacker.species,
            action: t('battleLog.skill.use', {
              name: attackerName,
              skill: attackerSkill,
            }),
            detail: t('battleLog.skill.detail.shell', { turns: 2 }),
            playerHp: battleState.player.hp,
            opponentHp: battleState.opponent.hp,
        });
    }

    // Mermaid Skill
    if (
      attacker.skill.name === "skill.mermaid.name" &&
      !hasUsedSkill(attacker, 'mermaid') &&
      battleState.rng() < 0.3
    ) {
        markSkillUsed(attacker, 'mermaid');
        defender.effects.mermaidSkip = {
          sourceSpecies: attacker.species,
          skillName: attacker.skill.name,
        };
        battleState.rounds.push({
            actor: actorSide,
            actorSpecies: attacker.species,
            action: t('battleLog.skill.use', {
              name: attackerName,
              skill: attackerSkill,
            }),
            detail: t('battleLog.skill.detail.skip'),
            playerHp: battleState.player.hp,
            opponentHp: battleState.opponent.hp,
        });
    }

    // Kraken Skill
    if (
      attacker.skill.name === "skill.kraken.name" &&
      !hasUsedSkill(attacker, 'kraken') &&
      battleState.rng() < 0.4
    ) {
        markSkillUsed(attacker, 'kraken');
        defender.effects.krakenMiss = true;
        battleState.rounds.push({
            actor: actorSide,
            actorSpecies: attacker.species,
            action: t('battleLog.skill.use', {
              name: attackerName,
              skill: attackerSkill,
            }),
            detail: t('battleLog.skill.detail.miss'),
            playerHp: battleState.player.hp,
            opponentHp: battleState.opponent.hp,
        });
    }

    // Plankton Skill
    if (
      attacker.skill.name === "skill.plankton.name" &&
      !attacker.effects.planktonHealUsed &&
      !hasUsedSkill(attacker, 'plankton') &&
      attacker.hp / attacker.maxHp < 0.2
    ) {
        markSkillUsed(attacker, 'plankton');
        attacker.hp = attacker.maxHp * 0.5;
        attacker.effects.planktonHealUsed = true;
        const playerHp = attacker === battleState.player ? attacker.hp : battleState.opponent.hp;
        const opponentHp = attacker === battleState.player ? battleState.opponent.hp : attacker.hp;
        battleState.rounds.push({
            actor: actorSide,
            actorSpecies: attacker.species,
            action: t('battleLog.skill.activate', {
              name: attackerName,
              skill: attackerSkill,
            }),
            detail: t('battleLog.skill.detail.heal', {
              hp: Math.round(attacker.hp),
            }),
            playerHp,
            opponentHp,
        });
    }
}

function attackPhase(attacker, defender, battleState) {
    const { rng, t, nameFor } = battleState;
    const attackerName = nameFor(attacker.species);
    const defenderName = nameFor(defender.species);
    if (defender.effects.turtleShell > 0) {
        defender.effects.turtleShell--;
        return {
          damage: 0,
          result: "immune",
          skillUsed: {
            action: t('battleLog.skill.detail.nullified', {
              defender: defenderName,
              skill: t(defender.skill.name),
            }),
            detail: t('battleLog.detail.noDamage'),
          },
        };
    }

    if (defender.effects.krakenMiss) {
        defender.effects.krakenMiss = false;
        return {
          damage: 0,
          result: "miss",
          skillUsed: {
            action: t('battleLog.skill.detail.forcedMiss', {
              defender: defenderName,
              skill: t(defender.skill.name),
            }),
            detail: t('battleLog.detail.noDamage'),
          },
        };
    }

    const accuracy = attacker.stats.dex + attacker.stats.int / 2 + Math.floor(rng() * 12);
    const evasion = defender.stats.dex + defender.stats.wis / 2 + Math.floor(rng() * 10);
    const hit = accuracy >= evasion - 2;
    if (!hit) {
        return { damage: 0, result: "miss" };
    }

    const critChance = attacker.stats.cha / 2 + Math.floor(rng() * 100);
    const isCrit = critChance > 110;
    const baseDamage = attacker.stats.str + attacker.stats.int / 3;
    const variance = Math.floor(rng() * 10);
    let totalDamage = Math.max(4, Math.round(baseDamage + variance)) * (isCrit ? 2 : 1);
    let skillUsed = null;

    if (
      attacker.skill.name === "skill.orca.name" &&
      !hasUsedSkill(attacker, 'orca') &&
      rng() < 0.5
    ) {
        markSkillUsed(attacker, 'orca');
        totalDamage *= 2;
        skillUsed = {
          action: t('battleLog.skill.orca', {
            name: attackerName,
            skill: t(attacker.skill.name),
          }),
        };
    }

    const mitigation = defender.stats.con / 2;
    const damage = Math.max(3, Math.round(totalDamage - mitigation));
    defender.hp = Math.max(0, defender.hp - damage);

    return { damage, result: isCrit ? "crit" : "hit", skillUsed };
}

export const catalog = speciesCatalog;
export const statsOrder = statKeys;
