import { catalog as speciesCatalog } from "./random";

export function mapOnchainToLocal(entry) {
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
}


