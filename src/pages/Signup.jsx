import React, { useState } from 'react'

export default function Signup({ onRegister }) {
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      return
    }
    setError('')
    onRegister(nickname.trim())
  }

  return (
    <div className="page page--signup">
      <header className="page__header">
        <h1>BLOCKMON BATTLE</h1>
        <p className="page__subtitle">당신만의 랜덤 시드를 받아 첫 번째 블록몬 DNA를 생성하세요.</p>
      </header>

      <section className="signup__card">
        <p>
          랜덤 시드로 생성된 DNA는 고유성을 보장하며, 첫 블록몬과 함께 10개의 BM 토큰을 지급합니다.
          모험과 배틀을 통해 토큰과 새로운 DNA를 수집하고 인벤토리를 확장하세요.
        </p>

        <form className="signup__form" onSubmit={handleSubmit}>
          <label>
            수호자 닉네임
            <input
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="예: 심해탐험가"
            />
          </label>
          {error && <p className="signup__error">{error}</p>}
          <button type="submit">DNA 생성하고 입장</button>
        </form>
      </section>

      <section className="signup__info">
        <h2>시작 안내</h2>
        <ul>
          <li>✅ 랜덤 u64 시드 기반 고유 DNA 발급</li>
          <li>✅ 스타터 블록몬 1마리 + BM 토큰 10개 지급</li>
          <li>✅ 모험 시작 시 토큰 1개 소모, 배틀 승리 시 추가 보상</li>
          <li>✅ 동일 종족 2마리 합성 → 새로운 DNA + 능력치 강화</li>
        </ul>
      </section>
    </div>
  )
}
