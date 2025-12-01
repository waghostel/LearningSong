/**
 * Property-based tests for analytics tracking
 * 
 * Feature: dual-song-selection
 * Tests analytics event logging for variation selection, playback, and sharing
 */

import fc from 'fast-check'
import {
  logVariationSelection,
  logPlaybackStart,
  logPlaybackPause,
  logPlaybackEnd,
  logShareLinkCreated,
} from '@/lib/analytics'

describe('Analytics Property Tests', () => {
  let consoleLogSpy: jest.SpyInstance

  beforeEach(() => {
    // Spy on console.log to capture analytics events
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  describe('Property 26: Selection event logging', () => {
    it('should log variation selection with correct data for all valid inputs', () => {
      /**
       * Feature: dual-song-selection, Property 26: Selection event logging
       * Validates: Requirements 10.1, 10.3
       * 
       * For any variation selection, the system should log an analytics event
       * containing the variation_index, timestamp, and user context.
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }), // songId
          fc.integer({ min: 0, max: 1 }), // variationIndex
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }), // userId (optional)
          (songId, variationIndex, userId) => {
            // Clear previous calls
            consoleLogSpy.mockClear()

            // Log variation selection
            logVariationSelection(songId, variationIndex, userId)

            // Verify console.log was called
            expect(consoleLogSpy).toHaveBeenCalledTimes(1)

            // Get the logged event
            const logCall = consoleLogSpy.mock.calls[0]
            expect(logCall[0]).toBe('[Analytics]')

            const event = logCall[1]

            // Verify event structure
            expect(event).toHaveProperty('event_type', 'variation_selected')
            expect(event).toHaveProperty('song_id', songId)
            expect(event).toHaveProperty('variation_index', variationIndex)
            expect(event).toHaveProperty('timestamp')
            
            // Verify timestamp is valid ISO string
            expect(() => new Date(event.timestamp)).not.toThrow()
            expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp)

            // Verify user_id if provided
            if (userId !== undefined) {
              expect(event).toHaveProperty('user_id', userId)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include timestamp for all selection events', () => {
      /**
       * Feature: dual-song-selection, Property 26: Selection event logging
       * Validates: Requirements 10.3
       * 
       * For any selection event, the timestamp should be included and valid.
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 0, max: 1 }),
          (songId, variationIndex) => {
            consoleLogSpy.mockClear()

            const beforeTime = new Date()
            logVariationSelection(songId, variationIndex)
            const afterTime = new Date()

            const event = consoleLogSpy.mock.calls[0][1]
            const eventTime = new Date(event.timestamp)

            // Timestamp should be between before and after
            expect(eventTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
            expect(eventTime.getTime()).toBeLessThanOrEqual(afterTime.getTime())
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 27: Play event tracking', () => {
    it('should log playback start with correct variation index for all valid inputs', () => {
      /**
       * Feature: dual-song-selection, Property 27: Play event tracking
       * Validates: Requirements 10.2
       * 
       * For any playback start event, the system should record which
       * variation_index is being played.
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }), // songId
          fc.integer({ min: 0, max: 1 }), // variationIndex
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }), // userId (optional)
          (songId, variationIndex, userId) => {
            consoleLogSpy.mockClear()

            // Log playback start
            logPlaybackStart(songId, variationIndex, userId)

            // Verify console.log was called
            expect(consoleLogSpy).toHaveBeenCalledTimes(1)

            const event = consoleLogSpy.mock.calls[0][1]

            // Verify event structure
            expect(event).toHaveProperty('event_type', 'playback_started')
            expect(event).toHaveProperty('song_id', songId)
            expect(event).toHaveProperty('variation_index', variationIndex)
            expect(event).toHaveProperty('timestamp')

            // Verify timestamp is valid
            expect(() => new Date(event.timestamp)).not.toThrow()

            // Verify user_id if provided
            if (userId !== undefined) {
              expect(event).toHaveProperty('user_id', userId)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should log playback pause with current time for all valid inputs', () => {
      /**
       * Feature: dual-song-selection, Property 27: Play event tracking
       * Validates: Requirements 10.2
       * 
       * For any playback pause event, the system should record the variation
       * and current playback position.
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 0, max: 1 }),
          fc.float({ min: 0, max: 300 }), // currentTime in seconds
          (songId, variationIndex, currentTime) => {
            consoleLogSpy.mockClear()

            logPlaybackPause(songId, variationIndex, currentTime)

            const event = consoleLogSpy.mock.calls[0][1]

            expect(event).toHaveProperty('event_type', 'playback_paused')
            expect(event).toHaveProperty('song_id', songId)
            expect(event).toHaveProperty('variation_index', variationIndex)
            expect(event).toHaveProperty('current_time', currentTime)
            expect(event).toHaveProperty('timestamp')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should log playback end with variation index for all valid inputs', () => {
      /**
       * Feature: dual-song-selection, Property 27: Play event tracking
       * Validates: Requirements 10.2
       * 
       * For any playback end event, the system should record which variation
       * finished playing.
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 0, max: 1 }),
          (songId, variationIndex) => {
            consoleLogSpy.mockClear()

            logPlaybackEnd(songId, variationIndex)

            const event = consoleLogSpy.mock.calls[0][1]

            expect(event).toHaveProperty('event_type', 'playback_ended')
            expect(event).toHaveProperty('song_id', songId)
            expect(event).toHaveProperty('variation_index', variationIndex)
            expect(event).toHaveProperty('timestamp')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 28: Share link uses primary variation', () => {
    it('should log share link creation with primary variation index for all valid inputs', () => {
      /**
       * Feature: dual-song-selection, Property 28: Share link uses primary variation
       * Validates: Requirements 10.4
       * 
       * For any song share operation, the system should log the primary
       * variation index that is being shared.
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }), // songId
          fc.integer({ min: 0, max: 1 }), // primaryVariationIndex
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }), // userId (optional)
          (songId, primaryVariationIndex, userId) => {
            consoleLogSpy.mockClear()

            // Log share link creation
            logShareLinkCreated(songId, primaryVariationIndex, userId)

            // Verify console.log was called
            expect(consoleLogSpy).toHaveBeenCalledTimes(1)

            const event = consoleLogSpy.mock.calls[0][1]

            // Verify event structure
            expect(event).toHaveProperty('event_type', 'share_link_created')
            expect(event).toHaveProperty('song_id', songId)
            expect(event).toHaveProperty('primary_variation_index', primaryVariationIndex)
            expect(event).toHaveProperty('timestamp')

            // Verify timestamp is valid
            expect(() => new Date(event.timestamp)).not.toThrow()

            // Verify user_id if provided
            if (userId !== undefined) {
              expect(event).toHaveProperty('user_id', userId)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should always include primary_variation_index in share events', () => {
      /**
       * Feature: dual-song-selection, Property 28: Share link uses primary variation
       * Validates: Requirements 10.4
       * 
       * For any share link creation, the primary variation index must be
       * included to ensure the correct variation is shared.
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 0, max: 1 }),
          (songId, primaryVariationIndex) => {
            consoleLogSpy.mockClear()

            logShareLinkCreated(songId, primaryVariationIndex)

            const event = consoleLogSpy.mock.calls[0][1]

            // Primary variation index must be present and match input
            expect(event.primary_variation_index).toBe(primaryVariationIndex)
            
            // Should be 0 or 1
            expect(event.primary_variation_index).toBeGreaterThanOrEqual(0)
            expect(event.primary_variation_index).toBeLessThanOrEqual(1)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
