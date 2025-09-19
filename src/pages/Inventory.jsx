import React from 'react'

function formatDate(value) {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function Inventory({ gameState, actions }) {
  const { blockmons, dnaVault, seedHistory, adventure, fusionHistory, battleHistory, pvpHistory } = gameState

  return (
    <div className="page page--inventory">
      <header className="page__header">
        <h1>인벤토리 & 진행 상황</h1>
        <p className="page__subtitle">DNA, 시드, 배틀 이력을 한눈에 확인하세요.</p>
      </header>

      <section className="inventory__section">
        <h2>보유 DNA</h2>
        <div className="inventory__list">
          {dnaVault.map((entry) => (
            <div key={entry.seed} className="inventory__card">
              <h3>{entry.species}</h3>
              <p>DNA: {entry.dna}</p>
              <p>상태: {entry.status}</p>
              <p>확보: {formatDate(entry.acquiredAt)}</p>
              <p>{entry.note}</p>
            </div>
          ))}
          {dnaVault.length === 0 && <p>DNA가 아직 없습니다.</p>}
        </div>
      </section>

      <section className="inventory__section">
        <h2>활성 블록몬</h2>
        <ul className="inventory__list inventory__list--simple">
          {blockmons.map((blockmon) => (
            <li key={blockmon.id}>
              {blockmon.name} · {blockmon.species} · 전투력 {blockmon.power}
            </li>
          ))}
          {!blockmons.length && <li>보유한 블록몬이 없습니다.</li>}
        </ul>
      </section>

      <section className="inventory__section">
        <h2>랜덤 시드 기록</h2>
        <ul className="inventory__list inventory__list--simple">
          {seedHistory.map((entry, index) => (
            <li key={`${entry.seed}-${index}`}>
              {formatDate(entry.timestamp)} · {entry.context} · 시드 {entry.seed}
            </li>
          ))}
          {!seedHistory.length && <li>아직 시드 기록이 없습니다.</li>}
        </ul>
      </section>

      <section className="inventory__section">
        <h2>모험 상태</h2>
        {adventure ? (
          <p>
            상태: {adventure.status === 'active' ? '진행 중' : '완료'} · 팀 {adventure.team.length} / 탈진 {adventure.defeats} · 포션 {adventure.potions} · 사용 토큰 {adventure.tokensSpent}
          </p>
        ) : (
          <p>모험 이력이 없습니다.</p>
        )}
        <button onClick={() => actions.navigate('adventure')}>모험 로그 보기</button>
      </section>

      <section className="inventory__section">
        <h2>합성 기록</h2>
        <ul className="inventory__list inventory__list--simple">
          {fusionHistory.map((record) => (
            <li key={record.id}>
              {formatDate(record.createdAt)} · {record.parents[0].name} + {record.parents[1].name} → {record.result.name}
            </li>
          ))}
          {!fusionHistory.length && <li>합성 기록이 없습니다.</li>}
        </ul>
      </section>

      <section className="inventory__section">
        <h2>배틀 기록</h2>
        <ul className="inventory__list inventory__list--simple">
          {battleHistory.map((record) => (
            <li key={record.id}>
              {formatDate(record.completedAt)} · {record.player.name} vs {record.opponent.name} · {record.outcome === 'win' ? '승리' : '패배'} · 토큰 {record.tokensReward - record.tokensSpent} BM
            </li>
          ))}
          {!battleHistory.length && <li>PVE 배틀 기록이 없습니다.</li>}
        </ul>
      </section>

      <section className="inventory__section">
        <h2>PVP 기록</h2>
        <ul className="inventory__list inventory__list--simple">
          {pvpHistory.map((record) => (
            <li key={record.id}>
              {formatDate(record.completedAt)} · {record.player.name} vs {record.opponent.name} · {record.outcome === 'win' ? '승리' : '패배'} · 순이익 {record.netTokens >= 0 ? '+' : ''}{record.netTokens} BM
            </li>
          ))}
          {!pvpHistory.length && <li>PVP 기록이 없습니다.</li>}
        </ul>
      </section>
    </div>
  )
}
