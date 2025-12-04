# blockchain-demo-client

A React + TypeScript client for the blockchain demo API. It surfaces the state of the blockchain exposed by the Flask backend, lets you inspect and edit blocks, create wallets, and simulate transactions directly from the browser.

## Features

- Visual blockchain explorer with block-by-block hash, nonce, and transaction details
- Wallet creation, wallet list, and helper tooling for addressing
- Transaction builder with amount validation, fee preview, and Mantine notifications
- Block validation flow that highlights invalid indexes and allows remine fixes
- Redux Toolkit state management, Mantine UI components, and Axios-based API client

## Prerequisites

- Node.js 20+ (LTS) and npm 10+
- Running instance of the blockchain demo Flask API (the client expects `/v1` endpoints)

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```
   - `VITE_API_BASE_URL` — absolute URL to the Flask API when not using the dev proxy
   - `VITE_PROXY_TARGET` — Flask server URL used by Vite's proxy during `npm run dev`
   - `VITE_API_PREFIX` — API path segment that should be proxied (defaults to `/v1`)
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
4. Open the printed URL (typically `http://localhost:5173`) to interact with the UI.

## Scripts

- `npm run dev` — start the Vite dev server with hot module reloading
- `npm run build` — type-check and produce a production build in `dist`
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint with the Airbnb + TypeScript + Prettier rules
- `npm run format` — format the entire repo with Prettier

## Project Structure

```
src/
  app/            # Redux store setup, global providers, and theming
  components/     # Reusable modals for mining, transactions, and wallets
  features/       # Redux slices, selectors, and async thunks
  pages/          # Top-level routes (Home, Blockchain, Wallets, 404)
  services/       # Axios client plus request/response TypeScript types
  styles/         # SCSS variables and global styles
```

## Deployment

When deploying, make sure the `VITE_API_BASE_URL` points to the public Flask API URL and run `npm run build`. Serve the generated `dist` folder behind any static host (Netlify, Vercel, S3, etc.).
