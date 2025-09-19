import React, { useState } from 'react'
import BlockmonCard from '../components/BlockmonCard'
import TokenBalance from '../components/TokenBalance'

export default function Home({ gameState, actions }) {
  const { player, tokens, blockmons, dnaVault, seedHistory, adventure } = gameState
  const [error, setError] = useState('')

  const handleStartAdventure = () => {
    const result = actions.startAdventure()
    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <div className="page page--home">
      <header className="page__header">
        <h1>환영합니다, {player.nickname}님</h1>
        <p className="page__subtitle">랜덤 DNA로 탄생한 블록몬 팀을 성장시키고 SUI 바다를 정복하세요.</p>
      </header>

      <TokenBalance
        tokens={tokens}
        dnaCount={dnaVault.length}
        activeCount={blockmons.length}
        seedCount={seedHistory.length}
      />

      <section>
        <h2>내 블록몬</h2>
        {blockmons.length === 0 && <p>아직 보유한 블록몬이 없습니다. DNA를 합성하거나 모험에서 확보하세요.</p>}
        <div className="blockmon-grid">
          {blockmons.map((blockmon) => (
            <BlockmonCard key={blockmon.id} blockmon={blockmon} />
          ))}
        </div>
      </section>

      {error && <p className="page__error">{error}</p>}

      <section className="actions">
        <button onClick={handleStartAdventure}>모험 시작 (1 BM)</button>
        <button onClick={() => actions.navigate('fusion')}>DNA 합성</button>
        <button onClick={() => actions.navigate('battle')} disabled={!adventure}>
          현재 배틀
        </button>
        <button onClick={() => actions.navigate('pvp')}>PVP 배틀</button>
        <button onClick={() => actions.navigate('inventory')}>인벤토리</button>
      </section>

      {adventure && (
        <section>
          <h2>진행 중인 모험</h2>
          <p>
            {adventure.team.filter((member) => !member.knockedOut).length} / {adventure.team.length} 명 활동 중 · 포션 {adventure.potions}개 · 총 사용 토큰 {adventure.tokensSpent}
          </p>
          <button onClick={() => actions.navigate('adventure')}>모험 로그 보기</button>
        </section>
      )}
    </div>
  )
}
