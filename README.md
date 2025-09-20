# **Blockmon: A Proposal for Next-Generation On-Chain Social Gaming**

**1. The Problem**

Web3 gaming promised “true ownership of digital assets,” but it has failed to reach the mainstream due to **complicated onboarding** and  **punitive UX** .

Meanwhile, Web2 gaming attracts billions of users, yet players face **opaque probabilities** and **limited ownership** over the assets they invest time and money into.

👉 The core issue: Web3 is too  **inconvenient** , and Web2 is not **fair** or **free** enough.

**2. Our Solution**

**Blockmon** leverages the **Sui blockchain object model** and **Enoki onboarding** to deliver a gaming experience that combines the **simplicity of Web2** with the  **transparency of Web3** .

**(1) Frictionless Onboarding & Free-to-Play**

* **Enoki Login** : Users sign in with familiar accounts (e.g., Google). A secure, non-custodial wallet is automatically created in the background.
* **Sponsored Transactions** : The platform covers all gas fees, allowing players to enjoy the game without ever dealing with blockchain concepts.

**(2) Minimal On-Chain Structure**

    **On-chain modules** :

* blockmon.move: Defines core Blockmon logic
* inventory.move: Manages player-owned assets
* Game assets are stored as on-chain objects, ensuring players directly

## 개발 환경 구성 (로컬 Sui + dev 서명)

### 요구 사항

- Node.js 18+
- Sui CLI (또는 Docker 로컬넷 이미지)

### 1) 로컬 Sui 노드 실행

```bash
# 방법 A: Sui CLI
sui start

# 방법 B: Docker (선택)
docker run --rm -p 9000:9000 -p 9123:9123 ghcr.io/mystenlabs/sui-localnet:latest
```

### 2) Move 패키지 배포 (localnet)

```bash
cd move

# 로컬넷으로 전환 및 faucet
sui client switch --env localnet
sui client faucet

# 배포 (둘 중 하나 사용)
sui client publish --gas-budget 100000000 --skip-dependency-verification
# 또는
sui move publish --gas-budget 100000000 --skip-dependency-verification

# 출력 예시에서 packageId 복사
# packageId: 0x<...>
```

### 3) 개발용 환경 변수 설정

프로젝트 루트의 `.env.development.local`을 사용합니다(빌드 제외, git에 커밋 금지):

```bash
VITE_SUI_NETWORK=local
VITE_SUI_RPC_URL=http://127.0.0.1:9000

# dev 서명 방법 중 하나 선택
# 1) 니모닉 (추천)
VITE_SUI_DEV_MNEMONIC="<12 또는 24 단어 니모닉>"
# (선택) 파생 경로: 기본값 m/44'/784'/0'/0'/0'
# VITE_SUI_DEV_DERIVATION_PATH=m/44'/784'/0'/0'/0'

# 2) 프라이빗 키 (hex 0x.. 또는 base64, 32바이트 seed 또는 64바이트 secret)
# VITE_SUI_DEV_PRIVATE_KEY=0x...

# 2단계에서 배포한 packageId 입력
VITE_BLOCKMON_PACKAGE_ID=0x<배포된 패키지 ID>
```

참고:

- dev 모드(`npm run dev`)에서 니모닉/프라이빗 키가 있으면 env-key로 서명, 아니면 지갑 서명으로 폴백합니다.
- 실제 비밀값은 `.env.development.local`에만 넣고, prod 관련 파일에는 절대 넣지 마세요.

### 4) 앱 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 접속 후 동작을 확인합니다.

---

## Known Risks & Mitigations

- 자세한 내용은 다음 문서 섹션을 참고하세요: [Implementation Review and Roadmap - Known Risks &amp; Mitigations](docs/ImplementationReviewAndRoadmap.md#known-risks--mitigations)

## Vite 템플릿 참고

- HMR, ESLint 설정 포함
- 플러그인: [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react)
