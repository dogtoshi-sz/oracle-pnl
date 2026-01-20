# OraclePnL

**OraclePnL** is a cryptocurrency trading signal analysis platform focused on visualizing  
**signals, PnL data, and market-related metrics** for Solana tokens.

This repository contains the **frontend (web interface) + Backend (Server)** of the project.  
The product is **actively under development** and the structure,
features, and visuals may change over time.

> ⚠️ This project is **not** financial advice.  
> It is intended for data visualization and informational purposes only.

---

## 🚧 Project Status

- Actively developed
- Personal / individual project
- Features and structure are subject to change
- Not a production-ready commercial product

---

## 📦 Repository Structure

Current structure includes:

- `assets/` – static assets (CSS, JS, images)
- `pages/` – page-level views
- `partials/` – reusable UI components
- `main/` – main application logic
- `index.html` – application entry point
- `package.json` – dependencies and scripts

---

## 🛠 Installation

### Requirements

- Node.js **18+** (recommended)
- npm (or compatible package manager)

### Setup & Settings

The application automatically creates its local database on first run.

### 📁 Database Location

The SQLite database file is created at:
User/%AppData%/Roaming/OraclePnL/oracle-pnl.db (Windows)

You can inspect and modify this database using any SQLite-compatible database viewer.

---

## 🧩 Settings System

All runtime configuration is stored inside the `settingsData` table in the database.

Each setting consists of:
- `key` – unique identifier
- `value` – stored as text
- `createdAt` / `updatedAt` – timestamps

These settings are loaded automatically at application startup and used globally.

---

## 📌 Signal & Risk Management Settings

These settings control stop-loss logic, take-profit levels, and time-based exits.

| Key | Description |
|---|---|
| `signal.stopLossPct` | Stop-loss threshold (e.g. `-0.35` = -35%) |
| `signal.tp1Pct` | Take Profit 1 level (percentage gain) |
| `signal.tp2Pct` | Take Profit 2 level (percentage gain) |
| `signal.tp3Pct` | Take Profit 3 level (percentage gain) |
| `signal.maxHoldMinutes` | Maximum holding time before forced close |
| `signal.noNewHighMinutes` | Time without new highs before exit |
| `signal.noNewHighDropRatio` | Drop ratio from peak triggering exit |

---

## 🤖 OpenAI Configuration

Used for AI-based momentum and continuation analysis.

| Key | Description |
|---|---|
| `openai.apiKey` | Your OpenAI API key |
| `openai.prompt.momentum` | Prompt used for momentum analysis |

> ⚠️ You must insert your own OpenAI API key before using AI features.

---

## 🤖 Gemini Configuration

Used as an alternative AI decision provider.

| Key | Description |
|---|---|
| `gemini.apiKey` | Your Gemini API key |
| `gemini.prompt.momentum` | Prompt used for Gemini analysis |
| `gemini.model` | Model name (e.g. `gemini-2.0-flash`) |
| `gemini.temperature` | Model temperature |
| `gemini.maxOutputTokens` | Maximum response length |

---

## 🌐 Solana RPC Configuration

Controls blockchain connectivity.

| Key | Description |
|---|---|
| `rpc.solana.mainnet` | Solana mainnet RPC endpoint |
| `rpc.solana.commitment` | Commitment level (e.g. `confirmed`) |

The default RPC endpoint is pre-filled, but you may replace it with your own provider.

---

## 🚀 Getting Started

1. Install dependencies:
```bash
npm install
```

2. Rebuild native modules for Electron:
```bash
npx electron-rebuild
```

3. Configure API keys (OpenAI and Gemini) in the database settings

4. Start the application:
```bash
npm start
```

---

## ⚖️ Legal Disclaimer

This project is provided for **educational and informational purposes only**.

Nothing in this repository, application, or related materials constitutes:
- financial advice,
- investment advice,
- trading advice, or
- a recommendation to buy or sell any asset.

The author does **not** operate as a licensed financial advisor, broker, or investment professional.

All data, signals, metrics, and visualizations are provided **"as is"**, without any warranties of accuracy, completeness, or reliability.  
Cryptocurrency markets are highly volatile and involve significant risk. You may lose part or all of your capital.

You are solely responsible for any decisions made based on information derived from this project.  
The author accepts **no liability** for financial losses, damages, or other consequences resulting from the use of this software.

By using this project, you acknowledge and agree to these terms.
