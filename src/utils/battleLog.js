import { translate, translateSpecies, translateAction, translateDetail } from "../i18n";

export function formatLogTime(language, offsetMinutes = 0) {
  const base = new Date(Date.now() + offsetMinutes * 60_000);
  const locale = language === "en" ? "en-US" : "ko-KR";
  return base.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function assembleBattleLog(
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


