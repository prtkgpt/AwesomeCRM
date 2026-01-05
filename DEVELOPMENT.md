# Development Workflow

## Branch Strategy

To avoid breaking production, we use a **staging → production** workflow:

### Branches

1. **`production`** (main production branch)
   - Deploy to: `cleandaycrm.com`
   - Protected branch - requires review before merge
   - Always stable and tested code
   - Only merge from `staging` after testing

2. **`staging`** (testing environment)
   - Deploy to: `staging.cleandaycrm.com` (or similar)
   - Test all features here before production
   - Merge feature branches here first
   - CI/CD runs all tests

3. **`claude/*` or `feature/*`** (feature branches)
   - Individual features or bug fixes
   - Create from `staging`
   - Merge into `staging` when ready
   - Delete after merging

### Workflow Diagram

```
feature/new-thing → staging → production
     ↓                ↓           ↓
   develop        test here   live site
```

## Development Process

### 1. Starting New Work

```bash
# Start from staging
git checkout staging
git pull origin staging

# Create feature branch
git checkout -b feature/add-new-feature

# Work on your feature...
git add .
git commit -m "Add new feature"
git push -u origin feature/add-new-feature
```

### 2. Testing on Staging

```bash
# Merge feature to staging
git checkout staging
git pull origin staging
git merge feature/add-new-feature
git push origin staging

# Test on staging environment
# Visit: https://staging.cleandaycrm.com
# Run through test scenarios
```

### 3. Deploying to Production

```bash
# Only after staging is fully tested!
git checkout production
git pull origin production
git merge staging
git push origin production

# Production deploys automatically
# Visit: https://cleandaycrm.com
```

## Vercel Setup

### Environment Configuration

Create **3 separate Vercel projects** or use **Git Branch deployment**:

#### Option A: Multiple Projects (Recommended)

1. **Production Project**
   - Connected to `production` branch
   - Domain: `cleandaycrm.com`
   - Environment: Production variables

2. **Staging Project**
   - Connected to `staging` branch
   - Domain: `staging.cleandaycrm.com`
   - Environment: Staging variables (use test API keys)

#### Option B: Single Project with Branch Deployments

1. **Production**
   - Domain: `cleandaycrm.com`
   - Branch: `production`
   - Environment: Production

2. **Preview (Staging)**
   - Domain: Auto-generated or custom
   - Branch: `staging`
   - Environment: Preview

### Vercel Settings

**Project Settings → Git:**
- Production Branch: `production`
- Ignored Build Step: None
- Preview Deployments: All branches

**Project Settings → Environment Variables:**

1. Production Environment:
   - `DATABASE_URL` → Production database
   - `STRIPE_SECRET_KEY` → Live keys
   - `RESEND_API_KEY` → Production key

2. Preview/Staging Environment:
   - `DATABASE_URL` → Staging database
   - `STRIPE_SECRET_KEY` → Test keys
   - `RESEND_API_KEY` → Staging key

## Setting Up Branches

### Initial Setup (Do this once)

```bash
# Create production branch from current stable state
git checkout claude/find-fix-bug-mjz2k6r5trm3iofs-V2gv4
git pull origin claude/find-fix-bug-mjz2k6r5trm3iofs-V2gv4
git checkout -b production
git push origin production

# Create staging branch
git checkout -b staging
git push origin staging

# Set production as default branch in GitHub
# Go to: Settings → Branches → Default branch → production
```

### Protecting Branches

**GitHub Settings → Branches → Branch protection rules:**

**For `production`:**
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Include administrators

**For `staging`:**
- ✅ Require status checks to pass (optional)

## Daily Workflow

### For Bug Fixes

```bash
# 1. Create fix from staging
git checkout staging
git pull
git checkout -b fix/invitation-bug

# 2. Fix the bug
# ... make changes ...
git commit -m "Fix invitation email sending"

# 3. Test locally
npm run build
npm run dev

# 4. Push and merge to staging
git push origin fix/invitation-bug
# Create PR to staging → merge → test on staging

# 5. If staging works, merge to production
git checkout production
git merge staging
git push origin production
```

### For New Features

```bash
# 1. Create feature from staging
git checkout staging
git pull
git checkout -b feature/data-export

# 2. Build the feature
# ... make changes ...
git commit -m "Add CSV data export"

# 3. Merge to staging
# Create PR to staging → merge

# 4. Test thoroughly on staging
# Test for 1-2 days to catch edge cases

# 5. Merge to production when stable
git checkout production
git merge staging
git push origin production
```

## Hotfix Process

For critical production bugs:

```bash
# 1. Create hotfix from production
git checkout production
git pull
git checkout -b hotfix/critical-auth-bug

# 2. Fix immediately
# ... make changes ...
git commit -m "Hotfix: Fix authentication bypass"

# 3. Merge to production
git checkout production
git merge hotfix/critical-auth-bug
git push origin production

# 4. Also merge to staging (keep in sync)
git checkout staging
git merge hotfix/critical-auth-bug
git push origin staging
```

## Testing Checklist

### Before Merging to Staging

- [ ] Code builds without errors (`npm run build`)
- [ ] No TypeScript errors
- [ ] Manual testing completed locally
- [ ] No console errors in browser

### Before Merging to Production

- [ ] Feature tested on staging for 24+ hours
- [ ] All test scenarios passed
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile testing (iOS, Android)
- [ ] No errors in Vercel logs
- [ ] Database migrations tested (if any)
- [ ] Performance is acceptable
- [ ] Rollback plan ready

## Environment Variables

### Production (`cleandaycrm.com`)
```env
DATABASE_URL=postgres://...production-db...
NEXTAUTH_URL=https://cleandaycrm.com
STRIPE_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_live_...
```

### Staging (`staging.cleandaycrm.com`)
```env
DATABASE_URL=postgres://...staging-db...
NEXTAUTH_URL=https://staging.cleandaycrm.com
STRIPE_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_test_...
```

## Rollback Plan

If production breaks:

```bash
# 1. Immediately revert the merge
git checkout production
git revert HEAD
git push origin production

# 2. Vercel auto-deploys the revert
# Or manually rollback in Vercel dashboard

# 3. Fix the issue in staging
git checkout staging
# ... fix the bug ...
git commit -m "Fix production issue"

# 4. Test thoroughly before re-deploying
# Test on staging for several hours

# 5. Re-deploy to production when fixed
git checkout production
git merge staging
git push origin production
```

## Tips

1. **Never push directly to production** - always go through staging
2. **Use feature flags** for large changes (toggle on/off in production)
3. **Keep staging in sync** - merge production back to staging after hotfixes
4. **Test with real data** - copy production DB to staging (anonymized)
5. **Monitor Vercel logs** - check for errors after each deployment
6. **Database migrations** - test on staging first, have rollback SQL ready

## Common Commands

```bash
# Check which branch you're on
git branch

# See all branches
git branch -a

# Switch to staging
git checkout staging

# Update current branch
git pull origin $(git branch --show-current)

# See changes between staging and production
git diff staging production

# See commit history
git log --oneline --graph --all
```

## Questions?

- **What if staging and production diverge?**
  - Production should always be a subset of staging
  - If production has hotfixes, merge production into staging
  - Then continue normal workflow: staging → production

- **Can I skip staging for tiny changes?**
  - No! Even tiny changes can break production
  - Use staging for all changes, no exceptions

- **How do I test emails on staging?**
  - Use a test Resend API key
  - Or use Mailtrap/Mailhog for staging
  - Never use production email keys on staging
