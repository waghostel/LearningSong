# Vercel Deployment Guide

This guide explains how to deploy the Interactive Lyrics Project to Vercel.

## 🎯 What's Being Deployed?

The `interactive_lyrics_project` folder contains a static HTML showcase of the LearningSong application, featuring:
- Interactive lyrics with karaoke-style synchronization
- Kiro showcase page explaining the development process
- Audio player with WebVTT lyrics sync
- Visual assets for the 2025 Nobel Prize content

## 🚀 Quick Deploy

### Method 1: Automated Script (Recommended)

Navigate to the project folder and run:

**PowerShell:**
```powershell
cd interactive_lyrics_project
.\deploy.ps1
```

**Command Prompt:**
```cmd
cd interactive_lyrics_project
deploy.bat
```

The script will:
- ✅ Check if Vercel CLI is installed
- ✅ Authenticate with Vercel
- ✅ Deploy to production
- ✅ Provide deployment URL

### Method 2: Manual CLI Deploy

1. **Install Vercel CLI** (if not installed):
   ```bash
   npm install -g vercel
   ```

2. **Navigate to project**:
   ```bash
   cd interactive_lyrics_project
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Deploy**:
   ```bash
   vercel --prod
   ```

### Method 3: Git + Vercel Dashboard (No CLI Required)

1. **Push to Git**:
   ```bash
   git add .
   git commit -m "Add Vercel deployment configuration"
   git push
   ```

2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your Git repository
   - Set **Root Directory** to `interactive_lyrics_project`
   - Click "Deploy"

3. **Done!** Your site will be live at `https://your-project.vercel.app`

## 📁 Project Structure

```
interactive_lyrics_project/
├── kiro-showcase.html           # Kiro showcase (homepage) ✨
├── interactive_lyrics.html      # Interactive lyrics application
├── kiro-showcase-simple.html    # Simplified showcase page
├── song.mp3                     # Audio file
├── lyrics.vtt                   # Lyrics with timestamps
├── *.jpg                        # Image assets
├── vercel.json                  # Vercel configuration ✨
├── .vercelignore                # Deployment exclusions ✨
├── package.json                 # Project metadata ✨
├── deploy.ps1                   # PowerShell deploy script ✨
├── deploy.bat                   # Batch deploy script ✨
└── DEPLOYMENT.md                # Detailed guide ✨
```

Files marked with ✨ were created for Vercel deployment.

## 🔧 Configuration Files

### `vercel.json`
Configures Vercel to:
- Serve all static files (HTML, MP3, VTT, JPG)
- Set homepage to `kiro-showcase.html` (Kiro showcase as landing page)
- Enable proper routing

### `.vercelignore`
Excludes unnecessary files:
- `start_server.bat` (local development only)
- `README.md` (documentation)

### `package.json`
Minimal package.json for Vercel to recognize the project.

## 🌐 URLs After Deployment

- **Homepage (Kiro Showcase)**: `https://your-project.vercel.app/` → `kiro-showcase.html`
- **Interactive Lyrics**: `https://your-project.vercel.app/interactive_lyrics.html`
- **Simple Showcase**: `https://your-project.vercel.app/kiro-showcase-simple.html`

## 🔄 Redeployment

### Via Git (Automatic)
If connected to a Git repository:
```bash
git add .
git commit -m "Update content"
git push
```
Vercel will automatically redeploy.

### Via CLI (Manual)
```bash
cd interactive_lyrics_project
vercel --prod
```

## 🎨 Custom Domain (Optional)

1. Go to your project in Vercel Dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## 🐛 Troubleshooting

### Issue: Vercel CLI not found
**Solution**: Install with `npm install -g vercel`

### Issue: Not logged in
**Solution**: Run `vercel login` and follow authentication flow

### Issue: 404 Not Found after deployment
**Solution**: 
- Ensure `vercel.json` is in `interactive_lyrics_project` folder
- Check that all HTML files are present
- Verify file paths are relative (not absolute)

### Issue: Audio/Images not loading
**Solution**:
- Verify files are not in `.vercelignore`
- Check file paths in HTML are relative
- Ensure files are committed to Git (if using Git deployment)

### Issue: Deployment fails
**Solution**: Run with debug mode:
```bash
vercel --prod --debug
```

## 📚 Additional Resources

- **Detailed Guide**: See `interactive_lyrics_project/DEPLOYMENT.md`
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)

## 🎯 Next Steps

1. Deploy the project using one of the methods above
2. Test the deployed site
3. Share the URL with others
4. (Optional) Add a custom domain

---

**Created**: December 6, 2025
