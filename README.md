# TraceChain – Blockchain-Based Food Traceability System

TraceChain is a full-stack food supply-chain traceability and verification system built with **React (Vite)**, **Node.js**, **Express**, **MongoDB**, **Solidity**, **Ganache**, **ethers.js v6**, **SHA-256**, and **QR Code** tracking.

---

## Project Structure

- `blockchain/` — Solidity smart contract (`contracts/FoodTraceability.sol`), compiler (`compile.js`), deployer (`deploy.js`), compiled artifacts (`build/`), and persistent Ganache database (`ganache-db/`).
- `backend/` — Express REST API, MongoDB models (`Product`, `JourneyEvent`, `User`, `Feedback`), JWT + role-based middleware, SHA-256 + `ethers.js` blockchain bridge (`utils/blockchain.js`).
- `frontend/` — React + Vite web application with `/api` proxy, responsive desktop/mobile pages, QR code generation & PNG download, blockchain verification dashboard, and consumer feedback.
- `TraceChain_Final_Review.pptx` — 17-slide final review presentation ready for screenshots.

---

## Quick Start Commands (PowerShell)

Open **3 PowerShell terminals** (ensure MongoDB Server is running on `127.0.0.1:27017`):

**Terminal 1 — Local Ethereum Blockchain (Ganache with persistent storage):**
```powershell
cd C:\Users\srinivasreddy\food-traceability-blockchain\backend
npm run ganache
```

**Terminal 2 — Express Backend Server (Port 5000):**
```powershell
cd C:\Users\srinivasreddy\food-traceability-blockchain\backend
npm start
```

**Terminal 3 — React + Vite Frontend (Port 5173 + LAN Access):**
```powershell
cd C:\Users\srinivasreddy\food-traceability-blockchain\frontend
npm run dev
```

*(Only if you ever reset `blockchain/ganache-db`, redeploy the smart contract with `npm run blockchain:compile` and `npm run blockchain:deploy` inside `backend/`.)*

---

## Default Seeded Role Accounts

Password for all seeded accounts: **`TraceChain@123`**

| Role | Email | Allowed Actions |
|---|---|---|
| Admin | `admin@tracechain.com` | Full overview, user directory, consumer reports, register products, record all stages, sync pending events |
| Farmer | `farmer@tracechain.com` | Register products, record `Production` events |
| Processor | `processor@tracechain.com` | Record `Processing` events |
| Transporter | `transporter@tracechain.com` | Record `Transportation` events |
| Distributor | `distributor@tracechain.com` | Record `Distribution` events |
| Consumer | `consumer@tracechain.com` | Consumer dashboard, QR tracking, blockchain verification, `Consumer Verification` event, feedback/reporting |

---

## Key Backend API Endpoints

- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/auth/users` (Admin)
- **Products:** `POST /api/products/register` (Admin/Farmer/Producer), `GET /api/products`, `GET /api/products/:productId`
- **Journey:** `POST /api/journey/add`, `POST /api/journey/consumer-verify`, `GET /api/journey/:productId`
- **Blockchain:** `GET /api/blockchain/status`, `GET /api/blockchain/verify/:productId`, `GET /api/blockchain/verify-event/:eventId`, `POST /api/blockchain/sync/:eventId`
- **Dashboard & Network:** `GET /api/dashboard/stats`, `GET /api/network-info`
- **Consumer Feedback:** `POST /api/feedback`, `GET /api/feedback/:productId`, `GET /api/feedback`

---

## Live Viva Demo Walkthrough (5-Minute Script)

1. **Overview Dashboard (`/dashboard`):** Sign in as `Admin` (`admin@tracechain.com`) to show live MongoDB counts, Ganache connection (`Chain ID: 1337`), registered users, and consumer feedback.
2. **Product Registration & Journey (`/register-product`, `/add-journey`):** Register a batch or inspect `Rice` (`FT-1794321915465`) showing `Production`, `Processing`, `Transportation`, and `Distribution` blocks anchored on Ganache.
3. **Mobile QR Scan (`/products` -> Phone Camera):** Scan the QR code on a phone on the same Wi-Fi to open `/trace/<productId>` with all product details and journey history. *(Only products that have completed all 4 supply-chain stages — `Production`, `Processing`, `Transportation`, and `Distribution` — are visible to consumers.)*
4. **Consumer Verification Event & Feedback (`/trace/<productId>`):** After all 4 prior stages are complete, enter optional Consumer Name and Location and click **Verify & Record Check** to record a **`Consumer Verification Event`** (date, time, identity, location, verification result, and blockchain hash) and submit quality feedback.
5. **Blockchain Verification & Tamper Detection (`/verification`):**
   - Click `Rice` (`FT-1794321915465`) -> shows **Authentic Product — Verified On-Chain**.
   - Show an unanchored product (e.g., `Organic Wheat`) -> shows **Pending**.
   - *(Optional live tamper demo)* Edit an event's `description` in MongoDB, click **Re-Verify** -> immediately displays **Tampering Detected — Data Modified!**, then restore the original `description` string.

