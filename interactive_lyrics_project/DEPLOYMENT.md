# Deployment Guide for Interactive Lyrics Project

This guide explains how to deploy the Interactive Lyrics Project to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional): Install with `npm i -g vercel`

## Deployment Methods

### Method 1: Deploy via Vercel Dashboard (Easiest)

1. **Push to Git Repository**:
   ```bash
   git add .
   git commit -m "Add Vercel configuration"
   git push
   ```

2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your Git repository
   - Set **Root Directory** to `interactive_lyrics_project`
   - Click "Deploy"

3. **Done!** Your site will be live at `https://your-project.vercel.app`

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Navigate to project directory**:
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

5. **Follow the prompts**:
   - Set up and deploy? `Y`
   - Which scope? Select your account
   - Link to existing project? `N`
   - Project name? `interactive-lyrics-project` (or your choice)
   - In which directory is your code located? `./`

6. **Done!** Your deployment URL will be displayed

## Configuration Files

The following files have been created for Vercel deployment:

### `vercel.json`
Configures Vercel to serve static files and set the homepage to `interactive_lyrics.html`.

### `.vercelignore`
Excludes unnecessary files from deployment (README.md, start_server.bat).

### `package.json`
Minimal package.json for Vercel to recognize the project.

## Project Structure

```
interactive_lyrics_project/
├── interactive_lyrics.html      # Main application (homepage)
├── kiro-showcase.html           # Kiro showcase page
├── kiro-showcase-simple.html    # Simplified showcase
├── song.mp3                     # Audio file
├── lyrics.vtt                   # Lyrics with timestamps
├── *.jpg                        # Image assets
├── vercel.json                  # Vercel configuration
├── .vercelignore                # Files to exclude
└── package.json                 # Project metadata
```

## URLs After Deployment

- **Homepage**: `https://your-project.vercel.app/` → `interactive_lyrics.html`
- **Showcase**: `https://your-project.vercel.app/kiro-showcase-simple.html`
- **Full Showcase**: `https://your-project.vercel.app/kiro-showcase.html`

## Custom Domain (Optional)

1. Go to your project in Vercel Dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Troubleshooting

### Issue: 404 Not Found
- **Solution**: Ensure `vercel.json` is in the root of `interactive_lyrics_project`
- Check that all HTML files are present

### Issue: Audio/Images Not Loading
- **Solution**: Verify file paths are relative (not absolute)
- Check that files are included in deployment (not in `.vercelignore`)

### Issue: Deployment Fails
- **Solution**: Run `vercel --debug` for detailed logs
- Ensure you're in the correct directory

## Environment Variables

This project doesn't require environment variables as it's a static site.

## Redeployment

To redeploy after making changes:

**Via Git (if connected to repository)**:
```bash
git add .
git commit -m "Update content"
git push
```
Vercel will automatically redeploy.

**Via CLI**:
```bash
cd interactive_lyrics_project
vercel --prod
```

## Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)

---

**Created**: December 6, 2025
