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
    temperament: species.habitat,
    origin: options.origin ?? "야생 탄생",
    power: statSum + hp,
  };
}

export function fuseBlockmons(parents, seed) {
  if (!Array.isArray(parents) || parents.length !== 2) {
    throw new Error("fusion requires two parents");
  }
  const [first, second] = parents;
  const baseSpecies =
    speciesCatalog.find((entry) => entry.name === first.species) ??
    pickSpecies(seed);
  const fusionSeed =
    seed ^
    BigInt(parseInt(first.seed.slice(0, 8), 16)) ^
    BigInt(parseInt(second.seed.slice(8, 16), 16));
  const rng = lcg(fusionSeed);

  const stats = {};
  let statSum = 0;
  statKeys.forEach((key, index) => {
    const avg = Math.round((first.stats[key] + second.stats[key]) / 2);
    const adjustment =
      Math.floor(rng() * (4 + index)) - Math.floor(rng() * (2 + index));
    const value = Math.max(4, avg + adjustment);
    stats[key] = value;
    statSum += value;
  });

  const hp = Math.round((first.hp + second.hp) / 2 + rng() * 20);
  const rarity = determineRarity(statSum + Math.floor(hp / 3));

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
    temperament: "합성으로 각성한 유전자",
    origin: "합성 DNA",
    power: statSum + hp,
    parents: parents.map((p) => ({ id: p.id, dna: p.dna, species: p.species })),
  };
}

