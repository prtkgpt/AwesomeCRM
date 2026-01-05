# ✅ GitHub Setup Review - AwesomeCRM

**Date:** January 5, 2026
**Status:** Branches configured, protection needed

---

## What's Already Done ✅

### Repository Structure
- ✅ **Production branch** created and set as default
- ✅ **Staging branch** created
- ✅ Both branches synchronized (commit `d169250`)
- ✅ All critical fixes deployed (middleware, invitations, etc.)
- ✅ Comprehensive documentation (DEVELOPMENT.md, QUICK_SETUP.md)
- ✅ GitHub Actions CI workflow added
- ✅ Pull request template added

### Code Quality
- ✅ Invitation system working
- ✅ Middleware properly configured
- ✅ TypeScript builds (with some pre-existing errors)
- ✅ All features functional

---

## ⚠️ CRITICAL: What You MUST Do Now

### 1. Protect the Production Branch (5 minutes)

**This is the most important step!**

1. Go to: https://github.com/prtkgpt/AwesomeCRM/settings/branches
2. Click **"Add branch protection rule"**
3. Configure:
   - **Branch name pattern:** `production`
   - ✅ Check: **"Require a pull request before merging"**
   - ✅ Check: **"Require approvals"** (set to 1)
   - ✅ Check: **"Require status checks to pass before merging"**
     - Search and add: `build` (from GitHub Actions)
   - ✅ Check: **"Do not allow bypassing the above settings"**
4. Click **"Create"**

**Why this matters:** Prevents you from accidentally pushing broken code directly to production.

### 2. Set Up Two Vercel Projects (15 minutes)

You need separate projects for staging and production.

#### **Production Project**

1. Go to: https://vercel.com/new
2. Import: `prtkgpt/AwesomeCRM`
3. Configure:
   - **Project Name:** `cleandaycrm-production`
   - **Root Directory:** `./`
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run vercel-build` (or leave default)
   - **Git Branch:** `production` ⚠️ IMPORTANT
4. Add Environment Variables:
   ```
   DATABASE_URL=<your-production-database-url>
   NEXTAUTH_URL=https://cleandaycrm.com
   NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   RESEND_API_KEY=re_...
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_PHONE_NUMBER=+1...
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
   CRON_SECRET=<random-string>
   EMAIL_DOMAIN=cleandaycrm.com
   EMAIL_FROM=noreply@cleandaycrm.com
   ```
5. Click **"Deploy"**
6. After deployment, add custom domain: `cleandaycrm.com`

#### **Staging Project**

1. Go to: https://vercel.com/new
2. Import: `prtkgpt/AwesomeCRM` (same repo)
3. Configure:
   - **Project Name:** `cleandaycrm-staging`
   - **Root Directory:** `./`
   - **Framework Preset:** Next.js
   - **Git Branch:** `staging` ⚠️ IMPORTANT
4. Add Environment Variables (SAME as production, but with these differences):
   ```
   DATABASE_URL=<your-staging-database-url> (separate DB!)
   NEXTAUTH_URL=https://staging.cleandaycrm.com
   NEXTAUTH_SECRET=<different-secret>
   STRIPE_SECRET_KEY=sk_test_... (TEST MODE!)
   STRIPE_PUBLISHABLE_KEY=pk_test_... (TEST MODE!)
   ```
5. Click **"Deploy"**
6. After deployment, optionally add custom domain: `staging.cleandaycrm.com`
   - Or use auto-generated: `cleandaycrm-staging.vercel.app`

### 3. Test the Workflow (30 minutes)

**Do this to verify everything works:**

```bash
# 1. Create a test feature
git checkout staging
git pull origin staging
git checkout -b test/verify-workflow

# 2. Make a small change (e.g., add a comment somewhere)
echo "// Test workflow" >> src/app/(dashboard)/dashboard/page.tsx
git add .
git commit -m "test: Verify staging/production workflow"
git push origin test/verify-workflow

# 3. Create PR to staging on GitHub
# - Go to GitHub and create Pull Request
# - Base: staging, Compare: test/verify-workflow
# - Wait for CI to pass (GitHub Actions)
# - Merge the PR

# 4. Check staging deployment
# - Visit staging.cleandaycrm.com (or staging URL)
# - Verify the change is there
# - Test all critical features

# 5. Merge staging to production
git checkout staging
git pull origin staging
git checkout production
git pull origin production
git merge staging
git push origin production

