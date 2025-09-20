import React, { useState } from 'react'
import { translateSpecies, translateNote, translateEntityStatus } from '../i18n'

export default function Inventory({ gameState, actions }) {
  const {
    tokens,
    potions,
    blockmons,
    dnaVault,
    language,
    t
  } = gameState

  const [tokenPanel, setTokenPanel] = useState(false)
  const [potionPanel, setPotionPanel] = useState(false)

  const tokenOptions = [10, 30, 50, 100]
  const potionOptions = [
    { amount: 1, cost: 3 },
    { amount: 3, cost: 8 },
    { amount: 5, cost: 12 }
  ]

  return (
    <div className="page page--inventory">
      <header className="page__header">
        <h1>{t('inventory.title')}</h1>
        <p className="page__subtitle">{t('inventory.subtitle')}</p>
      </header>

      <section className="inventory__section">
        <h2>{t('inventory.tokens')}</h2>
        <p>{t('token.bm')}: {tokens.toLocaleString(language === 'en' ? 'en-US' : 'ko-KR')}</p>
        <div className="inventory__actions">
          <button onClick={() => setTokenPanel((prev) => !prev)}>{t('inventory.purchase.tokens')}</button>
          {tokenPanel && (
            <div className="inventory__panel">
              <p>{t('token.purchaseTitle')}</p>
              <div className="inventory__options">
                {tokenOptions.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      actions.purchaseTokens(amount)
                      setTokenPanel(false)
                    }}
                  >
                    {t('token.purchaseOption', { amount })}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="inventory__section">
        <h2>{t('inventory.potions')}</h2>
        <p>{t('inventory.potionStock', { value: potions })}</p>
        <div className="inventory__actions">
          <button onClick={() => setPotionPanel((prev) => !prev)}>{t('inventory.purchase.potions')}</button>
          {potionPanel && (
            <div className="inventory__panel">
              <div className="inventory__options">
                {potionOptions.map(({ amount, cost }) => (
                  <button
                    key={amount}
                    onClick={() => {
                      const result = actions.purchasePotions(amount, cost)
                      if (!result?.error) {
                        setPotionPanel(false)
                      }
                    }}
                  >
                    {t('inventory.potionOptions', { amount, cost })}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="inventory__section">
        <h2>{t('inventory.section.dna')}</h2>
        <div className="inventory__list">
          {dnaVault.map((entry) => (
            <div key={entry.seed} className="inventory__card">
              <h3>{translateSpecies(entry.species, language)}</h3>
              <p>DNA: {entry.dna}</p>
              <p>{translateEntityStatus(entry.status, language)}</p>
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
              {language === 'en' ? translateSpecies(blockmon.species, language) : blockmon.name} ·
              {t('blockmon.powerLabel')} {blockmon.power}
            </li>
          ))}
          {!blockmons.length && <li>{t('inventory.empty.blockmon')}</li>}
        </ul>
      </section>
    </div>
  )
}
