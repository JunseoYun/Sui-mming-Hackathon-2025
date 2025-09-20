import React from "react";

export default function AppHeader({ t, player, navItems, currentPage, onNavigate, language, onSetLanguage }) {
  return (
    <header className="app__top">
      <span className="app__brand">{t("app.brand")}</span>
      {player && (
        <nav className="app__nav">
          {navItems.map(([key, { labelKey }]) => (
            <button
              key={key}
              className={currentPage === key ? "is-active" : ""}
              onClick={() => onNavigate(key)}
            >
              {t(labelKey)}
            </button>
          ))}
        </nav>
      )}
      <div className="app__language">
        <button
          className={language === "ko" ? "is-active" : ""}
          onClick={() => onSetLanguage("ko")}
        >
          {t("home.language.korean")}
        </button>
        <button
          className={language === "en" ? "is-active" : ""}
          onClick={() => onSetLanguage("en")}
        >
          {t("home.language.english")}
        </button>
      </div>
    </header>
  );
}


