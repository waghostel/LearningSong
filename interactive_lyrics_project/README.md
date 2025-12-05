# Interactive Lyrics Project

This folder contains all files related to the interactive lyrics learning application for the 2025 Nobel Prize in Physiology or Medicine.

## 🚀 Quick Deploy to Vercel

### Option 1: One-Click Deploy (Easiest)

**PowerShell:**
```powershell
.\deploy.ps1
```

**Command Prompt:**
```cmd
deploy.bat
```

### Option 2: Manual Deploy

1. Install Vercel CLI: `npm install -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`

📚 **[Complete Deployment Guide](DEPLOYMENT.md)**

## Files Included

### Core Application Files

- **interactive_lyrics.html** - Main HTML application with interactive lyrics and music player
- **kiro-showcase.html** - Showcase page explaining how Kiro was used to build LearningSong
- **kiro-showcase-simple.html** - Simplified showcase page
- **song.mp3** - Audio file for the learning song
- **lyrics.vtt** - WebVTT format lyrics with precise timestamps for synchronization
- **start_server.bat** - Batch script to start a local HTTP server

### Image Assets

- **verse1_nobel_laureates.jpg** - Visual for Verse 1 (The Laureates & The Immune System)
- **chorus_immune_tolerance.jpg** - Visual for Chorus (What is Immune Tolerance?)
- **verse2_foxp3_discovery.jpg** - Visual for Verse 2 (The Genetic Key: FOXP3)
- **bridge_future_medicine.jpg** - Visual for Bridge (Healing the Future)

### Deployment Files

- **vercel.json** - Vercel configuration
- **.vercelignore** - Files to exclude from deployment
- **package.json** - Project metadata
- **deploy.ps1** - PowerShell deployment script
- **deploy.bat** - Batch deployment script
- **DEPLOYMENT.md** - Complete deployment guide

## Local Development

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
   - Navigate to `http://localhost:8000/kiro-showcase-simple.html` to learn how this project was built
   - Covers spec-driven development, agent hooks, steering docs, and MCP integration
   - Click on cards to view copiable configurations

## Technical Details

- **Framework:** Vanilla HTML, CSS, and JavaScript
- **Fonts:** Google Fonts (Outfit, Space Grotesk)
- **Audio Sync:** WebVTT-based sentence-by-sentence highlighting
- **Design:** Modern glassmorphism with gradient accents
- **Deployment:** Vercel (static site hosting)

## Project Context

This interactive learning tool was created to explore the 2025 Nobel Prize in Physiology or Medicine, which honors Mary E. Brunkow, Fred Ramsdell, and Shimon Sakaguchi for their discovery of Peripheral Immune Tolerance.

## Deployment URLs

After deploying to Vercel, your site will be available at:
- **Homepage (Kiro Showcase)**: `https://your-project.vercel.app/`
- **Interactive Lyrics**: `https://your-project.vercel.app/interactive_lyrics.html`
- **Simple Showcase**: `https://your-project.vercel.app/kiro-showcase-simple.html`

---

**Created:** December 3, 2025  
**Last Updated:** December 6, 2025