# 6. Verify production deployment
# - Visit cleandaycrm.com
# - Verify the change is there
# - Test all critical features

# 7. Clean up test branch
git branch -d test/verify-workflow
git push origin --delete test/verify-workflow
```

---

## 🎯 Your New Workflow (Moving Forward)

### For Every New Feature or Bug Fix

```bash
# 1. Start from staging
git checkout staging
git pull origin staging

# 2. Create feature branch
git checkout -b feature/my-new-feature

# 3. Work on feature
# ... make changes ...
git commit -m "Add new feature"
git push origin feature/my-new-feature

# 4. Create PR to staging
# - GitHub will automatically run CI
# - Review and merge when tests pass

# 5. Test on staging (at least 24 hours!)
# - Visit staging.cleandaycrm.com
# - Test thoroughly
# - Check for bugs, errors, performance issues

# 6. If staging is good, merge to production
git checkout production
git pull origin production
git merge staging
git push origin production

# 7. Verify production
# - Visit cleandaycrm.com
# - Monitor Vercel logs for errors
# - Test critical user flows
```

### For Emergencies (Hotfix)

```bash
# 1. Create hotfix from production
git checkout production
git pull origin production
git checkout -b hotfix/critical-bug

# 2. Fix the bug
# ... make changes ...
git commit -m "Hotfix: Fix critical bug"

# 3. Merge to production
git checkout production
git merge hotfix/critical-bug
git push origin production

# 4. Also merge to staging (keep in sync!)
git checkout staging
git merge hotfix/critical-bug
git push origin staging
```

---

## 🔍 How to Know It's Working

### GitHub
- [ ] Creating PR to `production` shows protection warning
- [ ] GitHub Actions run on every PR
- [ ] Can't push directly to `production` branch
- [ ] Default branch is `production`

### Vercel
- [ ] Push to `staging` branch → deploys to staging URL
- [ ] Push to `production` branch → deploys to cleandaycrm.com
- [ ] Two separate projects in Vercel dashboard
- [ ] Different environment variables in each

### Workflow
- [ ] Make change → merge to staging → test → merge to production
- [ ] No accidental production deployments
- [ ] All changes go through staging first

---

## 📊 Current Status Summary

| Component | Status | Action Needed |
|-----------|--------|---------------|
| `production` branch | ✅ Exists | Needs protection |
| `staging` branch | ✅ Exists | Ready |
| Documentation | ✅ Complete | None |
| GitHub Actions | ✅ Configured | Will run on PR |
| PR Template | ✅ Added | Will auto-appear |
| Branch Protection | ❌ Missing | **ADD NOW** |
| Vercel Production | ❌ Unknown | **SET UP** |
| Vercel Staging | ❌ Unknown | **SET UP** |

---

## 🆘 If Something Goes Wrong

### Production is Broken

```bash
# Option 1: Revert the last commit
git checkout production
git revert HEAD
git push origin production

# Option 2: Rollback in Vercel
# - Go to Vercel dashboard
# - Click "Deployments"
# - Find last working deployment
# - Click "..." → "Redeploy"
```

### Staging and Production Out of Sync

```bash
# If production has hotfixes, sync to staging
git checkout staging
git merge production
git push origin staging

# Then continue normal workflow
```

### Accidentally Pushed to Production

If branch protection is enabled, this won't happen. But if it does:

```bash
# 1. Immediately revert
git checkout production
git revert HEAD --no-edit
git push origin production

# 2. Fix properly through staging
git checkout staging
# ... fix the issue ...
# ... test on staging ...
# ... then merge to production
```

---

## 📚 Additional Resources

- **Full Workflow:** See `DEVELOPMENT.md`
- **Quick Reference:** See `QUICK_SETUP.md`
- **Environment Variables:** See `.env.example`

---

## ✅ Final Checklist

Before you consider this "foolproof":

- [ ] Branch protection added to `production`
- [ ] Vercel production project created and connected
- [ ] Vercel staging project created and connected
- [ ] All environment variables configured
- [ ] Test workflow completed successfully
- [ ] Team members know the workflow
- [ ] First real feature deployed through staging → production

**Once all these are checked, your setup is foolproof!**

---

**Questions?** Review the DEVELOPMENT.md file or check Vercel documentation.

**Remember:** Always staging first, production second. No exceptions!
