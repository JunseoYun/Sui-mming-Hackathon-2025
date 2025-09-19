import React from 'react'
import { translateSpecies, translateTemperament, translateOrigin } from '../i18n'

export default function BlockmonCard({ blockmon, onSelect, selectable = false, isSelected = false, language = 'ko', t = () => '' }) {
  const { name, dna, species, hp, stats, rank, origin, temperament, power } = blockmon
  const speciesLabel = translateSpecies(species, language)
  const originLabel = origin ? t('blockmon.origin', { value: translateOrigin(origin, language) }) : null
  const temperamentLabel = temperament ? t('blockmon.temperament', { value: translateTemperament(temperament, language) }) : null
  const powerLabel = power ? t('blockmon.powerLabel') : null

  return (
    <div
      className={`blockmon-card${isSelected ? ' blockmon-card--selected' : ''}${selectable ? ' blockmon-card--selectable' : ''}`}
      onClick={selectable ? () => onSelect?.(blockmon) : undefined}
    >
      <div className="blockmon-card__header">
        <span className="blockmon-card__species">{speciesLabel || species}</span>
        <span className="blockmon-card__dna">DNA #{dna}</span>
      </div>
      <div className="blockmon-card__title">
        <h3 className="blockmon-card__name">{name}</h3>
        {rank && <span className="blockmon-card__rank">{rank}</span>}
      </div>
      <div className="blockmon-card__hp">HP {hp}</div>
      {power && powerLabel && <div className="blockmon-card__power">{powerLabel} {power}</div>}
      {originLabel && <div className="blockmon-card__origin">{originLabel}</div>}
      {temperamentLabel && <div className="blockmon-card__temperament">{temperamentLabel}</div>}
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
