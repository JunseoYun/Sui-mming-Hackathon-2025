import React, { useMemo, useState } from "react";
import BattleLog from "../components/BattleLog";
import BlockmonCard from "../components/BlockmonCard";

export default function Pvp({ gameState, actions }) {
  const { blockmons, pvpHistory, pvpSelection, language, t } = gameState;
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState("default");

  const latest = useMemo(
    () => (pvpHistory.length ? pvpHistory[pvpHistory.length - 1] : null),
    [pvpHistory]
  );
  const selectedTeam = pvpSelection ?? [];

  const sortedBlockmons = useMemo(() => {
    if (sortKey === "strong") {
      return [...blockmons].sort((a, b) => (b.power ?? 0) - (a.power ?? 0));
    }
    if (sortKey === "weak") {
      return [...blockmons].sort((a, b) => (a.power ?? 0) - (b.power ?? 0));
    }
    return blockmons;
  }, [blockmons, sortKey]);

  const handleMatch = () => {
    setError("");
    if (!selectedTeam.length) {
      setError(t("pvp.error.selectTeam"));
      return;
    }
    const result = actions.runPvpMatch();
    if (result?.error) {
      setError(result.error);
    } else {
      setError("");
    }
  };

  const toggleMember = (blockmon) => {
    setError("");
    const alreadySelected = selectedTeam.includes(blockmon.id);
    if (alreadySelected) {
      actions.setPvpSelection(selectedTeam.filter((id) => id !== blockmon.id));
      return;
    }
    if (selectedTeam.length >= 4) {
      const [, ...rest] = selectedTeam;
      actions.setPvpSelection([...rest, blockmon.id]);
      return;
    }
    actions.setPvpSelection([...selectedTeam, blockmon.id]);
  };

  return (
    <div className="page page--pvp">
      <header className="page__header">
        <h1>{t("pvp.title")}</h1>
        <p className="page__subtitle">{t("pvp.subtitle")}</p>
      </header>

      <section className="pvp__status">
        <div className="pvp__card">
          <h2>{t("pvp.card.rulesTitle")}</h2>
          <ul>
            <li>{t("pvp.card.ruleStake")}</li>
            <li>{t("pvp.card.ruleReward")}</li>
            <li>{t("pvp.card.ruleLoss")}</li>
          </ul>
        </div>
        <div className="pvp__card">
          <h2>{t("pvp.card.recentTitle")}</h2>
          {latest ? (
            <ul>
              <li>
                {latest.outcome === "win"
                  ? t("pvp.card.recentResultWin")
                  : t("pvp.card.recentResultLose")}
              </li>
              <li>
                {t("pvp.card.recentOpponent", { name: latest.opponent.name })}
              </li>
              <li>
                {t("pvp.card.recentStake", { value: latest.tokensStaked })}
              </li>
              <li>
                {t("pvp.card.recentReward", { value: latest.tokensReward })}
              </li>
              <li>{t("pvp.card.recentFee", { value: latest.fee })}</li>
              <li>
                {t("pvp.card.recentNet", {
                  value:
                    latest.netTokens >= 0
                      ? `+${latest.netTokens}`
                      : latest.netTokens,
                })}
              </li>
            </ul>
          ) : (
            <p>{t("pvp.card.recentNone")}</p>
          )}
        </div>
      </section>

      <section className="pvp__selection">
        <h2>{t("pvp.selection.title")}</h2>
        <div className="primary-callout">
          <button
            className="primary-callout-button"
            onClick={handleMatch}
            disabled={!selectedTeam.length}
          >
            {t("pvp.actions.match")}
          </button>
        </div>
        {blockmons.length > 0 && (
          <div className="home__team-toolbar">
            <span>{t("home.selectedCount", { count: selectedTeam.length })}</span>
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
              type="button"
              className="home__clear"
              onClick={() => actions.setPvpSelection([])}
              disabled={selectedTeam.length === 0}
            >
              {t("home.clearSelection")}
            </button>
          </div>
        )}
        <div className="blockmon-grid">
          {sortedBlockmons.map((blockmon) => {
            const order = selectedTeam.indexOf(blockmon.id);
            return (
              <BlockmonCard
                key={blockmon.id}
                blockmon={blockmon}
                selectable
                isSelected={order !== -1}
                order={order}
                onSelect={toggleMember}
                language={language}
                t={t}
              />
            );
          })}
        </div>
      </section>

      {error && <p className="page__error">{error}</p>}

      {latest && <BattleLog entries={latest.logs} t={t} />}
    </div>
  );
}
