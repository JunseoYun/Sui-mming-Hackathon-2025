import React, { useEffect, useState } from "react";
import {
  useConnectWallet,
  useCurrentAccount,
  useWallets,
} from "@mysten/dapp-kit";
import { isEnokiWallet } from "@mysten/enoki";

export default function Signup({ onRegister, t }) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const currentAccount = useCurrentAccount();
  const { mutate: connect, isPending: isConnecting } = useConnectWallet();
  const enokiWallets = useWallets().filter(isEnokiWallet);
  const googleWallet = enokiWallets.find((wallet) => wallet.provider === "google");

  const formatAddress = (address) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  useEffect(() => {
    if (googleWallet && error === t("signup.wallet.unavailable")) {
      setError("");
    }
  }, [googleWallet, error, t]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!nickname.trim()) {
      setError(t("signup.error.nickname"));
      return;
    }
    if (!currentAccount) {
      setError(t("signup.error.walletRequired"));
      return;
    }
    setError("");
    onRegister(nickname.trim());
  };

  return (
    <div className="signup-screen">
      <div className="signup-card">
        <div className="signup-divider" />

        <div className="signup-header">
          <div className="signup-title">{t("signup.title")}</div>
          <p className="signup-subtitle">{t("signup.subtitle")}</p>
          <p className="signup-tagline">{t("signup.tagline")}</p>
        </div>

        <div className="signup-icon">
          <div className="signup-icon-shell">
            <div className="signup-icon-inner">
              <svg
                className="signup-icon-svg"
                viewBox="0 0 64 64"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="suiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8ae2ff" />
                    <stop offset="100%" stopColor="#7468ff" />
                  </linearGradient>
                </defs>
                <path
                  d="M32 6C32 6 10 24.4 10 39.4C10 49.7 19.2 58 32 58C44.8 58 54 49.7 54 39.4C54 24.4 32 6 32 6ZM23.8 39.8C23.8 36.6 26.4 33.9 29.6 33.9C30.9 33.9 32.1 34.3 33 35.1L26.7 44.2C24.9 43.1 23.8 41.6 23.8 39.8ZM32 51.1C29.6 51.1 27.4 50.4 25.6 49.2L36 34.1C37.7 35 38.6 36.7 38.6 38.6C38.6 40.9 36.7 42.8 34.4 42.8C33.3 42.8 32.3 42.4 31.4 41.8L29.4 44.7C30.8 45.9 32.5 46.6 34.4 46.6C38.5 46.6 41.8 43.3 41.8 39.2C41.8 36.2 39.9 33.6 37.2 32.4L32.1 25.4C35.3 28.7 39.4 33.7 39.4 39.4C39.4 46 35.1 51.1 32 51.1Z"
                  fill="url(#suiGradient)"
                />
              </svg>
            </div>
          </div>
        </div>

        <p className="signup-description">{t("signup.description")}</p>

        <div className="signup-wallet">
          <button
            type="button"
            className="signup-wallet__google"
            disabled={!googleWallet || isConnecting}
            onClick={() => {
              if (!googleWallet) {
                setError(t("signup.wallet.unavailable"));
                return;
              }
              connect({ wallet: googleWallet });
            }}
          >
            {googleWallet?.icon ? (
              <img
                src={googleWallet.icon}
                alt="Google"
                className="signup-wallet__google-icon"
              />
            ) : (
              <span className="signup-wallet__google-placeholder">G</span>
            )}
            <span>{t("signup.wallet.google")}</span>
          </button>
          {currentAccount && (
            <p className="signup-wallet__status">
              {t("signup.wallet.connected", {
                address: formatAddress(currentAccount.address),
              })}
            </p>
          )}
        </div>

        <form className="signup-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder={t("signup.nicknamePlaceholder")}
          />
          {error && <p className="signup-error">{error}</p>}
          <button type="submit" disabled={!currentAccount}>
            {t("signup.button.label")}
          </button>
        </form>

        <p className="signup-cost">{t("signup.cost")}</p>
        <div className="signup-divider" />
      </div>
    </div>
  );
}
