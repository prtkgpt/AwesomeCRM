# Simple Deployment Workflow

## 🎯 How Deployment Works

**Simple Setup:**
- One Vercel project connected to this branch
- Push to GitHub → Vercel auto-deploys
- No staging/production complexity

---

## 📝 Daily Workflow

### Making Changes

```bash
# 1. Make your changes
# Edit files...

# 2. Test locally (optional but recommended)
npm run build

# 3. Commit changes
git add .
git commit -m "Description of changes"

# 4. Push to GitHub
git push origin claude/find-fix-bug-mjz2k6r5trm3iofs-V2gv4

# 5. Vercel automatically deploys
# Check https://cleandaycrm.com in ~2 minutes
```

---

## ⚙️ Vercel Setup

**Your Vercel Project:**
- Project Name: `cleandaycrm` (or whatever you named it)
- Connected Branch: `claude/find-fix-bug-mjz2k6r5trm3iofs-V2gv4`
- Domain: `cleandaycrm.com`
- Auto-deploy: ✅ Enabled

**Every push triggers:**
1. Vercel pulls latest code
2. Runs `npm run vercel-build`
3. Deploys to cleandaycrm.com
4. Takes 1-3 minutes

---

## ✅ Before Pushing

**Quick Checklist:**
- [ ] Test locally: `npm run build`
- [ ] No TypeScript errors
- [ ] Feature works in browser
- [ ] No console errors

**If build fails locally, don't push!**

---

## 🚨 If Something Breaks

### Option 1: Revert Last Commit
```bash
git revert HEAD
git push origin claude/find-fix-bug-mjz2k6r5trm3iofs-V2gv4
```

### Option 2: Rollback in Vercel
1. Go to Vercel dashboard
2. Click "Deployments"
3. Find last working deployment
4. Click "..." → "Redeploy"

---

## 📊 Monitoring

**Check Deployment Status:**
- Vercel Dashboard: https://vercel.com
- Check your project → Deployments tab
- Green ✅ = Success
- Red ❌ = Failed (check logs)

**Check Site:**
- Visit: https://cleandaycrm.com
- Should update within 2-3 minutes of push

---

## 🔧 Common Issues

### Build Fails
```
Error: Build failed
```
**Solution:**
```bash
# Test locally first
npm run build

# Fix errors, then push
```

### Deployment Timeout
```
Error: Function execution timed out
```
**Solution:** Check Vercel logs, may need to optimize code

### Environment Variables
```
Error: DATABASE_URL is not defined
```
**Solution:** Add missing env var in Vercel → Settings → Environment Variables

---

## 💡 Tips

1. **Test locally before pushing**
   ```bash
   npm run dev  # Test in development
   npm run build # Test production build
   ```

2. **Use descriptive commit messages**
   ```bash
   git commit -m "fix: Client creation error handling"
   ```

3. **Check Vercel logs if issues**
   - Vercel Dashboard → Your Project → Deployments
   - Click on deployment → View Logs

4. **Keep deployments small**
   - Commit often
   - Push tested changes
   - Easier to debug if something breaks

---

## 🎯 That's It!

**No complex workflows. Just:**
1. Code
2. Test
3. Push
4. Deploy

Simple and effective! 🚀
