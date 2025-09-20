import React, { useMemo } from 'react'
import BlockmonCard from '../components/BlockmonCard'
import BattleLog from '../components/BattleLog'

export default function Adventure({ gameState, actions }) {
  const { adventure, blockmons, language, t } = gameState

  const activeTeam = useMemo(() => {
    if (!adventure) return []
    return adventure.team.map((member) => {
      const base = blockmons.find((mon) => mon.id === member.id)
      if (!base) {
        return {
          id: member.id,
          name: member.name,
          dna: member.dna,
          species: member.species,
          hp: member.remainingHp,
          stats: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
        }
      }
      return { ...base, hp: member.remainingHp }
    })
  }, [adventure, blockmons])

  if (!adventure) {
    return (
      <div className="page page--adventure">
        <header className="page__header">
          <h1>{t('adventure.prepTitle')}</h1>
          <p className="page__subtitle">{t('adventure.prepSubtitle')}</p>
        </header>
        <p>{t('adventure.none')}</p>
        <button onClick={() => actions.navigate('home')}>{t('adventure.footer.home')}</button>
      </div>
    )
  }

  return (
    <div className="page page--adventure">
      <header className="page__header">
        <h1>{t('adventure.heading')}</h1>
        <p className="page__subtitle">{t('adventure.subtitle')}</p>
      </header>

      <div className="adventure__team">
        <div className="adventure__team-header">
          <h2>{t('adventure.teamHeader')}</h2>
          <span>
            {t('home.activeAdventure.summary', {
              active: adventure.team.filter((member) => !member.knockedOut).length,
              total: adventure.team.length,
              potions: adventure.potionsRemaining ?? adventure.potionsCarried ?? 0,
              spent: adventure.tokensSpent,
              captured: adventure.capturedCount ?? 0
            })}
          </span>
        </div>
        <div className="blockmon-grid blockmon-grid--compact">
          {activeTeam.map((blockmon, index) => (
            <div key={blockmon.id} className={`adventure__member ${adventure.team[index].knockedOut ? 'is-ko' : ''}`}>
              <BlockmonCard blockmon={blockmon} language={language} t={t} />
              <p className="adventure__status">
                {adventure.team[index].knockedOut
                  ? t('adventure.member.knockedOut')
                  : t('adventure.member.hp', { hp: adventure.team[index].remainingHp })}
              </p>
            </div>
          ))}
        </div>
      </div>

      <BattleLog entries={adventure.logs} t={t} />

      <div className="page__footer-actions">
        <button onClick={() => actions.navigate('home')}>{t('adventure.footer.home')}</button>
      </div>
    </div>
  )
}
