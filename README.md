# CodeDraft — Real-Time Competitive Coding Battle Platform

You write the problem. You win the battle.

CodeDraft is a real-time competitive coding battle platform where participants write custom problems with hidden test cases and a reference solution validator before battling opponents who see the problem for the first time at match start.

## Features

- **User-Generated Problems** — No admin-written problem bank. Every problem is written by participants.
- **1v1 & 2v2 Battles** — Race to pass all hidden test cases first.
- **Reference Solution Validator** — Creator's solution must pass their own test cases before the problem goes live.
- **ELO Rating System** — Dynamic K-factor, fairness adjustments for problem writer advantage.
- **Live Spectator Mode** — Watch battles in real-time with crowd predictions.
- **Draft Tournaments** — Bracket-style tournaments where problem writing rotates each round.
- **College League** — Private leaderboards, inter-college challenges, monthly seasons.
- **Match Replay** — Every battle stored as event timeline, replayable with scrubber bar.
- **Problem Hall of Fame** — Community-rated problems surfaced for reuse.

## Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, Framer Motion, Monaco Editor, Socket.io-client, Recharts

**Backend:** Node.js, Express, MongoDB, Socket.io, JWT, Judge0 API, Node vm fallback

## Getting Started

### Backend

```bash
cd backend
cp .env.example .env
# Fill in your MongoDB URI, JWT secret, and other variables
npm install
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## License

MIT
