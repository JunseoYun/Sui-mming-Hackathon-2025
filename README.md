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

On-chain modules :

* blockmon.move: Defines core Blockmon logic
* inventory.move: Manages player-owned assets
* Game assets are stored as on-chain objects, ensuring players directly
* 


---



## Development Environment Setup (Local Sui + Dev Signing)

### Requirements

* **Node.js 18+**
* **Sui CLI (or the Docker localnet image)**

### 1) Run a Local Sui Node

```
# Method A: Sui CLI
sui start

# Method B: Docker (Optional)
docker run --rm -p 9000:9000 -p 9123:9123 ghcr.io/mystenlabs/sui-localnet:latest

```

### 2) Publish the Move Package to `<span class="selected">localnet</span>`

```
cd move

# Switch to localnet and get funds from the faucet
sui client switch --env localnet
sui client faucet

# Publish the package (use one of the following commands)
sui client publish --gas-budget 100000000 --skip-dependency-verification
# or
sui move publish --gas-budget 100000000 --skip-dependency-verification

# Copy the packageId from the output
# Example output: packageId: 0x<...>

```

### 3) Set Up Environment Variables for Development

**Use the **`<span class="selected">.env.development.local</span>` file in the project root (this file is excluded from builds and should not be committed to git):

```
VITE_SUI_NETWORK=local
VITE_SUI_RPC_URL=[http://127.0.0.1:9000](http://127.0.0.1:9000)

# Choose one of the dev signing methods
# 1) Mnemonic (Recommended)
VITE_SUI_DEV_MNEMONIC="<your 12 or 24-word mnemonic>"
# (Optional) Derivation path: defaults to m/44'/784'/0'/0'/0'
# VITE_SUI_DEV_DERIVATION_PATH=m/44'/784'/0'/0'/0'

# 2) Private Key (hex 0x.. or base64, 32-byte seed or 64-byte secret)
# VITE_SUI_DEV_PRIVATE_KEY=0x...

# Enter the packageId from step 2
VITE_BLOCKMON_PACKAGE_ID=0x<your deployed package ID>

```

**Note:**

* **In dev mode (**`<span class="selected">npm run dev</span>`), if a mnemonic or private key is provided, transactions will be signed using the environment key. Otherwise, it will fall back to wallet signing.
* **Place actual secret values only in **`<span class="selected">.env.development.local</span>`. Never commit them to production-related files.

### 4) Run the Application

```
npm install
npm run dev

```

**Open your browser to http://localhost:5173 and verify that the application is running correctly.**

## Known Risks & Mitigations

* **For more details, please refer to the following document section: **[Implementation Review and Roadmap - Known Risks &amp; Mitigations](https://www.google.com/search?q=docs/ImplementationReviewAndRoadmap.md%23known-risks--mitigations "null")

## Vite Template Reference

* **Includes settings for HMR and ESLint.**
* **Uses the **[@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react "null") plugin.
