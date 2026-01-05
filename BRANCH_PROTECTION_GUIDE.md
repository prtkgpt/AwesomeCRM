# Branch Protection Setup Guide

## 🔒 Setting Up Branch Protection

### Step 1: Open GitHub Branch Settings

**Quick Link:** https://github.com/prtkgpt/AwesomeCRM/settings/branches

Or navigate manually:
1. Go to https://github.com/prtkgpt/AwesomeCRM
2. Click **Settings** (top navigation)
3. Click **Branches** (left sidebar under "Code and automation")

### Step 2: Add Protection Rule for Production

1. Click the **"Add branch protection rule"** button (green button)

2. Fill in these settings:

   **Branch name pattern:**
   ```
   production
   ```

   **Protection Settings - Check These Boxes:**

   #### Protect matching branches

   - ✅ **Require a pull request before merging**
     - ✅ Require approvals: `1` (set dropdown to 1)
     - ✅ Dismiss stale pull request approvals when new commits are pushed
     - ✅ Require review from Code Owners (optional)

   - ✅ **Require status checks to pass before merging**
     - ✅ Require branches to be up to date before merging
     - **Search for status checks:** Type `build` in the search box
       - Select: ✅ `build` (from your GitHub Actions CI)

   - ✅ **Require conversation resolution before merging**

   - ✅ **Require linear history** (prevents merge commits, cleaner history)

   - ✅ **Do not allow bypassing the above settings**
     - ✅ **Include administrators** ⚠️ IMPORTANT!

   #### Rules applied to everyone including administrators

   - ✅ **Allow force pushes** → Leave UNCHECKED (no force pushes!)
   - ✅ **Allow deletions** → Leave UNCHECKED (can't delete production!)

3. Click **"Create"** button at the bottom

### Step 3: Add Protection for Staging (Optional but Recommended)

1. Click **"Add branch protection rule"** again

2. Fill in these settings:

   **Branch name pattern:**
   ```
   staging
   ```

   **Protection Settings:**

   - ✅ **Require status checks to pass before merging**
     - ✅ Require branches to be up to date before merging
     - Select: ✅ `build`

   - ✅ **Require conversation resolution before merging**

   - ✅ **Require linear history**

   - ⚠️ **Skip "Require approvals"** for staging (makes it easier to merge features)

3. Click **"Create"**

---

## ✅ Verify Branch Protection is Working

After setting up, test it:

### Test 1: Try to Push Directly to Production (Should Fail)

```bash
git checkout production
echo "test" >> README.md
git add README.md
git commit -m "test: Direct push to production"
git push origin production
```

**Expected Result:**
```
remote: error: GH006: Protected branch update failed for refs/heads/production.
remote: error: Changes must be made through a pull request.
To https://github.com/prtkgpt/AwesomeCRM
 ! [remote rejected] production -> production (protected branch hook declined)
error: failed to push some refs
```

✅ **This is GOOD!** It means protection is working.

### Test 2: Create a Pull Request (Should Work)

```bash
# On staging branch
git checkout staging
echo "# Test PR workflow" >> test.md
git add test.md
git commit -m "test: Verify PR workflow"
git push origin staging

# Now create PR on GitHub:
# staging → production
```

**Expected Result:**
- ✅ PR is created
- ✅ GitHub Actions "build" check runs automatically
- ✅ PR shows "1 approval required"
- ✅ Cannot merge until approved and CI passes

---

## 🎯 What This Protects Against

### ❌ Can't Do This Anymore (GOOD!)
- Direct pushes to `production` branch
- Force pushes to `production`
- Deleting `production` branch
- Merging broken code (CI must pass)
- Merging without review

### ✅ Must Do This Instead (PROPER WORKFLOW!)
1. Make changes on feature branch
2. Push feature branch
3. Create Pull Request to `staging`
4. CI runs automatically
5. After CI passes, merge to `staging`
6. Test on staging environment
7. Create Pull Request: `staging` → `production`
8. Get 1 approval
9. CI runs on production PR
10. Merge to `production`

---

## 🚨 What If You Need to Override?

### For Emergency Hotfixes

If there's a critical production bug and you're the admin:

**Option 1: Emergency PR (Recommended)**
```bash
git checkout production
git checkout -b hotfix/critical-emergency
# fix the bug
git push origin hotfix/critical-emergency
# Create PR, approve your own PR, merge
```

**Option 2: Temporarily Disable Protection**
1. Go to branch protection settings
2. Delete the rule
3. Push your fix
4. Re-enable protection immediately

⚠️ **Use this only for true emergencies!**

### If You're Locked Out

If you accidentally enabled protection and can't approve your own PRs:

1. Go to Settings → Branches
2. Click "Edit" on the production rule
3. Uncheck "Include administrators"
4. Save
5. Merge your PR
6. Re-enable "Include administrators"

---

## 📊 Verification Checklist

After setting up protection, verify:

- [ ] Go to https://github.com/prtkgpt/AwesomeCRM/settings/branches
- [ ] See "production" in protected branches list
- [ ] See "staging" in protected branches list (if added)
- [ ] Try direct push to production (should fail)
- [ ] Create test PR to production (should show approval required)
- [ ] Check that "build" status check appears on PRs
- [ ] Verify "Include administrators" is checked

---

## 🎓 Understanding the Settings

### Require a pull request before merging
**What it does:** Forces all changes to go through PR review process
**Why:** Prevents accidental pushes, ensures code review

### Require approvals
**What it does:** Requires 1+ people to approve PR before merge
**Why:** Second pair of eyes catches bugs

### Require status checks to pass
**What it does:** Requires GitHub Actions CI to pass (build successful)
**Why:** Prevents broken code from reaching production

### Require conversation resolution
**What it does:** All PR comments must be resolved before merge
**Why:** Ensures all feedback is addressed

### Require linear history
**What it does:** Prevents merge commits, forces rebase or squash
**Why:** Cleaner git history, easier to track changes

### Do not allow bypassing + Include administrators
**What it does:** Even repo admins must follow the rules
**Why:** Prevents "I'm admin so I'll skip the rules" mistakes

---

## 🔧 Troubleshooting

### "Status check 'build' not found"

**Problem:** GitHub Actions hasn't run yet on this branch

**Solution:**
1. Make any commit to `production` or `staging`
2. GitHub Actions will run
3. Go back to branch protection settings
4. The "build" check will now appear in search

### "Cannot push to protected branch"

**Problem:** You're trying to push directly

**Solution:** This is working as intended! Create a PR instead.

### "CI check is required but not present"

**Problem:** GitHub Actions workflow isn't running

**Solution:**
1. Check `.github/workflows/ci.yml` exists
2. Verify workflow is enabled: Settings → Actions → General
3. Make a test commit to trigger the workflow

---

## ✅ Success!

When protection is working, you'll see:

**On GitHub:**
- Protected branch badge next to `production`
- PRs show required checks
- "Merge" button is disabled until approved + CI passes

**In Terminal:**
- Direct pushes to `production` are rejected
- Error message says "protected branch"

**In Workflow:**
- All changes go through staging first
- Production always has reviewed, tested code
- Clear audit trail of all changes

---

## 📚 Next Steps

After branch protection is set up:

1. ✅ Read `DEVELOPMENT.md` for full workflow
2. ✅ Set up Vercel projects (production + staging)
3. ✅ Test the complete workflow with a small change
4. ✅ Deploy something to staging → production

**You're now protected from breaking production! 🎉**
