# RachelFoods Platform

Human-assisted food commerce platform

## Project Structure

```
├── backend/          # NestJS API server
├── frontend/         # Next.js web application
├── mobile/           # React Native mobile app
└── docs/             # Documentation
```

## Tech Stack

**Backend:**
- TypeScript, Node.js
- NestJS framework
- PostgreSQL + Prisma ORM

**Frontend:**
- TypeScript
- Next.js (App Router)
- Tailwind CSS
- React Query

**Mobile:**
- React Native

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL
- npm >= 9.0.0

### Installation

```bash
# Install dependencies
npm install

# Setup backend
cd backend
npm install
cp .env.example .env
# Configure your DATABASE_URL in .env
npx prisma generate

# Setup frontend
cd ../frontend
npm install
```

### Development

```bash
# Run backend
npm run dev:backend

# Run frontend (in another terminal)
npm run dev:frontend
```

### Build

```bash
# Build all projects
npm run build:backend
npm run build:frontend
```

## Development Guidelines

- Read `/docs/COPILOT_CONTEXT.md` before writing code
- Follow module boundaries strictly
- Never bypass seller confirmation workflow
- All shipping must go through the Shipping Engine

## License

Proprietary
