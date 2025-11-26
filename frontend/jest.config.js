/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleNameMapper: {
    '^@/api/client$': '<rootDir>/src/api/__mocks__/client.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'node',
          types: ['jest', '@testing-library/jest-dom', 'node'],
          skipLibCheck: true,
        },
      },
    ],
  },
  globals: {
    'import.meta': {
      env: {
        VITE_API_URL: 'http://localhost:8000',
        VITE_WS_URL: 'http://localhost:8000',
      },
    },
  },
};
