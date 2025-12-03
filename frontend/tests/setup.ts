import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'
import { TextEncoder, TextDecoder } from 'util'
import { Response } from 'node-fetch'

// Extend Jest matchers with jest-dom and jest-axe
// Type augmentation for jest-dom matchers is handled by the import
expect.extend(toHaveNoViolations)

// Polyfill TextEncoder/TextDecoder for react-router
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as typeof global.TextDecoder

// Polyfill Response for Firebase
global.Response = Response as unknown as typeof global.Response

// Mock import.meta.env for Vite
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_URL: 'http://localhost:8001',
      },
    },
  },
})

// Mock fetch for Firebase
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({}),
    text: async () => '',
  })
) as jest.Mock

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock localStorage with proper jest functions
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: jest.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
  }
})()

global.localStorage = localStorageMock as Storage

// Mock Firebase modules
jest.mock('@/lib/firebase', () => ({
  auth: {},
  signInAnonymously: jest.fn(),
}))

// Mock API client to avoid import.meta.env issues
jest.mock('@/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}))

// Mock scrollIntoView for components that use auto-scroll
Element.prototype.scrollIntoView = jest.fn()
