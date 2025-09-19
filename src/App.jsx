import React, { useMemo, useState } from 'react'
import Adventure from './pages/Adventure'
import Battle from './pages/Battle'
import Fusion from './pages/Fusion'
import Home from './pages/Home'
import Inventory from './pages/Inventory'
import Pvp from './pages/Pvp'
import Signup from './pages/Signup'
import {
  createBlockmonFromSeed,
  fuseBlockmons,
  generateSeed,
  rollBattleOutcome,
  formatSeed
} from './utils/random'
import {
  translate,
  translateSpecies,
  translateTemperament,
  translateOrigin,
  translateAction,
  translateDetail,
  translateStatus,
  translateNote
} from './i18n'
import './App.css'
import './index.css'

const pages = {
  home: { labelKey: 'nav.home', component: Home },
  adventure: { labelKey: 'nav.adventure', component: Adventure },
  battle: { labelKey: 'nav.battle', component: Battle },
  fusion: { labelKey: 'nav.fusion', component: Fusion },
  pvp: { labelKey: 'nav.pvp', component: Pvp },
  inventory: { labelKey: 'nav.inventory', component: Inventory }
}

function formatLogTime(language, offsetMinutes = 0) {
  const base = new Date(Date.now() + offsetMinutes * 60_000)
  const locale = language === 'en' ? 'en-US' : 'ko-KR'
  return base.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function assembleBattleLog(
  rounds,
  outcome,
  startOffset = 0,
  language,
  playerActor,
  opponentActor,
  playerDisplayName,
  opponentDisplayName
) {
  const playerDisplay = translateSpecies(playerDisplayName, language) || playerDisplayName
  const opponentDisplay = translateSpecies(opponentDisplayName, language) || opponentDisplayName

  const entries = rounds.map((round, index) => {
    const isPlayer = round.actor === playerActor
    const action = translateAction(round.action, language)
    const detail = translateDetail(round.detail, language)
    const message = translate(language, isPlayer ? 'battleLog.entry.player' : 'battleLog.entry.opponent', {
      name: isPlayer ? playerDisplay : opponentDisplay,
      action,
      detail,
      target: isPlayer ? opponentDisplay : playerDisplay,
      hp: round.opponentHp
    })
    return {
      time: formatLogTime(language, startOffset + index),
      actorType: isPlayer ? 'player' : 'opponent',
      message
    }
  })

  const summaryKey = outcome === 'win' ? 'battleLog.summary.win' : 'battleLog.summary.defeat'
  entries.push({
    time: formatLogTime(language, startOffset + rounds.length + 1),
    message: translate(language, summaryKey)
  })
  return entries
}

function App() {
  const [player, setPlayer] = useState(null)
  const [tokens, setTokens] = useState(0)
  const [blockmons, setBlockmons] = useState([])
  const [dnaVault, setDnaVault] = useState([])
  const [seedHistory, setSeedHistory] = useState([])
  const [adventure, setAdventure] = useState(null)
  const [battle, setBattle] = useState(null)
  const [battleHistory, setBattleHistory] = useState([])
  const [fusionHistory, setFusionHistory] = useState([])
  const [pvpHistory, setPvpHistory] = useState([])
  const [currentPage, setCurrentPage] = useState('home')
  const [systemMessage, setSystemMessage] = useState('')
  const [adventureSelection, setAdventureSelection] = useState([])
  const [language, setLanguage] = useState('ko')

  const t = (key, params) => translate(language, key, params)

  const appendSeed = (seedHex, context) => {
    setSeedHistory((prev) => [
      ...prev,
      {
        seed: seedHex,
        context,
        timestamp: new Date().toISOString()
      }
    ])
  }

  const registerUser = (nickname) => {
    const starterSeed = generateSeed()
    const starter = createBlockmonFromSeed(starterSeed, { origin: '스타터 DNA' })
    setPlayer({ nickname, joinedAt: new Date().toISOString(), starterSeed: formatSeed(starterSeed) })
    setTokens(10)
    setBlockmons([starter])
    setAdventureSelection([starter.id])
    setDnaVault([
      {
        dna: starter.dna,
        species: starter.species,
        seed: starter.seed,
        status: '활성',
        acquiredAt: new Date().toISOString(),
        note: '가입 보상'
      }
    ])
    appendSeed(formatSeed(starterSeed), 'Starter DNA')
    setSystemMessage(t('system.starterCreated'))
    setCurrentPage('home')
  }

  const navigate = (pageKey) => {
    if (pages[pageKey]) {
      setCurrentPage(pageKey)
      setSystemMessage('')
    }
  }

  const startAdventure = (selectedIdsParam) => {
    if (!blockmons.length) return { error: t('errors.noBlockmon') }
    if (tokens < 1) return { error: t('errors.noTokensAdventure') }

    const selectedIds = (selectedIdsParam ?? adventureSelection).slice(0, 4)
    if (!selectedIds.length) {
      return { error: t('errors.selectTeam') }
    }

    const team = selectedIds
      .map((id) => blockmons.find((mon) => mon.id === id))
      .filter(Boolean)
      .slice(0, 4)

    if (!team.length) {
      return { error: t('errors.missingSelected') }
    }

    if (selectedIds.length !== team.length) {
      setAdventureSelection(team.map((mon) => mon.id))
    }
    const seed = generateSeed()
    const seedHex = formatSeed(seed)
    const startedAt = new Date()
    const potions = Math.min(4, Math.max(1, Math.floor(team.reduce((acc, mon) => acc + mon.stats.con, 0) / 40)))

    const teamRecords = team.map((mon) => ({
      id: mon.id,
      dna: mon.dna,
      species: mon.species,
      name: mon.name,
      remainingHp: mon.hp,
      knockedOut: false
    }))

    let logs = [{ time: formatLogTime(language), message: t('adventure.log.start', { count: team.length }) }]
    const battleRecords = []
    const capturedMonsters = []
    let defeats = 0
    let tokensEarned = 0
    let offset = 1

    appendSeed(seedHex, 'Adventure Start')

    while (teamRecords.some((member) => !member.knockedOut)) {
      const activeMember = teamRecords.find((member) => !member.knockedOut)
      if (!activeMember) break

      const baseMon = blockmons.find((mon) => mon.id === activeMember.id) ?? team.find((mon) => mon.id === activeMember.id)
      if (!baseMon) {
        activeMember.knockedOut = true
        continue
      }
      const playerMon = { ...baseMon, hp: activeMember.remainingHp }
      const battleSeed = generateSeed()
      const battleSeedHex = formatSeed(battleSeed)
      const wild = createBlockmonFromSeed(battleSeed, { origin: '야생 조우' })
      const result = rollBattleOutcome(playerMon, wild, battleSeed)

      const encounterEntry = {
        time: formatLogTime(language, offset++),
        message: t('adventure.log.encounter', { species: translateSpecies(wild.species, language) })
      }

      const battleLogEntries = assembleBattleLog(
        result.rounds,
        result.outcome,
        offset,
        language,
        playerMon.species,
        wild.species,
        playerMon.name ?? playerMon.species,
        wild.name ?? wild.species
      )
      const logCount = battleLogEntries.length
      offset += logCount + 1

      let battleEntryLog = [encounterEntry, ...battleLogEntries]
      logs = [...logs, ...battleEntryLog]

      const reward = result.outcome === 'win' ? 2 : 0
      tokensEarned += reward
      defeats += result.outcome === 'win' ? 0 : 1
      activeMember.remainingHp = result.remainingHp
      activeMember.knockedOut = result.outcome !== 'win'

      if (result.outcome === 'win') {
        const captured = {
          ...wild,
          id: wild.id,
          stats: { ...wild.stats },
          origin: '포획된 야생 블록몬'
        }
        capturedMonsters.push(captured)
        const captureMessage = {
          time: formatLogTime(language, offset++),
          message: t('adventure.log.capture', { species: translateSpecies(wild.species, language) })
        }
        logs.push(captureMessage)
        battleEntryLog = [...battleEntryLog, captureMessage]
      }

      appendSeed(battleSeedHex, `Wild Battle #${battleRecords.length + 1}`)

      const completedAt = new Date().toISOString()
      const playerSnapshot = { ...playerMon, hp: result.remainingHp }
      const opponentSnapshot = { ...wild, hp: result.opponentRemainingHp }

      battleRecords.push({
        id: `battle-${battleSeedHex}`,
        seed: battleSeedHex,
        player: playerSnapshot,
        opponent: opponentSnapshot,
        outcome: result.outcome,
        logEntries: battleEntryLog,
        tokensSpent: 0,
        tokensReward: reward,
        completedAt
      })
    }

    logs.push({ time: formatLogTime(language, offset), message: t('adventure.log.complete') })

    const adventureState = {
      id: `adv-${seedHex}`,
      seed: seedHex,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      team: teamRecords,
      potions,
      logs,
      status: 'complete',
      tokensSpent: 1,
      tokensEarned,
      defeats,
      battles: battleRecords.length,
      capturedCount: capturedMonsters.length
    }

    if (capturedMonsters.length) {
      setBlockmons((prev) => [...prev, ...capturedMonsters])
      setDnaVault((prev) => [
        ...prev,
        ...capturedMonsters.map((mon) => ({
          dna: mon.dna,
          species: mon.species,
          seed: mon.seed,
          status: '활성',
          acquiredAt: new Date().toISOString(),
          note: '모험 포획'
        }))
      ])
    }

    setTokens((prev) => prev - 1 + tokensEarned)
    setAdventure(adventureState)
    setBattle(battleRecords[battleRecords.length - 1] ?? null)
    setBattleHistory((prev) => [...prev, ...battleRecords])
    setSystemMessage(t('system.adventureSummary', {
      battles: battleRecords.length,
      captured: capturedMonsters.length,
      tokens: tokensEarned
    }))
    setCurrentPage('adventure')
    return { success: true }
  }

  const performFusion = (firstId, secondId) => {
    if (firstId === secondId) {
      return { error: t('errors.sameBlockmon') }
    }
    const first = blockmons.find((mon) => mon.id === firstId)
    const second = blockmons.find((mon) => mon.id === secondId)
    if (!first || !second) {
      return { error: t('errors.missingSelected') }
    }
    if (first.species !== second.species) {
      return { error: t('errors.sameSpeciesFusion') }
    }
    if (tokens < 1) {
      return { error: t('errors.noTokensFusion') }
    }

    const fusionSeed = generateSeed()
    const newborn = fuseBlockmons([first, second], fusionSeed)

    setTokens((prev) => prev - 1)
    setBlockmons((prev) => [
      ...prev.filter((mon) => mon.id !== firstId && mon.id !== secondId),
      newborn
    ])
    setAdventureSelection((prev) => prev.filter((id) => id !== firstId && id !== secondId))
    setDnaVault((prev) => [
      ...prev.filter((entry) => entry.seed !== (first.seed ?? first.id) && entry.seed !== (second.seed ?? second.id)),
      {
        dna: newborn.dna,
        species: newborn.species,
        seed: newborn.seed,
        status: '보관',
        acquiredAt: new Date().toISOString(),
        note: '합성 결과'
      }
    ])
    appendSeed(formatSeed(fusionSeed), 'Fusion Result')

    const record = {
      id: `fusion-${newborn.seed}`,
      result: newborn,
      parents: [first, second],
      createdAt: new Date().toISOString()
    }
    setFusionHistory((prev) => [...prev, record])
    setSystemMessage(t('system.fusionCreated'))
    return { success: true, newborn: record }
  }

  const runPvpMatch = () => {
    if (!blockmons.length) return { error: t('errors.noBlockmonPvp') }
    if (tokens < 3) return { error: t('errors.noTokensPvp') }

    const contender = blockmons[0]
    const opponentSeed = generateSeed()
    const opponent = createBlockmonFromSeed(opponentSeed, { origin: 'PVP 상대' })
    const result = rollBattleOutcome(contender, opponent, opponentSeed)
    const logs = assembleBattleLog(
      result.rounds,
      result.outcome,
      0,
      language,
      contender.species,
      opponent.species,
      contender.name ?? contender.species,
      opponent.name ?? opponent.species
    )

    const stake = 3
    const reward = result.outcome === 'win' ? 5 : 0
    const fee = result.outcome === 'win' ? 1 : 0
    const netTokens = reward - fee - stake

    setTokens((prev) => prev + netTokens)
    appendSeed(formatSeed(opponentSeed), 'PVP Match')

    const record = {
      id: `pvp-${formatSeed(opponentSeed)}`,
      player: contender,
      opponent,
      outcome: result.outcome,
      logs,
      tokensStaked: stake,
      tokensReward: reward,
      fee,
      netTokens,
      completedAt: new Date().toISOString()
    }

    setPvpHistory((prev) => [...prev, record])
    setSystemMessage(result.outcome === 'win' ? t('system.pvpWin') : t('system.pvpLose'))
    setCurrentPage('pvp')
    return { success: true, record }
  }

  const gameState = useMemo(
    () => ({
      player,
      tokens,
      blockmons,
      dnaVault,
      seedHistory,
      adventure,
      battle,
      battleHistory,
      fusionHistory,
      pvpHistory,
      systemMessage,
      adventureSelection,
      language,
      t
    }),
    [
      player,
      tokens,
      blockmons,
      dnaVault,
      seedHistory,
      adventure,
      battle,
      battleHistory,
      fusionHistory,
      pvpHistory,
      systemMessage,
      adventureSelection,
      language,
      t
    ]
  )

  const actions = {
    navigate,
    startAdventure,
    performFusion,
    runPvpMatch,
    registerUser,
    setAdventureSelection,
    setLanguage
  }

  if (!player) {
    return (
      <div className="app">
        <Signup onRegister={registerUser} language={language} t={t} setLanguage={setLanguage} />
      </div>
    )
  }

  const CurrentComponent = pages[currentPage]?.component ?? Home

  return (
    <div className="app">
      <header className="app__top">
        <span className="app__brand">{t('app.brand')}</span>
        <nav className="app__nav">
          {Object.entries(pages).map(([key, { labelKey }]) => (
            <button
              key={key}
              className={currentPage === key ? 'is-active' : ''}
              onClick={() => navigate(key)}
            >
              {t(labelKey)}
            </button>
          ))}
        </nav>
      </header>

      {systemMessage && <div className="app__notice">{systemMessage}</div>}

      <main className="app__content">
        <CurrentComponent gameState={gameState} actions={actions} />
      </main>
    </div>
  )
}

export default App
