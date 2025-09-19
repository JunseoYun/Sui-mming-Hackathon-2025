import React, { useMemo, useState } from 'react'
import BlockmonCard from '../components/BlockmonCard'
import TokenBalance from '../components/TokenBalance'
import { translateSpecies } from '../i18n'

export default function Home({ gameState, actions }) {
  const { player, tokens, blockmons, dnaVault, seedHistory, adventure, adventureSelection, language, t } = gameState
  const [error, setError] = useState('')
  const [showPurchase, setShowPurchase] = useState(false)
  const selectedTeam = adventureSelection ?? []

  const selectedBlockmons = useMemo(
    () => selectedTeam.map((id) => blockmons.find((blockmon) => blockmon.id === id)).filter(Boolean),
    [selectedTeam, blockmons]
  )

  const handleStartAdventure = () => {
    const result = actions.startAdventure(selectedTeam)
    if (result?.error) {
      setError(result.error)
    }
  }

  const handleToggleMember = (blockmon) => {
    setError('')
    const alreadySelected = selectedTeam.includes(blockmon.id)
    if (alreadySelected) {
      actions.setAdventureSelection(selectedTeam.filter((id) => id !== blockmon.id))
      return
    }

    if (selectedTeam.length >= 4) {
      setError(t('home.error.maxTeam'))
      return
    }

    actions.setAdventureSelection([...selectedTeam, blockmon.id])
  }

  const handleClearSelection = () => {
    setError('')
    actions.setAdventureSelection([])
  }

  const purchaseOptions = [10, 30, 50, 100]

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
        t={t}
        language={language}
      />

      <div className="home__purchase">
        <button onClick={() => setShowPurchase((prev) => !prev)}>{t('token.purchaseButton')}</button>
        {showPurchase && (
          <div className="home__purchase-panel">
            <p>{t('token.purchaseTitle')}</p>
            <div className="home__purchase-options">
              {purchaseOptions.map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    actions.purchaseTokens(amount)
                    setShowPurchase(false)
                  }}
                >
                  {t('token.purchaseOption', { amount })}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <section>
        <h2>{t('home.section.blockmons')}</h2>
        {blockmons.length === 0 && <p>{t('home.noBlockmons')}</p>}
        {blockmons.length > 0 && (
          <div className="home__team-toolbar">
            <span>{t('home.selectedCount', { count: selectedTeam.length })}</span>
            <button onClick={handleClearSelection} disabled={selectedTeam.length === 0} className="home__clear">
              {t('home.clearSelection')}
            </button>
          </div>
        )}
        {blockmons.length > 0 && (
          <div className="blockmon-grid">
            {blockmons.map((blockmon) => (
              <BlockmonCard
                key={blockmon.id}
                blockmon={blockmon}
                selectable
                isSelected={selectedTeam.includes(blockmon.id)}
                onSelect={handleToggleMember}
                language={language}
                t={t}
              />
            ))}
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
        <button onClick={handleStartAdventure} disabled={selectedTeam.length === 0 || tokens < 1}>
          {t('home.actions.startAdventure')}
        </button>
        <button onClick={() => actions.navigate('fusion')}>{t('home.actions.dnaFusion')}</button>
        <button onClick={() => actions.navigate('battle')} disabled={!adventure}>
          {t('home.actions.currentBattle')}
        </button>
        <button onClick={() => actions.navigate('pvp')}>{t('home.actions.pvp')}</button>
        <button onClick={() => actions.navigate('inventory')}>{t('home.actions.inventory')}</button>
      </section>

      {adventure && (
        <section>
          <h2>{t('home.activeAdventure.title')}</h2>
          <p>
            {t('home.activeAdventure.summary', {
              active: adventure.team.filter((member) => !member.knockedOut).length,
              total: adventure.team.length,
              potions: adventure.potions,
              spent: adventure.tokensSpent,
              captured: adventure.capturedCount ?? 0
            })}
          </p>
          <button onClick={() => actions.navigate('adventure')}>{t('inventory.adventure.button')}</button>
        </section>
      )}
    </div>
  )
}
