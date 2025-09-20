import React from 'react'
import { translateSpecies } from '../i18n'

export default function BlockmonCard({
  blockmon,
  onSelect,
  selectable = false,
  isSelected = false,
  order = -1,
  language = 'ko',
  t = () => '',
}) {
  const { name, dna, species, hp, stats, rank, power, skill } = blockmon
  const speciesLabel = translateSpecies(species, language)
  const powerLabel = power ? t('blockmon.powerLabel') : null
  const displayName = language === 'en' ? speciesLabel || name : name
  const skillName = skill ? t(skill.name) : ''
  const skillDescription = skill ? t(skill.description) : ''

  return (
    <div
      className={`blockmon-card${isSelected ? ' blockmon-card--selected' : ''}${selectable ? ' blockmon-card--selectable' : ''}`}
      onClick={selectable ? () => onSelect?.(blockmon) : undefined}
    >
      {isSelected && order >= 0 && <div className="blockmon-card__order">{order + 1}</div>}
      <div className="blockmon-card__header">
        <span className="blockmon-card__species">{speciesLabel || species}</span>
        <span className="blockmon-card__dna">DNA #{dna}</span>
      </div>
      <div className="blockmon-card__title">
        <h3 className="blockmon-card__name">{displayName}</h3>
        {rank && <span className="blockmon-card__rank">{rank}</span>}
      </div>
      <div className="blockmon-card__hp">HP {hp}</div>
      {power && powerLabel && <div className="blockmon-card__power">{powerLabel} {power}</div>}
      <ul className="blockmon-card__stats">
        <li>STR {stats.str}</li>
        <li>DEX {stats.dex}</li>
        <li>CON {stats.con}</li>
        <li>INT {stats.int}</li>
        <li>WIS {stats.wis}</li>
        <li>CHA {stats.cha}</li>
      </ul>
      {skill && (
        <div className="blockmon-card__skill">
          <h4>{skillName}</h4>
          <p>{skillDescription}</p>
        </div>
      )}
    </div>
  )
}
