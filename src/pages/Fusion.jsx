import React, { useMemo, useState } from 'react'
import BlockmonCard from '../components/BlockmonCard'

export default function Fusion({ gameState, actions }) {
  const { blockmons, tokens } = gameState
  const [selected, setSelected] = useState([])
  const [error, setError] = useState('')
  const [resultMessage, setResultMessage] = useState('')

  const handleSelect = (blockmon) => {
    setResultMessage('')
    setError('')
    setSelected((current) => {
      if (current.includes(blockmon.id)) {
        return current.filter((id) => id !== blockmon.id)
      }
      if (current.length >= 2) {
        return [current[1], blockmon.id]
      }
      return [...current, blockmon.id]
    })
  }

  const selectedBlockmons = useMemo(
    () => blockmons.filter((blockmon) => selected.includes(blockmon.id)),
    [blockmons, selected]
  )

  const preview = useMemo(() => {
    if (selectedBlockmons.length !== 2) return null
    if (selectedBlockmons[0].species !== selectedBlockmons[1].species) return null
    const [first, second] = selectedBlockmons
    const stats = {}
    Object.keys(first.stats).forEach((key) => {
      stats[key] = Math.round((first.stats[key] + second.stats[key]) / 2 + 1)
    })
    return {
      id: 'preview',
      name: `${first.species} 예측체`,
      species: first.species,
      dna: '예상 DNA',
      hp: Math.round((first.hp + second.hp) / 2 + 10),
      stats,
      rank: '예상',
      origin: `${first.name} / ${second.name} 합성 예상`,
      temperament: '랜덤 시드 적용 예정',
      power: Math.round((first.power + second.power) / 2)
    }
  }, [selectedBlockmons])

  const performFusion = () => {
    if (selectedBlockmons.length !== 2) {
      setError('두 마리의 블록몬을 선택해주세요.')
      return
    }
    const result = actions.performFusion(selectedBlockmons[0].id, selectedBlockmons[1].id)
    if (result?.error) {
      setError(result.error)
    } else {
      setSelected([])
      setResultMessage('합성이 완료되었습니다! 인벤토리에서 결과를 확인하세요.')
    }
  }

  return (
    <div className="page page--fusion">
      <header className="page__header">
        <h1>DNA 합성</h1>
        <p className="page__subtitle">같은 종족의 DNA를 조합해 새로운 블록몬을 탄생시키세요. (비용 1 BM)</p>
      </header>

      <section>
        <h2>보유 블록몬</h2>
        <p>현재 토큰: {tokens} BM</p>
        <div className="blockmon-grid">
          {blockmons.map((blockmon) => (
            <BlockmonCard
              key={blockmon.id}
              blockmon={blockmon}
              selectable
              isSelected={selected.includes(blockmon.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </section>

      {preview && (
        <section className="fusion__preview">
          <h2>예상 결과</h2>
          <BlockmonCard blockmon={preview} />
        </section>
      )}

      {error && <p className="page__error">{error}</p>}
      {resultMessage && <p>{resultMessage}</p>}

      <div className="fusion__actions">
        <button onClick={performFusion} disabled={tokens < 1}>DNA 합성 실행 (1 BM)</button>
        <button onClick={() => actions.navigate('home')}>홈으로</button>
      </div>
    </div>
  )
}
