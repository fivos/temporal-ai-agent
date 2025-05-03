# Temporal AI Agent

A Next.js application using the App Router (Next.js 13+) with Temporal.io for workflow orchestration.

## Features

- Modern Next.js App Router architecture
- TypeScript configuration for Next.js
- Temporal.io for durable execution
- AI chat interface with multiple model options

## Development

```bash
# Run the development server
npm run dev

# Run both Next.js app and Temporal worker
npm run dev:combined

# Run everything including the Temporal UI
npm run dev:all
```

## Running Temporal Locally

To run Temporal locally using Docker:

```bash
git clone https://github.com/temporalio/docker-compose.git
cd docker-compose
docker compose up
```
