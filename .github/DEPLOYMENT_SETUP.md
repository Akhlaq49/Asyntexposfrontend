# GitHub Actions Deployment Setup Guide

## Overview
This workflow automatically builds your React app and deploys it to Plesk server on every GitHub release.

**Features:**
- ✅ Builds React/Vite project
- ✅ Zips `dist/assets/` folder
- ✅ Backs up existing files on server (with timestamps)
- ✅ Uploads new files via FTP
- ✅ Automatically unzips assets on server
- ✅ Sends Slack notifications on success/failure
- ✅ Verifies deployment

---

## Step 1: Configure GitHub Secrets

Go to your GitHub repository:
1. Click **Settings** tab
2. Click **Secrets and variables** → **Actions** (in left sidebar)
3. Click **New repository secret** and add each of these:

### Required Secrets

| Secret Name | Description | Example |
|---|---|---|
| `FTP_HOST` | FTP server hostname or IP | `ftp.reactapp.asyntexconsultancy.com` or `192.168.x.x` |
| `FTP_USERNAME` | FTP username | Your Plesk FTP username |
| `FTP_PASSWORD` | FTP password | Your Plesk FTP password |
| `FTP_TARGET_PATH` | Plesk deployment folder path | `/reactapp.asyntexconsultancy.com` |

### Optional Secret for Notifications

| Secret Name | Description | Example |
|---|---|---|
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX` |

---

## Step 2: Get Your FTP Credentials

### From Plesk Control Panel:
1. Log in to Plesk
2. Go to **Files** → **File Manager**
3. Note your FTP access details (usually shown at top)
4. Or go to **Hosting Settings** → **FTP Access** for username/password

### What to use:
- **FTP_HOST**: Get from Plesk → Hosting Settings or File Manager
- **FTP_USERNAME**: Typically in format `username@domain.com`
- **FTP_PASSWORD**: Your Plesk FTP password
- **FTP_TARGET_PATH**: The public directory where your app lives (e.g., `/reactapp.asyntexconsultancy.com` or `/httpdocs`)

---

## Step 3: Setup Slack Notifications (Optional)

### To receive deployment notifications in Slack:

1. Go to your Slack workspace
2. Create a new channel (or use existing): `#deployments`
3. Go to **Slack App Directory** → Search "Incoming Webhooks"
4. Click **Install** → Select your channel → **Add Incoming Webhooks Integration**
5. Copy the **Webhook URL**
6. Add it as GitHub Secret `SLACK_WEBHOOK_URL`

**If you skip this**, the workflow will still deploy successfully — just won't send Slack notifications.

---

## Step 4: Verify Build Output Locally

Before deploying, test locally:

```bash
npm run build
```

This creates `dist/` folder with:
- `dist/index.html` — your main HTML file
- `dist/assets/` — CSS, JS, images, fonts (this gets zipped)

---

## Step 5: Create a Release to Trigger Deployment

### Option A: Use GitHub UI
1. Go to your repo → **Releases**
2. Click **Create a new release**
3. Tag version: `v1.0.0` (or `v0.0.1`)
4. Title: `Release v1.0.0`
5. Description: Add release notes
6. Click **Publish release**

### Option B: Create Release from Command Line
```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Step 6: Monitor Deployment

1. Go to your repo → **Actions** tab
2. You'll see workflow running: `Deploy to Plesk`
3. Click it to see real-time logs
4. Check for success ✅ or failure ❌

### Troubleshooting:
- **FTP connection failed**: Check `FTP_HOST`, `FTP_USERNAME`, `FTP_PASSWORD` are correct
- **Build failed**: Run `npm run build` locally to debug
- **Unzip failed**: Server may require SSH access (manual unzip via Plesk)

---

## Step 7: Verify Files on Plesk

After successful deployment:

1. Log into Plesk
2. Go to **File Manager** → `reactapp.asyntexconsultancy.com`
3. You should see:
   - `index.html` (newly uploaded)
   - `assets/` folder (unzipped from `assets.zip`)
   - `assets.backup.YYYYMMDD_HHMMSS/` (old backup)
   - `index.html.backup.YYYYMMDD_HHMMSS` (old backup)

4. Test app: Open `https://reactapp.asyntexconsultancy.com` in browser

---

## File Structure

```
.github/
  workflows/
    deploy.yml          ← Main deployment workflow
DEPLOYMENT_SETUP.md     ← This file
```

---

## What Happens During Deployment

1. **Checkout** → Clones your repo code
2. **Setup Node.js** → Installs Node v20
3. **Install** → Runs `npm ci` (installs dependencies)
4. **Build** → Runs `npm run build` (creates optimized `dist/`)
5. **Verify** → Checks `dist/assets/` exists
6. **Zip** → Creates `assets.zip` from `dist/assets/`
7. **Backup** → Renames old `assets/` and `index.html` with timestamp
8. **Upload** → Sends `assets.zip` and `index.html` to Plesk via FTP
9. **Unzip** → Executes `unzip` command on server to extract assets
10. **Verify** → Lists files on server to confirm
11. **Notify** → Sends Slack message (success/failure)

---

## Rollback (If Needed)

If deployment breaks your site:

1. Log into Plesk → **File Manager** → `reactapp.asyntexconsultancy.com`
2. Delete current `assets/` folder
3. Rename `assets.backup.YYYYMMDD_HHMMSS/` → `assets/` (remove backup suffix)
4. Replace `index.html` with `index.html.backup.YYYYMMDD_HHMMSS`
5. Refresh browser (clear cache if needed)

---

## FAQ

**Q: Can I deploy to multiple environments (staging/prod)?**
A: Yes! Create separate workflows with different `FTP_TARGET_PATH` secrets, triggered by different branch events (e.g., `staging` branch vs `main` branch).

**Q: What if my FTP doesn't support remote execution (unzip)?**
A: The workflow will still upload files. You'll need to manually unzip via Plesk File Manager, or use SSH if available.

**Q: How do I disable Slack notifications?**
A: Leave `SLACK_WEBHOOK_URL` secret empty or remove the Slack steps from workflow.

**Q: Can I test the workflow without creating a full release?**
A: For testing, temporarily change `on:` trigger to `on: workflow_dispatch` to allow manual runs.

---

## Support

If deployment fails:
1. Check **Actions** tab → workflow logs
2. Verify all secrets are correct
3. Test FTP credentials manually with an FTP client
4. Check that `npm run build` works locally

---

**Last Updated:** April 30, 2026
