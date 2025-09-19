import React, { useMemo } from 'react'
import BlockmonCard from '../components/BlockmonCard'
import BattleLog from '../components/BattleLog'

export default function Adventure({ gameState, actions }) {
  const { adventure, blockmons } = gameState

  const activeTeam = useMemo(() => {
    if (!adventure) return []
    return adventure.team.map((member) => {
      const base = blockmons.find((mon) => mon.id === member.id)
      if (!base) {
        return {
          id: member.id,
          name: member.name,
          dna: member.dna,
          species: member.species,
          hp: member.remainingHp,
          stats: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
        }
      }
      return { ...base, hp: member.remainingHp }
    })
  }, [adventure, blockmons])

  if (!adventure) {
    return (
      <div className="page page--adventure">
        <header className="page__header">
          <h1>모험 준비</h1>
          <p className="page__subtitle">홈 화면에서 모험을 시작하면 로그가 공유됩니다.</p>
        </header>
        <p>현재 진행 중인 모험이 없습니다.</p>
        <button onClick={() => actions.navigate('home')}>홈으로</button>
      </div>
    )
  }

  return (
    <div className="page page--adventure">
      <header className="page__header">
        <h1>모험 임무</h1>
        <p className="page__subtitle">모험을 시작하면 팀이 모두 탈진할 때까지 야생 블록몬과 연속 전투를 수행합니다.</p>
      </header>

      <div className="adventure__team">
        <div className="adventure__team-header">
          <h2>출전 팀</h2>
          <span>
            포션 {adventure.potions}개 · 사용 토큰 {adventure.tokensSpent} · 획득 토큰 {adventure.tokensEarned}
          </span>
        </div>
        <div className="blockmon-grid blockmon-grid--compact">
          {activeTeam.map((blockmon, index) => (
            <div key={blockmon.id} className={`adventure__member ${adventure.team[index].knockedOut ? 'is-ko' : ''}`}>
              <BlockmonCard blockmon={blockmon} />
              <p className="adventure__status">
                {adventure.team[index].knockedOut ? '탈진' : `잔여 HP ${adventure.team[index].remainingHp}`}
              </p>
            </div>
          ))}
        </div>
      </div>

      <BattleLog entries={adventure.logs} />

      <div className="page__footer-actions">
        <button onClick={() => actions.navigate('home')}>홈으로</button>
      </div>
    </div>
  )
}
