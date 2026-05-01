# Pre-Deployment Checklist

Use this checklist before deploying to production.

---

## GitHub Secrets Configuration
- [ ] `FTP_HOST` added and verified (get from Plesk)
- [ ] `FTP_USERNAME` added and verified
- [ ] `FTP_PASSWORD` added and verified  
- [ ] `FTP_TARGET_PATH` added and verified (e.g., `/reactapp.asyntexconsultancy.com`)
- [ ] `SLACK_WEBHOOK_URL` added (optional, for notifications)

**Verification**: Try connecting to FTP manually using these credentials

---

## Local Build Verification
- [ ] Run `npm run build` locally
- [ ] Verify `dist/` folder created
- [ ] Verify `dist/assets/` folder exists with CSS, JS, images
- [ ] Verify `dist/index.html` exists and contains correct content
- [ ] Test locally with `npm run preview` (serve dist folder)

---

## Repository Status
- [ ] All code committed to `main` or deployment branch
- [ ] No uncommitted changes
- [ ] Latest version of code pushed to GitHub
- [ ] Branch protections configured (if applicable)

---

## Release Creation
- [ ] Decide on version number (e.g., `v1.0.0`)
- [ ] Create release in GitHub (go to Releases tab → Create new release)
- [ ] Tag: `v1.0.0`
- [ ] Title: `Release v1.0.0`
- [ ] Description: Add meaningful release notes
- [ ] Publish release

---

## Deployment Monitoring
- [ ] Go to Actions tab and watch workflow run
- [ ] Monitor logs for any errors
- [ ] Expected duration: 2-3 minutes

---

## Post-Deployment Verification
- [ ] Open browser and visit `https://reactapp.asyntexconsultancy.com`
- [ ] Check page loads without errors (F12 → Console for JS errors)
- [ ] Test key functionality (login, navigation, API calls)
- [ ] Check Slack notification received (if configured)
- [ ] Log into Plesk → File Manager and verify:
  - [ ] `index.html` is latest version (check modified date)
  - [ ] `assets/` folder exists with CSS, JS, images
  - [ ] Old backup folders present (e.g., `assets.backup.20260430_143022/`)

---

## Rollback Plan (If Issues Found)
- [ ] Know how to rollback: rename backup folders back to active names
- [ ] Have Plesk login credentials ready
- [ ] Test rollback process in staging first

---

## Production Deployment Checklist
- [ ] All above items checked ✓
- [ ] Informed team of deployment
- [ ] Prepared rollback plan
- [ ] Ready to monitor for 1 hour post-deployment
- [ ] Have rollback contacts/procedures documented

---

**Status**: ☐ Ready to Deploy | ☐ Issues Found | ☐ Deployed Successfully

**Deployment Date/Time**: _________________

**Deployed By**: _________________

**Notes**: ________________________________________________________________

________________________________________________________________________
