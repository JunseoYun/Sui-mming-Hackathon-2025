import React from 'react'
import BlockmonCard from '../components/BlockmonCard'
import BattleLog from '../components/BattleLog'

export default function Battle({ gameState, actions }) {
  const { battle, language, t } = gameState

  if (!battle) {
    return (
      <div className="page page--battle">
        <header className="page__header">
          <h1>{t('battle.infoTitle')}</h1>
          <p className="page__subtitle">{t('battle.infoSubtitle')}</p>
        </header>
        <button onClick={() => actions.navigate('adventure')}>{t('inventory.adventure.button')}</button>
      </div>
    )
  }

  const resultLabel = battle.outcome === 'win' ? t('battle.meta.result.win') : t('battle.meta.result.defeat')

  return (
    <div className="page page--battle">
      <header className="page__header">
        <h1>{t('battle.title')}</h1>
        <p className="page__subtitle">{t('battle.subtitle')}</p>
      </header>

      <div className="battle__meta">
        <span>{t('battle.meta.spent', { value: battle.tokensSpent })}</span>
        <span>{t('battle.meta.reward', { value: battle.tokensReward })}</span>
        <span>{resultLabel}</span>
      </div>

      <div className="battle__arena">
        <div className="battle__side">
          <h2>{t('battleLog.actor.player')}</h2>
          <BlockmonCard blockmon={battle.player} language={language} t={t} />
        </div>
        <div className="battle__versus">VS</div>
        <div className="battle__side">
          <h2>{t('battleLog.actor.opponent')}</h2>
          <BlockmonCard blockmon={battle.opponent} language={language} t={t} />
        </div>
      </div>

      <BattleLog entries={battle.logEntries} t={t} />

      <div className="page__footer-actions">
        <button onClick={() => actions.navigate('adventure')}>{t('battle.button.adventure')}</button>
        <button onClick={() => actions.navigate('home')}>{t('battle.button.home')}</button>
      </div>
    </div>
  )
}
