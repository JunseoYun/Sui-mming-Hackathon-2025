export function createUiService({ pages, setCurrentPage, setSystemMessage, setLanguage, setAdventureSelection, setPvpSelection, setShowChainLog, getShowChainLog, setChainLog, CHAIN_LOG_KEY }) {
  const navigate = (pageKey) => {
    if (pages[pageKey]) {
      setCurrentPage(pageKey);
      setSystemMessage(null);
    }
  };

  const toggleChainLog = () => {
    const next = !getShowChainLog();
    setShowChainLog(next);
  };

  const clearChainLog = () => {
    try { localStorage.setItem(CHAIN_LOG_KEY, JSON.stringify([])); } catch (_) {}
    setChainLog([]);
  };

  return {
    navigate,
    setLanguage,
    setAdventureSelection,
    setPvpSelection,
    toggleChainLog,
    clearChainLog,
  };
}


