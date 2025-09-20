export function createSessionService({ setPlayer, setStarterAttempted, setBlockmons, setAdventureSelection, setPvpSelection, setDnaVault, appendSeed, setSystemMessage, setCurrentPage, generateSeed, createBlockmonFromSeed, formatSeed }) {
  const registerUser = (nickname, signingAddress) => {
    if (signingAddress) {
      // Chain-first path handled in App due to client dependencies; keep local fallback here
    }
    const starterSeed = generateSeed();
    const starter = createBlockmonFromSeed(starterSeed, { origin: "스타터 DNA" });
    setPlayer({ nickname, joinedAt: new Date().toISOString(), starterSeed: formatSeed(starterSeed) });
    setStarterAttempted(false);
    setBlockmons([starter]);
    setAdventureSelection([starter.id]);
    setPvpSelection([starter.id]);
    setDnaVault([
      { dna: starter.dna, species: starter.species, seed: starter.seed, status: "활성", acquiredAt: new Date().toISOString(), note: "가입 보상" },
    ]);
    appendSeed(formatSeed(starterSeed), "Starter DNA");
    setSystemMessage({ key: "system.starterCreated" });
    setCurrentPage("home");
  };

  return { registerUser };
}


