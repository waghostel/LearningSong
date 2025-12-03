# Interactive Lyrics Project

This folder contains all files related to the interactive lyrics learning application for the 2025 Nobel Prize in Physiology or Medicine.

## Files Included

### Core Application Files

- **interactive_lyrics.html** - Main HTML application with interactive lyrics and music player
- **kiro-showcase.html** - Showcase page explaining how Kiro was used to build LearningSong
- **song.mp3** - Audio file for the learning song
- **lyrics.vtt** - WebVTT format lyrics with precise timestamps for synchronization
- **start_server.bat** - Batch script to start a local HTTP server

### Image Assets

- **verse1_nobel_laureates.jpg** - Visual for Verse 1 (The Laureates & The Immune System)
- **chorus_immune_tolerance.jpg** - Visual for Chorus (What is Immune Tolerance?)
- **verse2_foxp3_discovery.jpg** - Visual for Verse 2 (The Genetic Key: FOXP3)
- **bridge_future_medicine.jpg** - Visual for Bridge (Healing the Future)

## How to Use

1. **Start the local server:**
   - Double-click `start_server.bat` or run `python -m http.server 8000` in this directory
2. **Open the application:**

   - Navigate to `http://localhost:8000/interactive_lyrics.html` in your web browser

3. **Features:**
   - Click on any lyric card to view scientific context
   - Click on individual lyric lines to jump to that point in the song
   - Play/pause the music using the player at the bottom
   - Lyrics highlight automatically as the song plays
   - Header auto-hides during playback for better viewing experience
   - Navigation bar links to the Kiro showcase page

4. **Kiro Showcase Page:**
   - Navigate to `http://localhost:8000/kiro-showcase.html` to learn how this project was built
   - Covers spec-driven development, agent hooks, steering docs, and MCP integration
   - Click on cards to view copiable configurations in popup modals

## Technical Details

- **Framework:** Vanilla HTML, CSS, and JavaScript
- **Fonts:** Google Fonts (Outfit, Space Grotesk)
- **Audio Sync:** WebVTT-based sentence-by-sentence highlighting
- **Design:** Modern glassmorphism with gradient accents

## Project Context

This interactive learning tool was created to explore the 2025 Nobel Prize in Physiology or Medicine, which honors Mary E. Brunkow, Fred Ramsdell, and Shimon Sakaguchi for their discovery of Peripheral Immune Tolerance.

---

**Created:** December 3, 2025  
**Last Updated:** December 3, 2025
