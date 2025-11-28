/**
 * Property-based tests for SongPlaybackPage component
 * Using fast-check for property-based testing
 */
import * as fc from 'fast-check'
import { mapErrorToUserFriendly } from '@/pages/SongPlaybackPage'

describe('SongPlaybackPage Property Tests', () => {
  /**
   * **Feature: page-c-song-playback, Property 7: Error Message User-Friendliness**
   * **Validates: Requirements 9.3**
   *
   * For any backend error response, the displayed error message SHALL NOT contain
   * technical details such as stack traces, internal error codes, or system paths.
   */
  describe('Property 7: Error Message User-Friendliness', () => {
    // Patterns that indicate technical details that should NOT appear in user-facing messages
    const technicalPatterns = [
      /at\s+\w+\s*\(/i, // Stack trace pattern: "at functionName ("
      /^\s*at\s+/m, // Stack trace line start
      /Error:\s*\w+Error/i, // Error type names like "TypeError", "ReferenceError"
      /\/[a-z_]+\/[a-z_]+\//i, // Unix-style paths like /usr/local/
      /[A-Z]:\\[^\\]+\\/i, // Windows-style paths like C:\Users\
      /node_modules/i, // Node modules path
      /\.js:\d+:\d+/i, // File:line:column pattern
      /\.ts:\d+:\d+/i, // TypeScript file:line:column
      /ECONNREFUSED/i, // Network error codes
      /ETIMEDOUT/i, // Timeout error codes
      /ENOTFOUND/i, // DNS error codes
      /errno/i, // System error numbers
      /syscall/i, // System call names
      /\bcode:\s*['"]?\w+['"]?/i, // Error code properties
      /\bstatus:\s*\d{3}/i, // HTTP status in error object format
      /\{\s*"error"/i, // JSON error objects
      /traceback/i, // Python traceback
      /exception/i, // Exception keyword
      /null pointer/i, // Null pointer errors
      /undefined is not/i, // JavaScript type errors
      /cannot read propert/i, // Property access errors
    ]

    // Generator for technical error messages that should be sanitized
    const technicalErrorGenerator = fc.oneof(
      // Stack traces
      fc.constant('Error: Something failed\n    at processRequest (/app/src/api/handler.js:42:15)\n    at async Router.handle'),
      fc.constant('TypeError: Cannot read property "id" of undefined\n    at Object.<anonymous> (C:\\Users\\dev\\project\\src\\index.ts:10:5)'),
      
      // System paths
      fc.constant('Failed to read file /var/log/app/error.log'),
      fc.constant('ENOENT: no such file or directory, open "C:\\temp\\data.json"'),
      
      // Network error codes
      fc.constant('connect ECONNREFUSED 127.0.0.1:5432'),
      fc.constant('getaddrinfo ENOTFOUND api.example.com'),
      fc.constant('read ETIMEDOUT'),
      
      // Internal error codes
      fc.constant('Error code: ERR_INTERNAL_SERVER_500'),
      fc.constant('status: 500, code: "INTERNAL_ERROR"'),
      
      // JSON error objects
      fc.constant('{"error": "DatabaseConnectionError", "code": "DB_001", "stack": "..."}'),
      
      // Python-style errors
      fc.constant('Traceback (most recent call last):\n  File "app.py", line 42'),
      
      // Generic technical messages
      fc.constant('NullPointerException at com.app.Service.process'),
      fc.constant('syscall: connect, errno: -111'),
      
      // Random technical-looking strings
      fc.tuple(
        fc.constantFrom('Error', 'Exception', 'Failed'),
        fc.constantFrom(':', ' at ', ' in '),
        fc.stringMatching(/^[a-zA-Z]+\.[a-zA-Z]+/)
      ).map(([prefix, sep, detail]) => `${prefix}${sep}${detail}`)
    )

    it('should never expose stack traces in user-facing messages', () => {
      fc.assert(
        fc.property(technicalErrorGenerator, (technicalError) => {
          const userMessage = mapErrorToUserFriendly(technicalError)

          // Check that no technical patterns appear in the output
          for (const pattern of technicalPatterns) {
            expect(userMessage).not.toMatch(pattern)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should always return a non-empty user-friendly message', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(), // Random strings
            technicalErrorGenerator, // Technical errors
            fc.constant(null), // Null
            fc.constant(''), // Empty string
          ),
          (errorInput) => {
            const userMessage = mapErrorToUserFriendly(errorInput as string | null)

            // Should always return a non-empty string
            expect(typeof userMessage).toBe('string')
            expect(userMessage.length).toBeGreaterThan(0)

            // Should not contain technical patterns
            for (const pattern of technicalPatterns) {
              expect(userMessage).not.toMatch(pattern)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle Error objects without exposing internals', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.oneof(
              fc.string(),
              technicalErrorGenerator
            ),
            name: fc.constantFrom('Error', 'TypeError', 'NetworkError', 'ApiError'),
          }),
          (errorProps) => {
            const error = new Error(errorProps.message)
            error.name = errorProps.name
            
            const userMessage = mapErrorToUserFriendly(error)

            // Should always return a non-empty string
            expect(typeof userMessage).toBe('string')
            expect(userMessage.length).toBeGreaterThan(0)

            // Should not contain technical patterns
            for (const pattern of technicalPatterns) {
              expect(userMessage).not.toMatch(pattern)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should map known HTTP status codes to friendly messages', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '404 Not Found',
            'Error 404: Resource not found',
            '410 Gone',
            'HTTP 403 Forbidden',
            '429 Too Many Requests',
            'Rate limit exceeded (429)'
          ),
          (httpError) => {
            const userMessage = mapErrorToUserFriendly(httpError)

            // Should return a user-friendly message
            expect(userMessage.length).toBeGreaterThan(0)

            // Should not contain raw HTTP status codes in technical format
            expect(userMessage).not.toMatch(/\b\d{3}\b/)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
