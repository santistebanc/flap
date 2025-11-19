# FLAP - Flight Search Application

A flight search application that aggregates results from multiple sources (Skyscanner, Kiwi.com, etc.) using React, Fastify, BullMQ, and Redis.

## Features

- **Multi-source flight search**: Aggregates results from multiple flight API providers
- **Real-time updates**: Server-Sent Events (SSE) for live search status updates
- **Job queue**: BullMQ handles parallel flight data extraction jobs
- **Redis storage**: Flight data stored in Redis with automatic expiration (2 days after departure)
- **Hot reloading**: Fast development with Docker hot reloading

## Architecture

- **Frontend**: React with shadcn/ui components, Vite for building
- **Backend**: Fastify with TypeScript
- **Queue**: BullMQ for managing flight API jobs
- **Database**: Redis for both queue storage and flight data
- **Containerization**: Docker Compose for easy development

## Data Structure

The application stores:
- **Trips**: Complete trip collections (hash of flight IDs)
- **Flights**: Individual flight segments
- **Legs**: Connections between flights in a trip
- **Deals**: Flight offers from different providers

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

### Running with Docker

1. Clone the repository
2. Create a `.env` file (or use the provided one with mock keys)
3. Run:

```bash
docker-compose up
```

This will start:
- Redis on port 6379
- Backend API on port 3001
- Frontend on port 3000

You can access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Bull Board (Queue Monitor): http://localhost:3001/admin/queues
- Redis Commander (Redis Visualizer): http://localhost:8081

### Local Development

#### Backend

```bash
cd backend
npm install
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

- `POST /api/search` - Submit a flight search
- `GET /api/search/:searchId/status` - Get search status
- `GET /api/search/:searchId/results` - Get search results
- `GET /api/search/:searchId/stream` - SSE stream for real-time updates
- `GET /admin/queues` - Bull Board dashboard for monitoring job queues

## Environment Variables

- `SKYSCANNER_API_KEY` - Skyscanner API key
- `KIWI_API_KEY` - Kiwi.com API key
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `PORT` - Backend port (default: 3001)

## Project Structure

```
flap/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Fastify server
│   │   ├── routes/            # API routes
│   │   ├── jobs/              # BullMQ job processors
│   │   ├── services/          # Queue services
│   │   ├── utils/             # Redis helpers, ID generators
│   │   └── types/             # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── services/          # API client
│   │   └── types/             # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env
└── README.md
```

## Notes

- Currently uses mock API responses for Skyscanner and Kiwi
- Replace mock functions in `backend/src/jobs/processors.ts` with actual API implementations
- Results expire 2 days after the departure date
- The worker processes up to 10 jobs in parallel

