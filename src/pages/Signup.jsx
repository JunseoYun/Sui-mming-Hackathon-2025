import React, { useState } from 'react'

export default function Signup({ onRegister, language = 'ko', t, setLanguage }) {
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!nickname.trim()) {
      setError(t('signup.error.nickname'))
      return
    }
    setError('')
    onRegister(nickname.trim())
  }

  return (
    <div className="page page--signup">
      <header className="page__header">
        <h1>{t('signup.title')}</h1>
        <p className="page__subtitle">{t('signup.subtitle')}</p>
        <div className="home__language-toggle">
          <button
            className={language === 'ko' ? 'is-active' : ''}
            onClick={() => setLanguage('ko')}
          >
            {t('home.language.korean')}
          </button>
          <button
            className={language === 'en' ? 'is-active' : ''}
            onClick={() => setLanguage('en')}
          >
            {t('home.language.english')}
          </button>
        </div>
      </header>

      <section className="signup__card">
        <p>{t('signup.description')}</p>

        <form className="signup__form" onSubmit={handleSubmit}>
          <label>
            {t('signup.nicknameLabel')}
            <input
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder={t('signup.nicknamePlaceholder')}
            />
          </label>
          {error && <p className="signup__error">{error}</p>}
          <button type="submit">{t('signup.button')}</button>
        </form>
      </section>

      <section className="signup__info">
        <h2>{t('signup.infoTitle')}</h2>
        <ul>
          <li>{t('signup.bullet.seed')}</li>
          <li>{t('signup.bullet.starter')}</li>
          <li>{t('signup.bullet.adventure')}</li>
          <li>{t('signup.bullet.fusion')}</li>
        </ul>
      </section>
    </div>
  )
}
