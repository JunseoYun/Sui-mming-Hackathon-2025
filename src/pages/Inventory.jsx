import React, { useState } from 'react'

export default function Inventory({ gameState, actions }) {
  const {
    tokens,
    potions,
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

    </div>
  )
}