export function rollBattleOutcome(player, opponent, seed, t) {
  const rng = lcg(seed);
  const initiativeScore =
    player.stats.dex - opponent.stats.dex + Math.floor(rng() * 6) - 3;
  const firstAttacker = initiativeScore >= 0 ? "player" : "opponent";
  const rounds = [];

  const battleState = {
    player: {
      hp: player.hp,
      maxHp: player.hp,
      ...player,
      effects: { turtleShell: 0, planktonHealUsed: false, mermaidSkip: false, krakenMiss: false },
    },
    opponent: {
      hp: opponent.hp,
      maxHp: opponent.hp,
      ...opponent,
      effects: { turtleShell: 0, planktonHealUsed: false, mermaidSkip: false, krakenMiss: false },
    },
    rng,
    rounds,
    t,
  };

  let attacker = firstAttacker === 'player' ? battleState.player : battleState.opponent;
  let defender = firstAttacker === 'player' ? battleState.opponent : battleState.player;

  while (battleState.player.hp > 0 && battleState.opponent.hp > 0 && battleState.rounds.length < 20) {
    applySkills(attacker, defender, battleState);

    if (defender.hp <= 0) {
        break;
    }

    if (attacker.effects.mermaidSkip) {
        attacker.effects.mermaidSkip = false;
        battleState.rounds.push({
            actor: attacker.species,
            action: `${attacker.species}의 ${t(attacker.skill.name)} 효과로 행동을 건너뜁니다.`,
            detail: "",
            playerHp: battleState.player.hp,
            opponentHp: battleState.opponent.hp,
        });
        [attacker, defender] = [defender, attacker];
        continue;
    }

    const phase = attackPhase(attacker, defender, battleState.rng, t);
    
    // Update hp in battleState
    if (attacker === battleState.player) {
        battleState.opponent.hp = defender.hp;
    } else {
        battleState.player.hp = defender.hp;
    }

    if (phase.skillUsed) {
        battleState.rounds.push({
            actor: attacker.species,
            action: phase.skillUsed,
            detail: `${phase.damage} 피해`,
            playerHp: battleState.player.hp,
            opponentHp: battleState.opponent.hp,
        });
    } else {
        battleState.rounds.push({
            actor: attacker.species,
            action: phase.result === "miss" ? "공격이 빗나갔습니다." : phase.result === "crit" ? "치명타!" : "공격",
            detail: phase.result === "miss" ? "데미지 없음" : `${phase.damage} 피해`,
            playerHp: battleState.player.hp,
            opponentHp: battleState.opponent.hp,
        });
    }

    if (defender.hp <= 0) {
        break;
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
  };
}

function applySkills(attacker, defender, battleState) {
    const { t } = battleState;
    // Leviathan Skill
    if (attacker.skill.name === "skill.leviathan.name" && battleState.rng() < 0.05) {
        if (defender.effects.turtleShell > 0) {
            battleState.rounds.push({
                actor: attacker.species,
                action: `${attacker.species}의 ${t(attacker.skill.name)} 발동!`,
                detail: `${defender.species}는 ${t("skill.turtle.name")} 효과로 보호받고 있습니다!`,
                playerHp: battleState.player.hp,
                opponentHp: battleState.opponent.hp,
            });
        } else {
            defender.hp = 0;
            const playerHp = attacker === battleState.player ? battleState.player.hp : defender.hp;
            const opponentHp = attacker === battleState.player ? defender.hp : battleState.player.hp;
            battleState.rounds.push({
                actor: attacker.species,
                action: `${attacker.species}의 ${t(attacker.skill.name)} 발동!`,
                detail: "상대를 즉사시켰습니다!",
                playerHp,
                opponentHp,
            });
        }
        return;
    }

    // Turtle Skill
    if (attacker.skill.name === "skill.turtle.name" && attacker.effects.turtleShell === 0 && battleState.rng() < 0.25) {
        attacker.effects.turtleShell = 2;
        battleState.rounds.push({
            actor: attacker.species,
            action: `${attacker.species}가 ${t(attacker.skill.name)}을 사용!`,
            detail: "2턴 동안 무적이 됩니다.",
            playerHp: battleState.player.hp,
            opponentHp: battleState.opponent.hp,
        });
    }

    // Mermaid Skill
    if (attacker.skill.name === "skill.mermaid.name" && battleState.rng() < 0.3) {
        defender.effects.mermaidSkip = true;
        battleState.rounds.push({
            actor: attacker.species,
            action: `${attacker.species}가 ${t(attacker.skill.name)}을 사용!`,
            detail: "상대의 다음 턴을 건너뜁니다.",
            playerHp: battleState.player.hp,
            opponentHp: battleState.opponent.hp,
        });
    }

    // Kraken Skill
    if (attacker.skill.name === "skill.kraken.name" && battleState.rng() < 0.4) {
        defender.effects.krakenMiss = true;
        battleState.rounds.push({
            actor: attacker.species,
            action: `${attacker.species}가 ${t(attacker.skill.name)}을 사용!`,
            detail: "상대의 다음 공격이 빗나갑니다.",
            playerHp: battleState.player.hp,
            opponentHp: battleState.opponent.hp,
        });
    }

    // Plankton Skill
    if (attacker.skill.name === "skill.plankton.name" && !attacker.effects.planktonHealUsed && attacker.hp / attacker.maxHp < 0.2) {
        attacker.hp = attacker.maxHp * 0.5;
        attacker.effects.planktonHealUsed = true;
        const playerHp = attacker === battleState.player ? attacker.hp : battleState.opponent.hp;
        const opponentHp = attacker === battleState.player ? battleState.opponent.hp : attacker.hp;
        battleState.rounds.push({
            actor: attacker.species,
            action: `${attacker.species}의 ${t(attacker.skill.name)} 발동!`,
            detail: `체력을 ${attacker.hp.toFixed(0)}까지 회복!`,
            playerHp,
            opponentHp,
        });
    }
}

function attackPhase(attacker, defender, rng, t) {
    if (defender.effects.turtleShell > 0) {
        defender.effects.turtleShell--;
        return { damage: 0, result: "immune", skillUsed: `${defender.species}의 ${t(defender.skill.name)} 효과로 공격이 무효화되었습니다.` };
    }

    if (defender.effects.krakenMiss) {
        defender.effects.krakenMiss = false;
        return { damage: 0, result: "miss", skillUsed: `${defender.species}의 ${t(defender.skill.name)} 효과로 공격이 빗나갔습니다.` };
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

    if (attacker.skill.name === "skill.orca.name" && rng() < 0.5) {
        totalDamage *= 2;
        skillUsed = `${attacker.species}의 ${t(attacker.skill.name)}! 데미지 2배!`;
    }

    const mitigation = defender.stats.con / 2;
    const damage = Math.max(3, Math.round(totalDamage - mitigation));
    defender.hp = Math.max(0, defender.hp - damage);

    return { damage, result: isCrit ? "crit" : "hit", skillUsed };
}

export const catalog = speciesCatalog;
export const statsOrder = statKeys;
