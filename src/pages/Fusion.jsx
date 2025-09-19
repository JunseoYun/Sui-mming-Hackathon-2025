import React, { useMemo, useState } from 'react'
import BlockmonCard from '../components/BlockmonCard'
import { translateSpecies } from '../i18n'

export default function Fusion({ gameState, actions }) {
  const { blockmons, tokens, language, t } = gameState
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

      if (!current.length) {
        return [blockmon.id]
      }

      const firstSelected = blockmons.find((candidate) => candidate.id === current[0])
      if (firstSelected && firstSelected.species !== blockmon.species) {
        return [blockmon.id]
      }

      return [...current, blockmon.id]
    })
  }

  const selectedBlockmons = useMemo(
    () => blockmons.filter((blockmon) => selected.includes(blockmon.id)),
    [blockmons, selected]
  )

  const preview = useMemo(() => {
    const [first, second] = selectedBlockmons
    if (!first || !second) return null
    if (first.species !== second.species) return null
    const stats = {}
    Object.keys(first.stats).forEach((key) => {
      stats[key] = Math.round((first.stats[key] + second.stats[key]) / 2 + 1)
    })
    return {
      id: 'preview',
      name: `${translateSpecies(first.species, language)} Prototype`,
      species: first.species,
      dna: 'PREVIEW',
      hp: Math.round((first.hp + second.hp) / 2 + 10),
      stats,
      rank: 'Preview',
      origin: '합성 DNA',
      temperament: '합성으로 각성한 유전자',
      power: Math.round((first.power + second.power) / 2)
    }
  }, [selectedBlockmons, language, t])

  const performFusion = () => {
    if (selectedBlockmons.length < 2) {
      setError(t('fusion.error.selectTwo'))
      return
    }
    const [first, second] = selectedBlockmons
    if (first.species !== second.species) {
      setError(t('fusion.error.sameSpecies'))
      return
    }

    const result = actions.performFusion(first.id, second.id)
    if (result?.error) {
      setError(result.error)
    } else {
      const remaining = selected.filter((id) => id !== first.id && id !== second.id)
      setSelected(remaining)
      const newborn = result.newborn?.result ?? result.newborn
      const newbornName = newborn?.name ?? t('fusion.alert.title', { name: 'Blockmon' })
      setResultMessage(t('fusion.result.message', { name: newbornName }))
      if (typeof window !== 'undefined') {
        const dnaInfo = newborn?.dna ? `\n${t('fusion.alert.dna', { dna: newborn.dna })}` : ''
        window.alert(`${t('fusion.alert.title', { name: newbornName })}${dnaInfo}`)
      }
    }
  }

  return (
    <div className="page page--fusion">
      <header className="page__header">
        <h1>{t('fusion.title')}</h1>
        <p className="page__subtitle">{t('fusion.subtitle')}</p>
      </header>

      <section>
        <h2>{t('fusion.section.blockmons')}</h2>
        <p>{t('fusion.tokens', { value: tokens })}</p>
        <div className="blockmon-grid">
          {blockmons.map((blockmon) => (
            <BlockmonCard
              key={blockmon.id}
              blockmon={blockmon}
              selectable
              isSelected={selected.includes(blockmon.id)}
              onSelect={handleSelect}
              language={language}
              t={t}
            />
          ))}
        </div>
        {selectedBlockmons.length > 0 && (
          <div className="fusion__selection">
            <p>{t('fusion.selection.lead', { count: selectedBlockmons.length })}</p>
            <ol>
              {selectedBlockmons.map((blockmon, index) => (
                <li key={blockmon.id}>
                  {index + 1}. {blockmon.name} · {translateSpecies(blockmon.species, language)}
                </li>
              ))}
            </ol>
            {selectedBlockmons.length > 2 && <p>{t('fusion.selection.notice')}</p>}
          </div>
        )}
      </section>

      {preview && (
        <section className="fusion__preview">
          <h2>{t('fusion.preview.title')}</h2>
          <BlockmonCard blockmon={preview} language={language} t={t} />
        </section>
      )}

      {error && <p className="page__error">{error}</p>}
      {resultMessage && <p>{resultMessage}</p>}

      <div className="fusion__actions">
        <button onClick={performFusion} disabled={tokens < 1 || selectedBlockmons.length < 2}>
          {t('fusion.button.execute')}
        </button>
        <button onClick={() => actions.navigate('home')}>{t('fusion.button.home')}</button>
      </div>
    </div>
  )
}
