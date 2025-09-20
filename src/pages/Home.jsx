import React, { useMemo, useState } from "react";
import BlockmonCard from "../components/BlockmonCard";
import TokenBalance from "../components/TokenBalance";
import { translateSpecies } from "../i18n";

export default function Home({ gameState, actions }) {
  const {
    player,
    tokens,
    potions,
    blockmons,
    seedHistory,
    adventure,
    adventureSelection,
    language,
    t,
  } = gameState;

  const [error, setError] = useState("");
  const [showPotionChooser, setShowPotionChooser] = useState(false);
  const [sortKey, setSortKey] = useState("default");
  const selectedTeam = adventureSelection ?? [];
  const teamSize = selectedTeam.length;

  const selectedBlockmons = useMemo(
    () =>
      selectedTeam
        .map((id) => blockmons.find((blockmon) => blockmon.id === id))
        .filter(Boolean),
    [selectedTeam, blockmons]
  );

  const getLocalizedName = (blockmon) => {
    if (language !== "en") {
      return blockmon.name;
    }
    const rawName = blockmon.name ?? "";
    const [base, suffix] = rawName.split("-", 2);
    const translatedBase =
      translateSpecies(base, language) ||
      translateSpecies(blockmon.species, language);
    if (!suffix) {
      return translatedBase;
    }
    return `${translatedBase}-${suffix}`;
  };

  const potionOptions = useMemo(() => {
    const maxCarry = Math.min(potions, teamSize);
    return Array.from({ length: maxCarry + 1 }, (_, count) => count);
  }, [potions, teamSize]);

  const sortedBlockmons = useMemo(() => {
    if (sortKey === "strong") {
      return [...blockmons].sort((a, b) => (b.power ?? 0) - (a.power ?? 0));
    }
    if (sortKey === "weak") {
      return [...blockmons].sort((a, b) => (a.power ?? 0) - (b.power ?? 0));
    }
    return blockmons;
  }, [blockmons, sortKey]);

  const handleStartAdventure = () => {
    setError("");
    if (tokens < 1) {
      setError(t("errors.noTokensAdventure"));
      return;
    }
    if (teamSize === 0) {
      setError(t("errors.selectTeam"));
      return;
    }
    if (!blockmons.length) {
      setError(t("errors.noBlockmon"));
      return;
    }

    const maxCarry = Math.min(potions, teamSize);
    if (maxCarry > 0) {
      setShowPotionChooser(true);
      return;
    }

    const result = actions.startAdventure(selectedTeam, 0);
    if (result?.error) {
      setError(result.error);
    }
  };

  const launchAdventure = (potionCount) => {
    const maxCarry = Math.min(potions, teamSize);
    const normalized = Number.isFinite(Number(potionCount)) ? Math.trunc(Number(potionCount)) : NaN;
    if (!Number.isFinite(normalized) || normalized < 0) {
      setError(t('errors.invalidAmount'));
      return;
    }
    if (normalized > maxCarry) {
      setError(t('errors.amountOutOfRange'));
      return;
    }
    const result = actions.startAdventure(selectedTeam, normalized);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setError("");
    setShowPotionChooser(false);
  };

  const handleToggleMember = (blockmon) => {
    setError("");
    const existingIndex = selectedTeam.indexOf(blockmon.id);
    if (existingIndex !== -1) {
      actions.setAdventureSelection(
        selectedTeam.filter((id) => id !== blockmon.id)
      );
      return;
    }

    if (teamSize >= 4) {
      const [, ...rest] = selectedTeam;
      actions.setAdventureSelection([...rest, blockmon.id]);
      return;
    }

    actions.setAdventureSelection([...selectedTeam, blockmon.id]);
  };

  const handleClearSelection = () => {
    setError("");
    actions.setAdventureSelection([]);
  };

  return (
    <div className="page page--home">
      <header className="page__header">
        <h1>{t("home.title", { name: player.nickname })}</h1>
        <p className="page__subtitle">{t("home.subtitle")}</p>
        <div className="home__language-toggle">
          <button
            className={language === "ko" ? "is-active" : ""}
            onClick={() => actions.setLanguage("ko")}
          >
            {t("home.language.korean")}
          </button>
          <button
            className={language === "en" ? "is-active" : ""}
            onClick={() => actions.setLanguage("en")}
          >
            {t("home.language.english")}
          </button>
        </div>
      </header>

      <TokenBalance
        tokens={tokens}
        seedCount={seedHistory.length}
        potionCount={potions}
        t={t}
        language={language}
      />

      <div className="primary-callout">
        <button
          className="primary-callout-button"
          onClick={handleStartAdventure}
          disabled={teamSize === 0 || tokens < 1}
        >
          {t("home.actions.startAdventure")}
        </button>
      </div>

      <section>
        <h2>{t("home.section.blockmons")}</h2>

        {blockmons.length === 0 && <p>{t("home.noBlockmons")}</p>}
        {blockmons.length > 0 && (
          <div className="home__team-toolbar">
            <span>{t("home.selectedCount", { count: teamSize })}</span>
            <div className="home__sort-buttons">
              <button
                type="button"
                className={sortKey === "default" ? "is-active" : ""}
                onClick={() => setSortKey("default")}
              >
                {t("home.sort.default")}
              </button>
              <button
                type="button"
                className={sortKey === "strong" ? "is-active" : ""}
                onClick={() => setSortKey("strong")}
              >
                {t("home.sort.strong")}
              </button>
              <button
                type="button"
                className={sortKey === "weak" ? "is-active" : ""}
                onClick={() => setSortKey("weak")}
              >
                {t("home.sort.weak")}
              </button>
            </div>
            <button
              onClick={handleClearSelection}
              disabled={teamSize === 0}
              className="home__clear"
            >
              {t("home.clearSelection")}
            </button>
          </div>
        )}
        {blockmons.length > 0 && (
          <div className="blockmon-grid">
            {sortedBlockmons.map((blockmon) => {
              const selectedIndex = selectedTeam.indexOf(blockmon.id);
              return (
                <BlockmonCard
                  key={blockmon.id}
                  blockmon={blockmon}
                  selectable
                  isSelected={selectedIndex !== -1}
                  order={selectedIndex}
                  onSelect={handleToggleMember}
                  language={language}
                  t={t}
                />
              );
            })}
          </div>
        )}
      </section>

      {error && <p className="page__error">{error}</p>}

      {showPotionChooser && (
        <div className="home__overlay" role="dialog" aria-modal="true">
          <div
            className="home__overlay-backdrop"
            onClick={() => setShowPotionChooser(false)}
          />
          <div className="home__overlay-content">
            <button
              type="button"
              className="home__overlay-close"
              onClick={() => setShowPotionChooser(false)}
              aria-label={language === "en" ? "Close" : "닫기"}
            >
              ×
            </button>
            <h3>{t("home.potionSelect.title")}</h3>
            <p>
              {t("home.potionSelect.subtitle", {
                stock: potions,
                max: Math.min(potions, teamSize),
              })}
            </p>
            <div className="home__overlay-options">
              {potionOptions.map((count) => (
                <button key={count} onClick={() => launchAdventure(count)}>
                  {count === 0
                    ? t("home.potionSelect.optionNone")
                    : t("home.potionSelect.option", { count })}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="home__overlay-cancel"
              onClick={() => setShowPotionChooser(false)}
            >
              {t("home.potionSelect.cancel")}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
