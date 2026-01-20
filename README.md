# OraclePnL

**Just a little test in AI sentiment analysis**

A side project I've been working on - an Electron desktop app for analyzing Solana tokens using AI. It scans tokens, does some technical analysis, and uses OpenAI + Gemini to generate trading signals.

---

## What it does

Basically, this app:
- Scans pump.fun and DexScreener for new Solana tokens
- Tracks price, volume, market cap in real-time
- Does some technical analysis (support/resistance, trends, momentum)
- Uses both OpenAI and Gemini AI to analyze tokens
- Only creates a BUY signal when both AIs agree (consensus)
- Tracks PnL with stop-loss and take-profit levels

It's pretty basic - not meant to be production-ready or anything. Just something I built to test out AI sentiment analysis on crypto tokens.

---

## Quick Start

### Requirements

- Node.js 18+ 
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/dogtoshi-sz/oracle-pnl.git
cd oracle-pnl

# Install dependencies
npm install

# Rebuild native modules for Electron
npx electron-rebuild

# Start the app
npm start
```

### Setup

You'll need to configure:
1. OpenAI API key (in database settings)
2. Gemini API key (in database settings)
3. AI prompts for analysis
4. Risk parameters (stop-loss, take-profit, etc.)

---

## Features

### Token Discovery
- Scans pump.fun for trending tokens
- Monitors DexScreener boosted listings
- Filters out low volume/market cap tokens

### Technical Analysis
- Builds 15m, 1h, and 4h candlestick charts
- Finds support and resistance levels
- Calculates trends and momentum
- Detects volume anomalies
- Calculates pump scores

### AI Decision Making
- Uses OpenAI GPT-4o-mini for analysis
- Uses Gemini 2.0 Flash as backup/second opinion
- Only generates BUY signals when both agree
- Stores decision history

### Signal Management
- Auto-creates signals when both AIs say BUY
- Tracks PnL in real-time
- Triggers stop-loss automatically
- Multiple take-profit levels
- Time-based exits

---

## Tech Stack

- Frontend: HTML5, CSS3, JavaScript
- Backend: Node.js, Electron
- Database: SQLite
- AI: OpenAI API, Google Gemini API
- Blockchain: Solana Web3.js
- Data Sources: DexScreener, pump.fun

---

## Project Structure

```
oracle-pnl/
├── assets/          # CSS, JS, images
├── main/            # Electron main process
│   ├── analysis/    # Technical analysis stuff
│   ├── scanners/    # Token discovery
│   ├── tokens/      # Token data management
│   └── updaters/    # Market data updates
├── pages/           # App pages
├── partials/        # Reusable components
└── index.html       # Entry point
```

---

## Configuration

All settings are in the SQLite database:
- AI API keys and prompts
- Risk management (stop-loss, take-profit)
- Trading rules (max hold time, volume thresholds)
- Solana RPC endpoint

---

## Disclaimer

This is just a side project for educational purposes. Not financial advice, not production-ready, not anything official.

**Seriously - this is NOT financial advice.** Crypto trading is risky, you can lose everything. Use at your own risk.

I'm not a financial advisor. This software is provided "as is" without any warranties. Don't sue me if you lose money.

---

## License

MIT License - do whatever you want with it.

---

## Contributing

If you want to contribute, go ahead. I'll probably merge it if it makes sense.

---

Made as a side project to test AI sentiment analysis on crypto tokens.

Trade responsibly. This is not financial advice.
