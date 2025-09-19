import React from 'react'
import BlockmonCard from '../components/BlockmonCard'
import BattleLog from '../components/BattleLog'

export default function Battle({ gameState, actions }) {
  const { battle } = gameState

  if (!battle) {
    return (
      <div className="page page--battle">
        <header className="page__header">
          <h1>배틀 정보</h1>
          <p className="page__subtitle">현재 진행 중인 PVE 배틀이 없습니다.</p>
        </header>
        <button onClick={() => actions.navigate('adventure')}>모험 보기</button>
      </div>
    )
  }

  return (
    <div className="page page--battle">
      <header className="page__header">
        <h1>PVE 배틀</h1>
        <p className="page__subtitle">야생과의 전투 결과를 기록합니다.</p>
      </header>

      <div className="battle__meta">
        <span>소모 토큰: {battle.tokensSpent}</span>
        <span>보상 토큰: {battle.tokensReward}</span>
        <span>결과: {battle.outcome === 'win' ? '승리' : '패배'}</span>
      </div>

      <div className="battle__arena">
        <div className="battle__side">
          <h2>내 블록몬</h2>
          <BlockmonCard blockmon={battle.player} />
        </div>
        <div className="battle__versus">VS</div>
        <div className="battle__side">
          <h2>야생 블록몬</h2>
          <BlockmonCard blockmon={battle.opponent} />
        </div>
      </div>

      <BattleLog entries={battle.logEntries} />

      <div className="page__footer-actions">
        <button onClick={() => actions.navigate('adventure')}>모험 이어가기</button>
        <button onClick={() => actions.navigate('home')}>홈으로</button>
      </div>
    </div>
  )
}
