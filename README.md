# OraclePnL

<div align="center">
  <h3>💰 AI-Powered Cryptocurrency Trading Signal Analysis Platform</h3>
  <p>Advanced Solana token analysis with dual AI decision-making and real-time PnL tracking</p>
</div>

---

## 🎯 Overview

**OraclePnL** is an Electron-based desktop application that provides intelligent trading signal analysis for Solana tokens. It combines technical analysis, AI-powered decision-making (OpenAI + Gemini), and real-time profit/loss tracking to help traders make informed decisions.

### Key Features

- 🤖 **Dual AI Analysis** - Leverages both OpenAI and Gemini for consensus-based trading signals
- 📊 **Real-Time Market Data** - Continuous monitoring of token prices, volume, and market cap
- 🔍 **Token Discovery** - Automatically scans pump.fun and DexScreener for new opportunities
- 📈 **Technical Analysis** - Built-in support/resistance detection, trend analysis, and momentum indicators
- 💹 **PnL Tracking** - Real-time profit/loss monitoring with stop-loss and take-profit automation
- 🎨 **Modern UI** - Clean, intuitive interface with purple theme

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/oracle-pnl.git
cd oracle-pnl

# Install dependencies
npm install

# Rebuild native modules for Electron
npx electron-rebuild

# Start the application
npm start
```

### Configuration

1. **Set up API Keys** - Configure your OpenAI and Gemini API keys in the application settings
2. **Configure AI Prompts** - Customize the prompts used for token analysis
3. **Set Risk Parameters** - Adjust stop-loss, take-profit levels, and holding times

---

## 📋 Features in Detail

### Token Discovery
- Scans pump.fun for trending tokens
- Monitors DexScreener boosted listings
- Filters by volume and market cap thresholds

### Technical Analysis
- 15m, 1h, and 4h candlestick charts
- Support and resistance level detection
- Trend bias and momentum analysis
- Volume anomaly detection
- Pump score calculation

### AI Decision Making
- Dual AI provider system (OpenAI GPT-4o-mini + Gemini 2.0 Flash)
- Consensus-based BUY signals (both AIs must agree)
- Configurable analysis prompts
- Historical decision tracking

### Signal Management
- Automatic signal creation on AI consensus
- Real-time PnL calculation
- Stop-loss triggers
- Multiple take-profit levels (TP1, TP2, TP3)
- Time-based exit rules

---

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Electron
- **Database**: SQLite (better-sqlite3)
- **AI**: OpenAI API, Google Gemini API
- **Blockchain**: Solana Web3.js
- **APIs**: DexScreener, pump.fun

---

## 📁 Project Structure

```
oracle-pnl/
├── assets/          # Static assets (CSS, JS, images)
├── main/            # Electron main process
│   ├── analysis/    # Technical analysis modules
│   ├── scanners/    # Token discovery services
│   ├── tokens/      # Token data management
│   └── updaters/    # Market data updaters
├── pages/           # Application pages
├── partials/        # Reusable components
└── index.html       # Entry point
```

---

## ⚙️ Configuration

Settings are stored in the SQLite database. Key configuration options:

- **AI Settings**: API keys and analysis prompts
- **Risk Management**: Stop-loss, take-profit percentages
- **Trading Rules**: Max hold time, volume thresholds
- **RPC Endpoints**: Solana blockchain connection

---

## ⚠️ Disclaimer

This software is provided for **educational and informational purposes only**. 

**NOT FINANCIAL ADVICE** - This application does not provide financial, investment, or trading advice. All signals and analysis are for informational purposes only.

Cryptocurrency trading involves substantial risk. You may lose all of your capital. Use at your own risk.

---

## 📝 License

This project is licensed under the MIT License.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

---

<div align="center">
  <p>Made with ❤️ for the crypto trading community</p>
  <p><strong>⚠️ Trade responsibly. This is not financial advice.</strong></p>
</div>
