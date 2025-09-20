import React from "react";

export default function RouterView({ pages, currentPage, gameState, actions }) {
  const CurrentComponent = pages[currentPage]?.component ?? pages.home.component;
  return (
    <main className="app__content">
      <CurrentComponent gameState={gameState} actions={actions} />
    </main>
  );
}


