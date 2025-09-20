import React from 'react'

export default function TokenBalance({
  tokens,
  dnaCount,
  activeCount,
  seedCount,
  potionCount = 0,
  t,
  language = 'ko',
}) {
  const locale = language === 'en' ? 'en-US' : 'ko-KR'
  return (
    <div className="token-balance">
      <div>
        <span className="token-balance__label">{t('token.bm')}</span>
        <span className="token-balance__value">{tokens.toLocaleString(locale)} BM</span>
      </div>
      <div>
        <span className="token-balance__label">{t('token.dna')}</span>
        <span className="token-balance__value">{dnaCount.toLocaleString(locale)}</span>
      </div>
      <div>
        <span className="token-balance__label">{t('token.active')}</span>
        <span className="token-balance__value">{activeCount.toLocaleString(locale)}</span>
      </div>
      <div>
        <span className="token-balance__label">{t('token.seed')}</span>
        <span className="token-balance__value">{seedCount.toLocaleString(locale)}</span>
      </div>
      <div>
        <span className="token-balance__label">{t('token.potion')}</span>
        <span className="token-balance__value">{potionCount.toLocaleString(locale)}</span>
      </div>
    </div>
  )
}
