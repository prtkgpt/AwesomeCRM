# Quick Setup: Staging & Production

## TL;DR

1. **Create branches in GitHub:**
   ```bash
   git checkout claude/find-fix-bug-mjz2k6r5trm3iofs-V2gv4
   git checkout -b production
   git push origin production

   git checkout -b staging
   git push origin staging
   ```

2. **Set up Vercel projects:**
   - **Production:** Connected to `production` branch → `cleandaycrm.com`
   - **Staging:** Connected to `staging` branch → `staging.cleandaycrm.com`

3. **Workflow:**
   ```
   feature-branch → staging (test here) → production (live)
   ```

## Vercel Setup

### Option 1: Two Separate Projects (Easiest)

1. **Create Production Project**
   - Go to Vercel dashboard
   - Import your GitHub repo
   - Name: `cleandaycrm-production`
   - Branch: `production`
   - Domain: `cleandaycrm.com`
   - Add production environment variables

2. **Create Staging Project**
   - Import same GitHub repo again
   - Name: `cleandaycrm-staging`
   - Branch: `staging`
   - Domain: `staging.cleandaycrm.com` (or use auto-generated)
   - Add staging environment variables (test API keys)

### Option 2: One Project with Branch Deployments

1. **In Vercel Project Settings:**
   - Production Branch: `production`
   - Connected Git Branch: `production`

2. **For Staging:**
   - Push to `staging` branch
   - Vercel auto-creates preview at: `cleandaycrm-git-staging-yourname.vercel.app`
   - Optional: Add custom domain `staging.cleandaycrm.com`

## Environment Variables

Copy your current production variables, then:

**Production:**
- Keep all current values (live keys)

**Staging:**
- `DATABASE_URL` → Different database (or copy from prod)
- `STRIPE_SECRET_KEY` → `sk_test_...` (test mode)
- `STRIPE_PUBLISHABLE_KEY` → `pk_test_...`
- `RESEND_API_KEY` → Separate key or same (staging emails ok)

## Daily Usage

### Making Changes

```bash
# 1. Work on feature branch
git checkout -b feature/new-thing
# make changes...
git push origin feature/new-thing

# 2. Merge to staging (test here first!)
git checkout staging
git merge feature/new-thing
git push origin staging
# → Test on staging.cleandaycrm.com

# 3. After testing, merge to production
git checkout production
git merge staging
git push origin production
# → Deploys to cleandaycrm.com
```

### Emergency Fix

```bash
# Fix on production, then sync to staging
git checkout production
git checkout -b hotfix/critical-bug
# fix it...
git checkout production
git merge hotfix/critical-bug
git push origin production

# Keep staging in sync
git checkout staging
git merge production
git push origin staging
```

## Protection Rules (GitHub)

**Settings → Branches → Add rule:**

- Branch: `production`
- ✅ Require pull request before merging
- ✅ Require status checks to pass

This prevents accidental direct pushes to production.

## That's It!

Now you have:
- ✅ Staging environment to test changes
- ✅ Production environment protected
- ✅ Proper workflow to avoid breaking things

**Read DEVELOPMENT.md for full details.**
