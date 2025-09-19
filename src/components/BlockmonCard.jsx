import React from 'react'

export default function BlockmonCard({ blockmon, onSelect, selectable = false, isSelected = false }) {
  const { name, dna, species, hp, stats, rank, origin, temperament, power } = blockmon

  return (
    <div
      className={`blockmon-card${isSelected ? ' blockmon-card--selected' : ''}${selectable ? ' blockmon-card--selectable' : ''}`}
      onClick={selectable ? () => onSelect?.(blockmon) : undefined}
    >
      <div className="blockmon-card__header">
        <span className="blockmon-card__species">{species}</span>
        <span className="blockmon-card__dna">DNA #{dna}</span>
      </div>
      <div className="blockmon-card__title">
        <h3 className="blockmon-card__name">{name}</h3>
        {rank && <span className="blockmon-card__rank">{rank}</span>}
      </div>
      <div className="blockmon-card__hp">HP {hp}</div>
      {power && <div className="blockmon-card__power">전투력 {power}</div>}
      {origin && <div className="blockmon-card__origin">{origin}</div>}
      {temperament && <div className="blockmon-card__temperament">{temperament}</div>}
      <ul className="blockmon-card__stats">
        <li>STR {stats.str}</li>
        <li>DEX {stats.dex}</li>
        <li>CON {stats.con}</li>
        <li>INT {stats.int}</li>
        <li>WIS {stats.wis}</li>
        <li>CHA {stats.cha}</li>
      </ul>
    </div>
  )
}
