import 'jest-axe'

// Extend Jest's expect matchers with jest-axe
declare global {
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R, T = unknown> {
      /**
       * Check if the axe results have no violations
       */
      toHaveNoViolations(): R
    }
  }
}

// Also extend @jest/expect for newer Jest versions
declare module '@jest/expect' {
  interface Matchers<R> {
    toHaveNoViolations(): R
  }
}

export {}
