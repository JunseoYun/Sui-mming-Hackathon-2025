import React from 'react'
import { translateSpecies, translateNote, translateEntityStatus, translateStatus } from '../i18n'

function formatDate(value, language) {
  return new Date(value).toLocaleString(language === 'en' ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function Inventory({ gameState, actions }) {
  const {
    blockmons,
    dnaVault,
    seedHistory,
    adventure,
    fusionHistory,
    battleHistory,
    pvpHistory,
    language,
    t
  } = gameState

  return (
    <div className="page page--inventory">
      <header className="page__header">
        <h1>{t('inventory.title')}</h1>
        <p className="page__subtitle">{t('inventory.subtitle')}</p>
      </header>

      <section className="inventory__section">
        <h2>{t('inventory.section.dna')}</h2>
        <div className="inventory__list">
          {dnaVault.map((entry) => (
            <div key={entry.seed} className="inventory__card">
              <h3>{translateSpecies(entry.species, language)}</h3>
              <p>DNA: {entry.dna}</p>
              <p>{translateEntityStatus(entry.status, language)}</p>
              <p>{formatDate(entry.acquiredAt, language)}</p>
              <p>{translateNote(entry.note, language)}</p>
            </div>
          ))}
          {dnaVault.length === 0 && <p>{t('inventory.empty.dna')}</p>}
        </div>
      </section>

      <section className="inventory__section">
        <h2>{t('inventory.section.active')}</h2>
        <ul className="inventory__list inventory__list--simple">
          {blockmons.map((blockmon) => (
            <li key={blockmon.id}>
              {blockmon.name} · {translateSpecies(blockmon.species, language)} · {t('blockmon.powerLabel')} {blockmon.power}
            </li>
          ))}
          {!blockmons.length && <li>{t('inventory.empty.blockmon')}</li>}
        </ul>
      </section>

      <section className="inventory__section">
        <h2>{t('inventory.section.seed')}</h2>
        <ul className="inventory__list inventory__list--simple">
          {seedHistory.map((entry, index) => (
            <li key={`${entry.seed}-${index}`}>
              {formatDate(entry.timestamp, language)} · {entry.context} · {t('token.seed')} {entry.seed}
            </li>
          ))}
          {!seedHistory.length && <li>{t('inventory.empty.seed')}</li>}
        </ul>
      </section>

      <section className="inventory__section">
        <h2>{t('inventory.section.adventure')}</h2>
        {adventure ? (
          <p>
            {t('inventory.adventure.summary', {
              status: translateStatus(adventure.status, language),
              team: adventure.team.length,
              defeats: adventure.defeats,
              captured: adventure.capturedCount ?? 0,
              potions: adventure.potions,
              spent: adventure.tokensSpent
            })}
          </p>
        ) : (
          <p>{t('inventory.empty.adventure')}</p>
        )}
        <button onClick={() => actions.navigate('adventure')}>{t('inventory.adventure.button')}</button>
      </section>

      <section className="inventory__section">
        <h2>{t('inventory.section.fusion')}</h2>
        <ul className="inventory__list inventory__list--simple">
          {fusionHistory.map((record) => (
            <li key={record.id}>
              {formatDate(record.createdAt, language)} · {record.parents[0].name} + {record.parents[1].name} → {record.result.name}
            </li>
          ))}
          {!fusionHistory.length && <li>{t('inventory.empty.fusion')}</li>}
        </ul>
      </section>

      <section className="inventory__section">
        <h2>{t('inventory.section.battle')}</h2>
        <ul className="inventory__list inventory__list--simple">
          {battleHistory.map((record) => (
            <li key={record.id}>
              {formatDate(record.completedAt, language)} · {record.player.name} vs {record.opponent.name} ·
              {record.outcome === 'win' ? t('pvp.card.recentResultWin') : t('pvp.card.recentResultLose')} · {t('pvp.card.recentReward', { value: record.tokensReward - record.tokensSpent })}
            </li>
          ))}
          {!battleHistory.length && <li>{t('inventory.empty.battle')}</li>}
        </ul>
      </section>

      <section className="inventory__section">
        <h2>{t('inventory.section.pvp')}</h2>
        <ul className="inventory__list inventory__list--simple">
          {pvpHistory.map((record) => (
            <li key={record.id}>
              {formatDate(record.completedAt, language)} · {record.player.name} vs {record.opponent.name} ·
              {record.outcome === 'win' ? t('pvp.card.recentResultWin') : t('pvp.card.recentResultLose')} · {t('pvp.card.recentNet', { value: record.netTokens >= 0 ? `+${record.netTokens}` : record.netTokens })}
            </li>
          ))}
          {!pvpHistory.length && <li>{t('inventory.empty.pvp')}</li>}
        </ul>
      </section>
    </div>
  )
}
