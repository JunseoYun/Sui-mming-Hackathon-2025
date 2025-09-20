import React, { useMemo, useState } from "react";
import BlockmonCard from "../components/BlockmonCard";
import { translateSpecies } from "../i18n";
import { fuseBlockmons, evaluateFusionRecipe } from "../utils/random";

export default function Fusion({ gameState, actions }) {
  const { blockmons, tokens, language, t } = gameState;
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  const handleSelect = (blockmon) => {
    setResultMessage("");
    setError("");
    setSelected((current) => {
      if (current.includes(blockmon.id)) {
        return current.filter((id) => id !== blockmon.id);
      }

      if (!current.length) {
        return [blockmon.id];
      }

      const firstSelected = blockmons.find(
        (candidate) => candidate.id === current[0]
      );
      if (firstSelected && firstSelected.species !== blockmon.species) {
        return [blockmon.id];
      }

      return [...current, blockmon.id];
    });
  };

  const speciesGroups = useMemo(() => {
    const map = new Map();
    blockmons.forEach((blockmon) => {
      if (!map.has(blockmon.species)) {
        map.set(blockmon.species, []);
      }
      map.get(blockmon.species).push(blockmon);
    });
    return Array.from(map.entries())
      .map(([species, members]) => ({
        species,
        members: [...members].sort((a, b) => (b.power ?? 0) - (a.power ?? 0)),
        count: members.length,
        label: translateSpecies(species, language) || species,
      }))
      .filter((entry) => entry.count >= 2)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [blockmons, language]);

  const selectedBlockmons = useMemo(
    () => blockmons.filter((blockmon) => selected.includes(blockmon.id)),
    [blockmons, selected]
  );

  const handleQuickSelect = (species) => {
    setResultMessage("");
    setError("");
    const group = speciesGroups.find((entry) => entry.species === species);
    if (!group) return;
    setSelected((current) => {
      const groupIds = group.members.map((member) => member.id);
      const isSameSelection =
        current.length === groupIds.length &&
        current.every((id) => groupIds.includes(id));
      return isSameSelection ? [] : groupIds;
    });
  };

  const fusionSpecies = selectedBlockmons[0]?.species;
  const fusionValid = useMemo(
    () =>
      selectedBlockmons.length >= 2 &&
      selectedBlockmons.every((blockmon) => blockmon.species === fusionSpecies),
    [selectedBlockmons, fusionSpecies]
  );

  const fusionMetrics = useMemo(
    () =>
      fusionValid
        ? evaluateFusionRecipe(selectedBlockmons)
        : { cost: 0, successChance: 0 },
    [fusionValid, selectedBlockmons]
  );

  const fusionCost = fusionMetrics.cost;
  const successChance = fusionMetrics.successChance;
  const successPercent = Math.round(successChance * 100);

  const preview = useMemo(() => {
    if (!fusionValid) return null;
    try {
      const simulated = fuseBlockmons(selectedBlockmons, 0n);
      return { ...simulated, id: "preview" };
    } catch (error) {
      console.warn("[Fusion] Preview generation failed", error);
      return null;
    }
  }, [fusionValid, selectedBlockmons]);

  const performFusion = () => {
    if (!fusionValid) {
      setError(
        selectedBlockmons.length < 2
          ? t("fusion.error.selectTwo")
          : t("fusion.error.sameSpecies")
      );
      return;
    }

    const result = actions.performFusion(
      selectedBlockmons.map((blockmon) => blockmon.id)
    );
    if (result?.error) {
      setError(result.error);
    } else {
      const usedIds = new Set(selectedBlockmons.map((blockmon) => blockmon.id));
      setSelected((prev) => prev.filter((id) => !usedIds.has(id)));
      const newborn = result.newborn?.result ?? result.newborn;
      const newbornName =
        newborn?.name ?? t("fusion.alert.title", { name: "Blockmon" });
      setResultMessage(t("fusion.result.message", { name: newbornName }));
      if (typeof window !== "undefined") {
        const dnaInfo = newborn?.dna
          ? `\n${t("fusion.alert.dna", { dna: newborn.dna })}`
          : "";
        window.alert(
          `${t("fusion.alert.title", { name: newbornName })}${dnaInfo}`
        );
      }
    }
  };

  const fusionButtonLabel = fusionValid
    ? t("fusion.button.executeDynamic", { cost: fusionCost })
    : t("fusion.button.execute");

  return (
    <div className="page page--fusion">
      <header className="page__header">
        <h1>{t("fusion.title")}</h1>
        <p className="page__subtitle">{t("fusion.subtitle")}</p>
      </header>

      <section>
        <div className="fusion__header">
          <h2>{t("fusion.section.blockmons")}</h2>
          <div className="fusion__execute-group">
            {fusionValid && (
              <span className="fusion__execute-chance">
                {t("fusion.successChance", { chance: successPercent })}
              </span>
            )}
            <button
              type="button"
              className="fusion__execute"
              onClick={performFusion}
              disabled={!fusionValid || tokens < fusionCost}
            >
              {fusionButtonLabel}
            </button>
          </div>
        </div>
        <p>{t("fusion.tokens", { value: tokens })}</p>
        {speciesGroups.length > 0 && (
          <div className="fusion__quick-select">
            <h3>{t("fusion.quickSelect.title")}</h3>
            <div className="fusion__quick-select-buttons">
              {speciesGroups.map((group) => {
                const isGroupSelected =
                  selectedBlockmons.length === group.count &&
                  selectedBlockmons.every(
                    (blockmon) => blockmon.species === group.species
                  );
                return (
                  <button
                    type="button"
                    key={group.species}
                    className={isGroupSelected ? "is-active" : ""}
                    onClick={() => handleQuickSelect(group.species)}
                  >
                    {t("fusion.quickSelect.button", {
                      species: group.label,
                      count: group.count,
                    })}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {preview && (
          <section className="fusion__preview">
            <h2>{t("fusion.preview.title")}</h2>
            <BlockmonCard blockmon={preview} language={language} t={t} />
          </section>
        )}
        <div className="blockmon-grid">
          {blockmons.map((blockmon) => (
            <BlockmonCard
              key={blockmon.id}
              blockmon={blockmon}
              selectable
              isSelected={selected.includes(blockmon.id)}
              onSelect={handleSelect}
              language={language}
              t={t}
            />
          ))}
        </div>
        {selectedBlockmons.length > 0 && (
          <div className="fusion__selection">
            <p>
              {t("fusion.selection.lead", { count: selectedBlockmons.length })}
            </p>
            {selectedBlockmons.length > 0 && (
              <p className="fusion__cost">
                {t("fusion.cost.summary", {
                  count: selectedBlockmons.length,
                  cost: fusionCost,
                  tokens,
                })}
              </p>
            )}
            {selectedBlockmons.length > 1 && (
              <p>{t("fusion.selection.notice")}</p>
            )}
          </div>
        )}
      </section>

      {error && <p className="page__error">{error}</p>}
      {resultMessage && <p>{resultMessage}</p>}

      <div className="fusion__actions">
        <button onClick={() => actions.navigate("home")}>
          {t("fusion.button.home")}
        </button>
      </div>
    </div>
  );
}
