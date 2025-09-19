import React from 'react'

export default function TokenBalance({ tokens, dnaCount, activeCount, seedCount }) {
  return (
    <div className="token-balance">
      <div>
        <span className="token-balance__label">BM 토큰</span>
        <span className="token-balance__value">{tokens.toLocaleString()} 개</span>
      </div>
      <div>
        <span className="token-balance__label">DNA 보관</span>
        <span className="token-balance__value">{dnaCount} 개체</span>
      </div>
      <div>
        <span className="token-balance__label">활성 블록몬</span>
        <span className="token-balance__value">{activeCount} 마리</span>
      </div>
      <div>
        <span className="token-balance__label">시드 기록</span>
        <span className="token-balance__value">{seedCount} 개</span>
      </div>
    </div>
  )
}
