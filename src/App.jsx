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
import './App.css'
import './index.css'

const pages = {
  home: { label: '홈', component: Home },
  adventure: { label: '모험', component: Adventure },
  battle: { label: '배틀', component: Battle },
  fusion: { label: 'DNA 합성', component: Fusion },
  pvp: { label: 'PVP', component: Pvp },
  inventory: { label: '인벤토리', component: Inventory }
}

function formatLogTime(offsetMinutes = 0) {
  const base = new Date(Date.now() + offsetMinutes * 60_000)
  return base.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function assembleBattleLog(rounds, outcome, startOffset = 0) {
  const entries = rounds.map((round, index) => ({
    time: formatLogTime(startOffset + index),
    message: `[${round.actor}] ${round.action} (${round.detail}) | 상대 HP ${round.opponentHp}`
  }))

  const summary = outcome === 'win' ? '승리! 야생 블록몬을 제압했습니다.' : '패배… 팀을 재정비하세요.'
  entries.push({ time: formatLogTime(startOffset + rounds.length + 1), message: summary })
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
    setSystemMessage('첫 블록몬 DNA가 생성되었습니다!')
    setCurrentPage('home')
  }

  const navigate = (pageKey) => {
    if (pages[pageKey]) {
      setCurrentPage(pageKey)
      setSystemMessage('')
    }
  }

  const startAdventure = () => {
    if (!blockmons.length) return { error: '보유한 블록몬이 없습니다.' }
    if (tokens < 1) return { error: 'BM 토큰이 부족합니다. (필요: 1)' }

    const team = blockmons.slice(0, 4)
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

    let logs = [{ time: formatLogTime(), message: `${team.length}마리의 블록몬이 모험을 시작했습니다.` }]
    const battleRecords = []
    let defeats = 0
    let tokensEarned = 0
    let offset = 1

    appendSeed(seedHex, 'Adventure Start')

    while (teamRecords.some((member) => !member.knockedOut)) {
      const activeMember = teamRecords.find((member) => !member.knockedOut)
      if (!activeMember) break

      const playerMon = blockmons.find((mon) => mon.id === activeMember.id) ?? team[0]
      const battleSeed = generateSeed()
      const battleSeedHex = formatSeed(battleSeed)
      const wild = createBlockmonFromSeed(battleSeed, { origin: '야생 조우' })
      const result = rollBattleOutcome(playerMon, wild, battleSeed)

      const encounterEntry = {
        time: formatLogTime(offset++),
        message: `야생 ${wild.species}을(를) 조우했습니다.`
      }

      const battleLogEntries = assembleBattleLog(result.rounds, result.outcome, offset)
      const logCount = battleLogEntries.length
      offset += logCount + 1

      logs = [...logs, encounterEntry, ...battleLogEntries]

      const reward = result.outcome === 'win' ? 2 : 0
      tokensEarned += reward
      defeats += result.outcome === 'win' ? 0 : 1
      activeMember.remainingHp = result.remainingHp
      activeMember.knockedOut = result.outcome !== 'win'

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
        logEntries: [encounterEntry, ...battleLogEntries],
        tokensSpent: 0,
        tokensReward: reward,
        completedAt
      })
    }

    logs.push({ time: formatLogTime(offset), message: '팀 전원 탈진. 모험이 종료되었습니다.' })

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
      battles: battleRecords.length
    }

    setTokens((prev) => prev - 1 + tokensEarned)
    setAdventure(adventureState)
    setBattle(battleRecords[battleRecords.length - 1] ?? null)
    setBattleHistory((prev) => [...prev, ...battleRecords])
    setSystemMessage(`모험 완료! 전투 ${battleRecords.length}회, 보상 +${tokensEarned} BM`)
    setCurrentPage('adventure')
    return { success: true }
  }

  const performFusion = (firstId, secondId) => {
    if (firstId === secondId) {
      return { error: '서로 다른 두 블록몬을 선택하세요.' }
    }
    const first = blockmons.find((mon) => mon.id === firstId)
    const second = blockmons.find((mon) => mon.id === secondId)
    if (!first || !second) {
      return { error: '선택한 블록몬을 찾을 수 없습니다.' }
    }
    if (first.species !== second.species) {
      return { error: '같은 종족의 블록몬만 합성할 수 있습니다.' }
    }
    if (tokens < 1) {
      return { error: 'BM 토큰이 부족합니다. (합성 비용: 1)' }
    }

    const fusionSeed = generateSeed()
    const newborn = fuseBlockmons([first, second], fusionSeed)

    setTokens((prev) => prev - 1)
    setBlockmons((prev) => [...prev, newborn])
    setDnaVault((prev) => [
      ...prev,
      {
        dna: newborn.dna,
        species: newborn.species,
        seed: newborn.seed,
        status: '보관',
        acquiredAt: new Date().toISOString(),
        note: `${first.name} + ${second.name} 합성`
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
    setSystemMessage('새로운 블록몬이 탄생했습니다! 인벤토리에서 확인하세요.')
    return { success: true, newborn: record }
  }

  const runPvpMatch = () => {
    if (!blockmons.length) return { error: '출전 가능한 블록몬이 없습니다.' }
    if (tokens < 3) return { error: 'BM 토큰이 부족합니다. (필요: 3)' }

    const contender = blockmons[0]
    const opponentSeed = generateSeed()
    const opponent = createBlockmonFromSeed(opponentSeed, { origin: 'PVP 상대' })
    const result = rollBattleOutcome(contender, opponent, opponentSeed)
    const logs = assembleBattleLog(result.rounds, result.outcome)

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
    setSystemMessage(
      result.outcome === 'win'
        ? 'PVP 매치에서 승리했습니다! (순이익 +1 BM)'
        : 'PVP 매치에서 패배했습니다. 배팅 토큰 3 BM을 잃었습니다.'
    )
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
      systemMessage
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
      systemMessage
    ]
  )

  const actions = {
    navigate,
    startAdventure,
    performFusion,
    runPvpMatch,
    registerUser
  }

  if (!player) {
    return (
      <div className="app">
        <Signup onRegister={registerUser} />
      </div>
    )
  }

  const CurrentComponent = pages[currentPage]?.component ?? Home

  return (
    <div className="app">
      <header className="app__top">
        <span className="app__brand">Blockmon Battle Prototype</span>
        <nav className="app__nav">
          {Object.entries(pages).map(([key, { label }]) => (
            <button
              key={key}
              className={currentPage === key ? 'is-active' : ''}
              onClick={() => navigate(key)}
            >
              {label}
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
