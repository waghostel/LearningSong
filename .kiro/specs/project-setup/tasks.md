# Project Setup Tasks

## Task 1: Initialize Frontend Project Structure
**Depends on**: None
**Description**: Create frontend directory with Vite + React + TypeScript

**Steps**:
1. Create `frontend` directory
2. Initialize Vite project with React + TypeScript template
3. Configure pnpm as package manager
4. Create basic directory structure (src/components, src/pages, src/stores, src/api, tests)

**Acceptance**: 
- Frontend directory exists with Vite project
- `pnpm install` runs successfully
- Dev server starts with `pnpm dev`

---

## Task 2: Install Frontend Core Dependencies
**Depends on**: Task 1
**Description**: Install React, TypeScript, and build tool dependencies

**Steps**:
1. Install core dependencies: react, react-dom, typescript, vite
2. Install Vite plugins: @vitejs/plugin-react
3. Configure vite.config.ts with path aliases
4. Configure tsconfig.json for React

**Acceptance**:
- All core packages in package.json
- TypeScript compilation works
- `pnpm build` succeeds

---

## Task 3: Setup TailwindCSS and shadcn/ui
**Depends on**: Task 2
**Description**: Configure styling framework and UI components

**Steps**:
1. Install TailwindCSS and dependencies
2. Initialize Tailwind config
3. Setup shadcn/ui with components.json
4. Add Tailwind directives to main CSS
5. Install initial shadcn components (button, input, card)

**Acceptance**:
- tailwind.config.js configured
- shadcn/ui components.json exists
- Sample component renders with Tailwind styles

---

## Task 4: Install Frontend State and API Libraries
**Depends on**: Task 2
**Description**: Setup Zustand, react-query, Axios, Socket.IO client

**Steps**:
1. Install zustand
2. Install @tanstack/react-query and configure QueryClient
3. Install axios and create API client wrapper
4. Install socket.io-client
5. Create sample store and API hook

**Acceptance**:
- All packages installed
- Sample Zustand store works
- Sample react-query hook works
- Socket.IO client can connect

---

## Task 5: Configure Oxlint (Default Linter)
**Depends on**: Task 2
**Description**: Setup Oxlint as the default fast linter

**Steps**:
1. Install oxlint
2. Create oxlint.json configuration
3. Add `lint` script to package.json using oxlint
4. Configure oxlint rules for React + TypeScript

**Acceptance**:
- `pnpm lint` runs oxlint
- Oxlint catches common issues
- Linting completes in <1 second

---

## Task 6: Configure ESLint (Alternative Linter)
**Depends on**: Task 2
**Description**: Setup ESLint as comprehensive alternative linter

**Steps**:
1. Install eslint and TypeScript plugins
2. Create eslint.config.js (flat config)
3. Add `lint:eslint` script to package.json
4. Configure ESLint rules matching oxlint coverage
5. Add .eslintignore

**Acceptance**:
- `pnpm lint:eslint` runs ESLint
- ESLint catches same issues as oxlint plus more
- Both linters can coexist

---

## Task 7: Setup Jest for Frontend Testing
**Depends on**: Task 2
**Description**: Configure Jest with React Testing Library

**Steps**:
1. Install jest, ts-jest, @testing-library/react, @testing-library/jest-dom
2. Create jest.config.js with TypeScript support
3. Create tests/setup.ts for test environment
4. Add test scripts to package.json
5. Create sample component test

**Acceptance**:
- `pnpm test` runs Jest
- Sample test passes
- Coverage reporting works

---

## Task 8: Initialize Backend Project Structure
**Depends on**: None
**Description**: Create backend directory with Python + Poetry

**Steps**:
1. Create `backend` directory
2. Initialize Poetry project with `poetry init`
3. Set Python version to 3.11+
4. Create directory structure (app/, tests/)
5. Create app/main.py with basic FastAPI app

**Acceptance**:
- Backend directory exists with pyproject.toml
- `poetry install` runs successfully
- Basic FastAPI app structure in place

---

## Task 9: Install Backend Core Dependencies
**Depends on**: Task 8
**Description**: Install FastAPI, Uvicorn, and core libraries

**Steps**:
1. Add fastapi and uvicorn[standard] to Poetry
2. Add python-dotenv for environment variables
3. Add pydantic and pydantic-settings
4. Create .env.example file
5. Configure FastAPI app with CORS and basic routes

**Acceptance**:
- All core packages in pyproject.toml
- `poetry run uvicorn app.main:app` starts server
- API docs accessible at /docs

---

## Task 10: Install Backend AI and Service Dependencies
**Depends on**: Task 9
**Description**: Install LangChain, Firebase, Socket.IO

**Steps**:
1. Add langchain and langgraph
2. Add firebase-admin
3. Add python-socketio and aiohttp
4. Add httpx for async HTTP requests
5. Create service stubs (ai_pipeline.py, suno_client.py)

**Acceptance**:
- All packages installed via Poetry
- Import statements work for all libraries
- No dependency conflicts

---

## Task 11: Setup pytest for Backend Testing
**Depends on**: Task 9
**Description**: Configure pytest with async support

**Steps**:
1. Add pytest, pytest-asyncio, pytest-cov to dev dependencies
2. Create pytest.ini or pyproject.toml [tool.pytest.ini_options]
3. Create tests/conftest.py with fixtures
4. Create sample API test using httpx
5. Add test scripts

**Acceptance**:
- `poetry run pytest` runs tests
- Sample test passes
- Async tests work with pytest-asyncio

---

## Task 12: Create Root Configuration Files
**Depends on**: Task 1, Task 8
**Description**: Setup root-level configs and documentation

**Steps**:
1. Create .gitignore for Python and Node.js
2. Create root README.md with setup instructions
3. Add scripts for running both frontend and backend
4. Document environment variable requirements
5. Add .env.example files for both frontend and backend

**Acceptance**:
- .gitignore covers all generated files
- README.md has clear setup instructions
- Environment variables documented

---

## Task 13: Verify Complete Setup
**Depends on**: All previous tasks
**Description**: End-to-end verification of the setup

**Steps**:
1. Run `pnpm install` in frontend - should succeed
2. Run `pnpm lint` - should use oxlint
3. Run `pnpm lint:eslint` - should use ESLint
4. Run `pnpm test` - should pass
5. Run `poetry install` in backend - should succeed
6. Run `poetry run pytest` - should pass
7. Start both frontend and backend servers
8. Verify frontend can reach backend API

**Acceptance**:
- All commands run without errors
- Both linters work
- All tests pass
- Servers start successfully
- Basic connectivity works
