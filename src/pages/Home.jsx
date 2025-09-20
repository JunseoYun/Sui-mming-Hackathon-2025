import React, { useMemo, useState } from 'react'
import BlockmonCard from '../components/BlockmonCard'
import TokenBalance from '../components/TokenBalance'
import { translateSpecies } from '../i18n'

export default function Home({ gameState, actions }) {
  const {
    player,
    tokens,
    potions,
    blockmons,
    dnaVault,
    seedHistory,
    adventure,
    adventureSelection,
    language,
    t,
  } = gameState

  const [error, setError] = useState('')
  const [showPotionChooser, setShowPotionChooser] = useState(false)
  const selectedTeam = adventureSelection ?? []
  const teamSize = selectedTeam.length

  const selectedBlockmons = useMemo(
    () =>
      selectedTeam
        .map((id) => blockmons.find((blockmon) => blockmon.id === id))
        .filter(Boolean),
    [selectedTeam, blockmons],
  )

  const potionOptions = useMemo(() => {
    const maxCarry = Math.min(potions, teamSize)
    return Array.from({ length: maxCarry + 1 }, (_, count) => count)
  }, [potions, teamSize])

  const handleStartAdventure = () => {
    setError('')
    if (tokens < 1) {
      setError(t('errors.noTokensAdventure'))
      return
    }
    if (teamSize === 0) {
      setError(t('errors.selectTeam'))
      return
    }
    if (!blockmons.length) {
      setError(t('errors.noBlockmon'))
      return
    }

    const maxCarry = Math.min(potions, teamSize)
    if (maxCarry > 0) {
      setShowPotionChooser(true)
      return
    }

    const result = actions.startAdventure(selectedTeam, 0)
    if (result?.error) {
      setError(result.error)
    }
  }

  const launchAdventure = (potionCount) => {
    const result = actions.startAdventure(selectedTeam, potionCount)
    if (result?.error) {
      setError(result.error)
      return
    }
    setError('')
    setShowPotionChooser(false)
  }

  const handleToggleMember = (blockmon) => {
    setError('')
    const existingIndex = selectedTeam.indexOf(blockmon.id)
    if (existingIndex !== -1) {
      actions.setAdventureSelection(
        selectedTeam.filter((id) => id !== blockmon.id),
      )
      return
    }

    if (teamSize >= 4) {
      const [, ...rest] = selectedTeam
      actions.setAdventureSelection([...rest, blockmon.id])
      return
    }

    actions.setAdventureSelection([...selectedTeam, blockmon.id])
  }

  const handleClearSelection = () => {
    setError('')
    actions.setAdventureSelection([])
  }

  return (
    <div className="page page--home">
      <header className="page__header">
        <h1>{t('home.title', { name: player.nickname })}</h1>
        <p className="page__subtitle">{t('home.subtitle')}</p>
        <div className="home__language-toggle">
          <button
            className={language === 'ko' ? 'is-active' : ''}
            onClick={() => actions.setLanguage('ko')}
          >
            {t('home.language.korean')}
          </button>
          <button
            className={language === 'en' ? 'is-active' : ''}
            onClick={() => actions.setLanguage('en')}
          >
            {t('home.language.english')}
          </button>
        </div>
      </header>

      <TokenBalance
        tokens={tokens}
        dnaCount={dnaVault.length}
        activeCount={blockmons.length}
        seedCount={seedHistory.length}
        potionCount={potions}
        t={t}
        language={language}
      />

      <section>
        <h2>{t('home.section.blockmons')}</h2>
        {blockmons.length === 0 && <p>{t('home.noBlockmons')}</p>}
        {blockmons.length > 0 && (
          <div className="home__team-toolbar">
            <span>{t('home.selectedCount', { count: teamSize })}</span>
            <button
              onClick={handleClearSelection}
              disabled={teamSize === 0}
              className="home__clear"
            >
              {t('home.clearSelection')}
            </button>
          </div>
        )}
        {blockmons.length > 0 && (
          <div className="blockmon-grid">
            {blockmons.map((blockmon) => {
              const selectedIndex = selectedTeam.indexOf(blockmon.id)
              return (
                <BlockmonCard
                  key={blockmon.id}
                  blockmon={blockmon}
                  selectable
                  isSelected={selectedIndex !== -1}
                  order={selectedIndex}
                  onSelect={handleToggleMember}
                  language={language}
                  t={t}
                />
              )
            })}
          </div>
        )}
        {selectedBlockmons.length > 0 && (
          <div className="home__team-summary">
            <span>{t('home.selection.summaryLead', { count: selectedBlockmons.length })}</span>
            {selectedBlockmons.map((blockmon, index) => (
              <span key={blockmon.id}>
                {index + 1}. {blockmon.name} · {translateSpecies(blockmon.species, language)}
              </span>
            ))}
          </div>
        )}
      </section>

      {error && <p className="page__error">{error}</p>}

      <section className="actions">
        <button onClick={handleStartAdventure} disabled={teamSize === 0 || tokens < 1}>
          {t('home.actions.startAdventure')}
        </button>
        <button onClick={() => actions.navigate('fusion')}>{t('home.actions.dnaFusion')}</button>
        <button onClick={() => actions.navigate('pvp')}>{t('home.actions.pvp')}</button>
        <button onClick={() => actions.navigate('inventory')}>{t('home.actions.inventory')}</button>
      </section>

      {showPotionChooser && (
        <div className="home__overlay" role="dialog" aria-modal="true">
          <div className="home__overlay-backdrop" onClick={() => setShowPotionChooser(false)} />
          <div className="home__overlay-content">
            <button
              type="button"
              className="home__overlay-close"
              onClick={() => setShowPotionChooser(false)}
              aria-label={language === 'en' ? 'Close' : '닫기'}
            >
              ×
            </button>
            <h3>{t('home.potionSelect.title')}</h3>
            <p>
              {t('home.potionSelect.subtitle', {
                stock: potions,
                max: Math.min(potions, teamSize),
              })}
            </p>
            <div className="home__overlay-options">
              {potionOptions.map((count) => (
                <button key={count} onClick={() => launchAdventure(count)}>
                  {count === 0
                    ? t('home.potionSelect.optionNone')
                    : t('home.potionSelect.option', { count })}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="home__overlay-cancel"
              onClick={() => setShowPotionChooser(false)}
            >
              {t('home.potionSelect.cancel')}
            </button>
          </div>
        </div>
      )}

      {adventure && (
        <section>
          <h2>{t('home.activeAdventure.title')}</h2>
          <p>
            {t('home.activeAdventure.summary', {
              active: adventure.team.filter((member) => !member.knockedOut).length,
              total: adventure.team.length,
              potions: adventure.potionsRemaining ?? adventure.potionsCarried ?? 0,
              spent: adventure.tokensSpent,
              captured: adventure.capturedCount ?? 0,
            })}
          </p>
          <button onClick={() => actions.navigate('adventure')}>
            {t('inventory.adventure.button')}
          </button>
        </section>
      )}
    </div>
  )
}
