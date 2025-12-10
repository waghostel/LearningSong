# Project Setup Requirements

## Overview
Set up a complete development environment for the AI Learning Song Creator MVP, including frontend (React + TypeScript) and backend (Python + FastAPI) with proper tooling and dependencies.

## Acceptance Criteria

### AC1: Frontend Environment Setup
- React + TypeScript + Vite project initialized in `/frontend` directory
- pnpm as package manager
- Oxlint configured as default linter with ESLint as switchable option
- Jest configured for testing
- TailwindCSS + shadcn/ui installed and configured
- Zustand for state management
- react-query for API management
- Socket.IO client for WebSocket communication
- Axios for HTTP requests

### AC2: Backend Environment Setup
- Python + FastAPI project initialized in `/backend` directory
- Poetry for dependency management
- pytest configured for testing
- Firebase Admin SDK installed
- Socket.IO server for WebSocket
- LangChain/LangGraph for AI pipeline
- Pydantic for data validation
- Python-dotenv for environment variables

### AC3: Linting Configuration
- Oxlint as default linter (fast, minimal config)
- ESLint available via `--eslint` flag or npm script
- Both linters configured with TypeScript support
- Consistent code style rules

### AC4: Testing Setup
- Jest configured for frontend with TypeScript support
- pytest configured for backend
- Test directories created (`frontend/tests`, `backend/tests`)
- Sample test files to verify setup

### AC5: Project Structure
```
/
├── frontend/
│   ├── src/
│   ├── tests/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── oxlint.json
│   └── eslint.config.js
├── backend/
│   ├── app/
│   ├── tests/
│   ├── pyproject.toml
│   ├── poetry.lock
│   └── .env.example
├── .gitignore
└── README.md
```

## Non-Goals
- Firebase deployment configuration (future task)
- Suno API integration (future task)
- Database schema implementation (future task)
- CI/CD pipeline setup (future task)
