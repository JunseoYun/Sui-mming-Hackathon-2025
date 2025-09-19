import React from 'react'

export default function BattleLog({ entries = [], t }) {
  return (
    <div className="battle-log">
      <h3>{t('battleLog.title')}</h3>
      <div className="battle-log__entries">
        {entries.map((entry, index) => (
          <p
            key={index}
            className={`battle-log__entry${entry.actorType === 'player' ? ' battle-log__entry--player' : entry.actorType === 'opponent' ? ' battle-log__entry--opponent' : ''}`}
          >
            <span className="battle-log__timestamp">{entry.time}</span>
            <span>{entry.message}</span>
          </p>
        ))}
      </div>
    </div>
  )
}
