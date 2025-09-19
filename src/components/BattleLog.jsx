import React from 'react'

export default function BattleLog({ entries = [] }) {
  return (
    <div className="battle-log">
      <h3>전투 로그</h3>
      <div className="battle-log__entries">
        {entries.map((entry, index) => (
          <p key={index} className="battle-log__entry">
            <span className="battle-log__timestamp">{entry.time}</span>
            <span>{entry.message}</span>
          </p>
        ))}
      </div>
    </div>
  )
}
