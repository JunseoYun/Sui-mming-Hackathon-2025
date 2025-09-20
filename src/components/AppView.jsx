import React from "react";
import AppHeader from "./AppHeader";
import RouterView from "./RouterView";

export default function AppView({ t, player, navItems, currentPage, onNavigate, language, onSetLanguage, systemMessage, pages, gameState, actions, showChainLogSlot, fusionFeedbackSlot, contentSlot }) {
  const resolvedNotice = systemMessage?.key ? t(systemMessage.key, systemMessage.params) : "";
  return (
    <div className="app">
      <AppHeader
        t={t}
        player={player}
        navItems={navItems}
        currentPage={currentPage}
        onNavigate={onNavigate}
        language={language}
        onSetLanguage={onSetLanguage}
      />

      {resolvedNotice && <div className="app__notice">{resolvedNotice}</div>}

      {fusionFeedbackSlot}

      {contentSlot || (
        <RouterView pages={pages} currentPage={currentPage} gameState={gameState} actions={actions} />
      )}

      {showChainLogSlot}
    </div>
  );
}


