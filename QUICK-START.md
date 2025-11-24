# 🚀 Quick Start Guide

Get LearningSong up and running in 30 seconds!

## Prerequisites

Make sure you have these installed:
- ✅ Node.js 18+ 
- ✅ pnpm (`npm install -g pnpm`)
- ✅ Python 3.11+
- ✅ Poetry ([installation guide](https://python-poetry.org/docs/#installation))

## Start Development

### One Command Start 🎯

```powershell
.\start-dev.ps1
```

That's it! The script will:
1. ✅ Check prerequisites
2. ✅ Create `.env` files
3. ✅ Install dependencies
4. ✅ Start both servers

### Access Your App

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

## Stop Development

```powershell
.\stop-dev.ps1
```

## What's Working?

✅ **Text Input Page** - Fully functional
- Paste educational content (up to 10,000 words)
- Toggle Google Search enrichment
- Generate lyrics button
- Rate limit tracking (3 songs/day)

🚧 **Coming Soon:**
- Lyrics Editing Page
- Song Generation Page

## Need Help?

- 📚 [Full Documentation](docs/README.md)
- 🔧 [Development Scripts Guide](DEV-SCRIPTS.md)
- 🐛 [Troubleshooting](docs/troubleshooting.md)
- 📖 [Main README](README.md)

## Common Issues

### "Execution of scripts is disabled"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port Already in Use
```powershell
.\stop-dev.ps1
```

### Missing Dependencies
The start script installs them automatically, but you can also:
```bash
cd frontend && pnpm install
cd backend && poetry install
```

---

**Happy Coding! 🎉**
