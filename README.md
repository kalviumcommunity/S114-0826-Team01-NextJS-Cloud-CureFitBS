# CureFit Real-Time Class Booking

CureFit is a Vite + React fitness-class booking app with an Express API, PostgreSQL persistence, atomic seat reservations, payment simulation, booking history, cancellation, and live seat updates over WebSockets.

## Stack

- React 18 and Vite for the frontend
- Express for REST endpoints
- `ws` for WebSocket seat updates
- PostgreSQL for users, classes, bookings, and audit logs

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file from the template and set your database URL:

```bash
cp .env.example .env
```

The development setup expects the backend on port `5000` and the Vite UI on port `5173`.

## Run Locally

Start the backend:

```bash
npm run dev:backend
```

Start the Vite app in another terminal:

```bash
npm run dev
```

Open the UI at:

```text
http://localhost:5173/
```

The Vite dev server proxies `/api` and `/ws` to `http://localhost:5000`.

## Verification

Build the frontend:

```bash
npm run build
```

Check backend syntax:

```bash
node --check server/index.js
```

Smoke-test the API:

```bash
curl --fail http://localhost:5000/api/health
curl --fail http://localhost:5000/api/classes
```

Smoke-test WebSockets:

```bash
node -e "const WebSocket=require('ws'); const ws=new WebSocket('ws://localhost:5000/ws'); ws.on('message', m=>{console.log(String(m)); ws.close();});"
```

Run the concurrency check:

```bash
npm run test:concurrency
```
