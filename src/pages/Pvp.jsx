import React, { useMemo, useState } from 'react'
import BattleLog from '../components/BattleLog'

export default function Pvp({ gameState, actions }) {
  const { blockmons, tokens, pvpHistory } = gameState
  const [error, setError] = useState('')

  const latest = useMemo(() => (pvpHistory.length ? pvpHistory[pvpHistory.length - 1] : null), [pvpHistory])

  const handleMatch = () => {
    const result = actions.runPvpMatch()
    if (result?.error) {
      setError(result.error)
    } else {
      setError('')
    }
  }

  return (
    <div className="page page--pvp">
      <header className="page__header">
        <h1>PVP 매칭</h1>
        <p className="page__subtitle">3 BM 토큰을 배팅하여 다른 수호자와 전투하세요. 승리 시 5 BM 획득, 1 BM 수수료 차감.</p>
      </header>

      <section className="pvp__status">
        <div className="pvp__card">
          <h2>출전 정보</h2>
          {blockmons.length ? (
            <p>{blockmons[0].name} · {blockmons[0].species}</p>
          ) : (
            <p>출전 가능한 블록몬이 없습니다.</p>
          )}
          <p>보유 토큰: {tokens} BM</p>
        </div>
        <div className="pvp__card">
          <h2>배팅 규칙</h2>
          <ul>
            <li>배팅: 3 BM</li>
            <li>승리 보상: 5 BM, 플랫폼 수수료 1 BM</li>
            <li>순이익(승리 기준): +1 BM</li>
            <li>패배 시 배팅 토큰 소멸</li>
          </ul>
        </div>
        <div className="pvp__card">
          <h2>최근 전적</h2>
          {latest ? (
            <ul>
              <li>결과: {latest.outcome === 'win' ? '승리' : '패배'}</li>
              <li>상대: {latest.opponent.name}</li>
              <li>배팅: {latest.tokensStaked} BM</li>
              <li>보상: {latest.tokensReward} BM</li>
              <li>수수료: {latest.fee} BM</li>
              <li>순이익: {latest.netTokens >= 0 ? '+' : ''}{latest.netTokens} BM</li>
            </ul>
          ) : (
            <p>아직 PVP 전적이 없습니다.</p>
          )}
        </div>
      </section>

      {error && <p className="page__error">{error}</p>}

      <div className="pvp__actions">
        <button onClick={handleMatch}>PVP 배틀 매칭 (3 BM)</button>
        <button onClick={() => actions.navigate('home')}>홈으로</button>
      </div>

      {latest && <BattleLog entries={latest.logs} />}
    </div>
  )
}
