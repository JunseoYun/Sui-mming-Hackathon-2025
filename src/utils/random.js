const speciesCatalog = [
  {
    id: "orca",
    name: "범고래",
    base: { hp: 120, str: 14, dex: 8, con: 13, int: 6, wis: 7, cha: 10 },
  },
  {
    id: "plankton",
    name: "플랑크톤",
    base: { hp: 70, str: 6, dex: 14, con: 7, int: 12, wis: 11, cha: 9 },
  },
  {
    id: "turtle",
    name: "거북이",
    base: { hp: 140, str: 11, dex: 6, con: 16, int: 8, wis: 12, cha: 6 },
  },
  {
    id: "kraken",
    name: "크라켄",
    base: { hp: 150, str: 17, dex: 9, con: 14, int: 9, wis: 8, cha: 7 },
  },
  {
    id: "leviathan",
    name: "레비아탄",
    base: { hp: 168, str: 18, dex: 11, con: 15, int: 10, wis: 10, cha: 9 },
  },
  {
    id: "mermaid",
    name: "인어",
    base: { hp: 104, str: 10, dex: 13, con: 9, int: 13, wis: 14, cha: 16 },
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
    rank: rarity,
    temperament: "합성으로 각성한 유전자",
    origin: "합성 DNA",
    power: statSum + hp,
    parents: parents.map((p) => ({ id: p.id, dna: p.dna, species: p.species })),
  };
}

export function rollBattleOutcome(player, opponent, seed) {
  const rng = lcg(seed);
  const initiativeScore =
    player.stats.dex - opponent.stats.dex + Math.floor(rng() * 6) - 3;
  const firstAttacker = initiativeScore >= 0 ? "player" : "opponent";
  const rounds = [];

  let playerHp = player.hp;
  let opponentHp = opponent.hp;

  const attackPhase = (attacker, defender, defenderHp) => {
    const accuracy = attacker.dex + attacker.int / 2 + Math.floor(rng() * 12);
    const evasion = defender.dex + defender.wis / 2 + Math.floor(rng() * 10);
    const hit = accuracy >= evasion - 2;
    if (!hit) {
      return { damage: 0, result: "miss", updatedHp: defenderHp };
    }

    const critChance = attacker.cha / 2 + Math.floor(rng() * 100);
    const isCrit = critChance > 110;
    const baseDamage = attacker.str + attacker.int / 3;
    const variance = Math.floor(rng() * 10);
    const totalDamage =
      Math.max(4, Math.round(baseDamage + variance)) * (isCrit ? 2 : 1);
    const mitigation = defender.con / 2;
    const damage = Math.max(3, totalDamage - mitigation);
    return {
      damage,
      result: isCrit ? "crit" : "hit",
      updatedHp: Math.max(0, defenderHp - damage),
    };
  };

  let attacker = firstAttacker;
  while (playerHp > 0 && opponentHp > 0 && rounds.length < 8) {
    if (attacker === "player") {
      const phase = attackPhase(player.stats, opponent.stats, opponentHp);
      opponentHp = phase.updatedHp;
      rounds.push({
        actor: player.species,
        action:
          phase.result === "miss"
            ? "공격이 빗나갔습니다."
            : phase.result === "crit"
            ? "치명타 성공!"
            : "공격 성공",
        detail:
          phase.result === "miss" ? "데미지 없음" : `${phase.damage} 피해`,
        opponentHp,
      });
      attacker = "opponent";
    } else {
      const phase = attackPhase(opponent.stats, player.stats, playerHp);
      playerHp = phase.updatedHp;
      rounds.push({
        actor: opponent.species,
        action:
          phase.result === "miss"
            ? "공격이 빗나갔습니다."
            : phase.result === "crit"
            ? "치명타!"
            : "공격",
        detail:
          phase.result === "miss" ? "데미지 없음" : `${phase.damage} 피해`,
        opponentHp: playerHp,
      });
      attacker = "player";
    }
  }

  const playerWon = opponentHp === 0 || opponentHp < playerHp;
  const outcome = playerWon ? "win" : "defeat";

  return {
    rounds,
    outcome,
    remainingHp: Math.max(playerHp, 0),
    opponentRemainingHp: Math.max(opponentHp, 0),
  };
}

export const catalog = speciesCatalog;
export const statsOrder = statKeys;
