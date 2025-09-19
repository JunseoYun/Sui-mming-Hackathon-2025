import React, { useMemo, useState } from 'react'
import BattleLog from '../components/BattleLog'
import { translateSpecies } from '../i18n'

export default function Pvp({ gameState, actions }) {
  const { blockmons, tokens, pvpHistory, language, t } = gameState
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

  const primaryBlockmon = blockmons[0]

  return (
    <div className="page page--pvp">
      <header className="page__header">
        <h1>{t('pvp.title')}</h1>
        <p className="page__subtitle">{t('pvp.subtitle')}</p>
      </header>

      <section className="pvp__status">
        <div className="pvp__card">
          <h2>{t('pvp.card.entry')}</h2>
          {primaryBlockmon ? (
            <p>
              {primaryBlockmon.name} · {translateSpecies(primaryBlockmon.species, language)}
            </p>
          ) : (
            <p>{t('pvp.card.noBlockmon')}</p>
          )}
          <p>{t('pvp.card.tokens', { value: tokens })}</p>
        </div>
        <div className="pvp__card">
          <h2>{t('pvp.card.rulesTitle')}</h2>
          <ul>
            <li>{t('pvp.card.ruleStake')}</li>
            <li>{t('pvp.card.ruleReward')}</li>
            <li>{t('pvp.card.ruleProfit')}</li>
            <li>{t('pvp.card.ruleLoss')}</li>
          </ul>
        </div>
        <div className="pvp__card">
          <h2>{t('pvp.card.recentTitle')}</h2>
          {latest ? (
            <ul>
              <li>{latest.outcome === 'win' ? t('pvp.card.recentResultWin') : t('pvp.card.recentResultLose')}</li>
              <li>{t('pvp.card.recentOpponent', { name: latest.opponent.name })}</li>
              <li>{t('pvp.card.recentStake', { value: latest.tokensStaked })}</li>
              <li>{t('pvp.card.recentReward', { value: latest.tokensReward })}</li>
              <li>{t('pvp.card.recentFee', { value: latest.fee })}</li>
              <li>{t('pvp.card.recentNet', { value: latest.netTokens >= 0 ? `+${latest.netTokens}` : latest.netTokens })}</li>
            </ul>
          ) : (
            <p>{t('pvp.card.recentNone')}</p>
          )}
        </div>
      </section>

      {error && <p className="page__error">{error}</p>}

      <div className="pvp__actions">
        <button onClick={handleMatch}>{t('pvp.actions.match')}</button>
        <button onClick={() => actions.navigate('home')}>{t('pvp.actions.home')}</button>
      </div>

      {latest && <BattleLog entries={latest.logs} t={t} />}
    </div>
  )
}
