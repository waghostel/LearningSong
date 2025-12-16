# VTT Generator Known Issues Report

**Date:** 2025-12-16
**Status:** 4 Failing Property Tests in `vtt-generator.props.test.ts`

This report documents the current test failures in the VTT generator property tests. These issues should be addressed in future maintenance cycles.

## 1. Timestamp Precision / Aggregation Issue (Property 13)

**Test:** `Property 13: Line aggregation timestamp bounds > should use last word endS as line endTime`
**Error:** Timestamp mismatch.

- **Expected:** `0.30000000000000004`
- **Received:** `0.1`

**Analysis:**
The test generates a sequence of aligned words. It seems the line aggregation logic might not always be picking up the `endTime` of the very last word in the line, or there's a disconnect between the words generated and how they are grouped. The counterexample `["!", "!0", "!"]` suggests that maybe normalization or matching logic is causing the last word to be excluded or the timestamp to be miscalculated.

**Potential Fix:**

- Verify `aggregateWordsToLines` logic for `endTime` calculation.
- Check if normalization removes the last word, causing the line end time to be the end time of the _previous_ word.

## 2. Unmatchable Lines Handling (Property 10)

**Test:** `Property 10: Graceful handling of unmatchable lines > should skip lines that use words not present in aligned words`
**Error:** Expected 1 line cue, got 0.

**Analysis:**
The test expects a line to be created even if some matching is weird, or specifically expects 1 line for the test case setup. The failure (Expected 1, Received 0) signifies that for the generated case, no line cue was produced. This might be due to stricter matching logic than the test anticipates.

**Counterexample:** `[[{"word":"?A","startS":0,"endS":0.1,"success":true,"palign":0},{"word":"!","startS":0.1,"endS":0.2,"success":true,"palign":0}]]`

**Potential Fix:**

- Review `normalizeForMatching` and the matching threshold in `aggregateWordsToLines`.
- Ensure the test case uses sufficiently "matchable" data if it expects a match, or update the test expectation if the generator _should_ skip this.

## 3. Disjoint Lyrics Handling (Property 10)

**Test:** `Property 10: Graceful handling of unmatchable lines > should handle completely disjoint lyrics and aligned words`
**Error:** Expected empty array `[]`, Received `[{...}]` (1 line cue).

**Analysis:**
The test provides aligned words and a completely different lyrics string, expecting NO match. The generator found a match.
**Counterexample:** `alignedWords=[{"word":"!"}]`, `lyrics="!!!!!"`.
It seems "!" matches "!!!!!" after normalization (perhaps both become empty or similar?).

**Potential Fix:**

- Tune the matching algorithm to be stricter about length differences or content.
- Update normalization to handle punctuation-only strings more robustly.

## 4. Line Aggregation Completeness (Property 24)

**Test:** `Property 24: Line aggregation completeness > should create line cues for all non-empty lyrics lines`
**Error:** Expected `> 0` line cues, Received `0`.

**Analysis:**
For a simple case `alignedWords=[{word:".0"}]` and corresponding lyrics, it failed to produce a line cue.
This strongly suggests that overly aggressive cleaning or normalization might be removing valid content (like numbers or punctuation that serves as the only content), preventing a line cue from generating.

**Potential Fix:**

- Check `normalizeForMatching` function. If it strips everything leaving an empty string, and the matching logic ignores empty strings, then valid "punctuation-heavy" lines might be skipped.
- Ensure generic/fallback logic exists for lines that end up "empty" after normalization but exist in source.
