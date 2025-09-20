import React, { useState } from "react";

import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

export default function Signup({ onRegister, t }) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  const [idToken, setIdToken] = useState(null);
  const [userId, setUserId] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!nickname.trim()) {
      setError(t("signup.error.nickname"));
      return;
    }
    setError("");
    onRegister(nickname.trim());
  };

  const decodeJWT = (token) => {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  };

  const handleSuccess = async (credentialResponse) => {
    console.log(credentialResponse);
    const idToken = credentialResponse.credential;
    const decoded = decodeJWT(idToken);

    const userId = decoded.sub;

    setIdToken(idToken);
    setUserId(userId);
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
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
                    <linearGradient
                      id="suiGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
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
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => alert("로그인 실패")}
          />
          <form className="signup-form" onSubmit={handleSubmit}>
            {/* <input
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder={t("signup.nicknamePlaceholder")}
            /> */}
            {error && <p className="signup-error">{error}</p>}
            <button type="submit">{t("signup.button.label")}</button>
          </form>

          <p className="signup-cost">{t("signup.cost")}</p>
          <div className="signup-divider" />
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
