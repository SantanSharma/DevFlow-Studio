# 🚀 Publishing DevFlow Studio to VS Code Marketplace

## ✅ Pre-Publishing Checklist (COMPLETE!)

- ✅ **Publisher ID**: SantanSharma (already exists from promptLint)
- ✅ **package.json**: All required fields configured
- ✅ **README.md**: Clean, concise, professional
- ✅ **CHANGELOG.md**: Comprehensive release notes ✨ JUST ADDED
- ✅ **LICENSE**: MIT license included
- ✅ **Icon**: 128x128 PNG with transparency
- ✅ **Screenshots**: 4 high-quality images included
- ✅ **Repository**: Clean, pushed to GitHub
- ✅ **No sensitive data**: All configs cleaned
- ✅ **Build verified**: VSIX package created successfully (688.49 KB)

---

## 📝 Step-by-Step Publishing Guide

### Step 1: Get Your Personal Access Token (PAT)

Since you've published promptLint before, you should already have a PAT. If not:

1. Go to: https://dev.azure.com
2. Click your profile icon (top right) → **Personal access tokens**
3. Click **+ New Token**
4. Fill in:
   - **Name**: "VS Code Marketplace Publisher"
   - **Organization**: All accessible organizations
   - **Expiration**: Custom defined (e.g., 90 days or 1 year)
   - **Scopes**: Click "Show all scopes" → Check **Marketplace → Manage**
5. Click **Create**
6. **IMPORTANT**: Copy the token immediately (you won't see it again!)

### Step 2: Login to VSCE

Open PowerShell in your project directory and run:

```powershell
cd e:\code_with_santan\devflow-studio\devflow-studio
vsce login SantanSharma
```

When prompted, paste your Personal Access Token.

**Note**: You only need to do this once per machine. VSCE remembers your login.

### Step 3: Verify Package Contents

Before publishing, verify what will be included:

```powershell
vsce ls
```

This shows all files that will be packaged. Make sure no sensitive data is included.

### Step 4: Publish to Marketplace

**Option A: Publish Directly (Recommended)**

```powershell
vsce publish
```

This will:

- Build the extension
- Package it
- Upload to the marketplace
- Make it publicly available (usually within 5-10 minutes)

**Option B: Publish a Specific Version**

```powershell
vsce publish 0.1.0
```

**Option C: Publish as Minor/Patch Update** (for future releases)

```powershell
vsce publish patch   # 0.1.0 → 0.1.1
vsce publish minor   # 0.1.0 → 0.2.0
vsce publish major   # 0.1.0 → 1.0.0
```

### Step 5: Verify Publication

1. Go to: https://marketplace.visualstudio.com/manage/publishers/SantanSharma
2. You should see "DevFlow Studio" listed alongside your other extensions
3. Click on it to view the extension page

### Step 6: Check Public Listing

After 5-10 minutes, visit:
https://marketplace.visualstudio.com/items?itemName=SantanSharma.devflow-studio

You should see:

- ✅ Your icon
- ✅ Screenshots
- ✅ Description
- ✅ README content
- ✅ Changelog
- ✅ Install count starting from 0

---

## 🔧 Common Issues & Solutions

### Issue: "Permission Denied" or "401 Unauthorized"

**Solution**: Your PAT expired or is invalid. Run:

```powershell
vsce logout
vsce login SantanSharma
```

Enter a new PAT.

### Issue: "Publisher 'SantanSharma' not found"

**Solution**: The publisher name is case-sensitive. Use the exact name from your publisher profile.

### Issue: "Extension validation failed"

**Solution**: Run `vsce package` first to see detailed errors. Common issues:

- Missing required fields in package.json
- Invalid icon size
- Broken README links

### Issue: "Version already exists"

**Solution**: You've already published version 0.1.0. Increment the version:

```powershell
# Update package.json version to 0.1.1 or 0.2.0
vsce publish minor  # or patch/major
```

---

## 🎯 Post-Publishing Checklist

After successful publication:

- [ ] **Verify installation**: In VS Code, search for "DevFlow Studio" in Extensions
- [ ] **Test installation**: Install from marketplace and verify functionality
- [ ] **Share on social media**: Twitter, LinkedIn, Reddit (r/vscode)
- [ ] **Add marketplace badge to README**:
  ```markdown
  [![VS Code Marketplace](https://img.shields.io/vscode-marketplace/v/SantanSharma.devflow-studio.svg)](https://marketplace.visualstudio.com/items?itemName=SantanSharma.devflow-studio)
  ```
- [ ] **Monitor**: Check for user reviews, issues, and feedback

---

## 📊 Updating the Extension (Future)

When you make changes:

1. **Make your code changes**
2. **Update CHANGELOG.md** with new version entry
3. **Update version in package.json** (or let vsce do it)
4. **Build and test**: `npm run build`
5. **Publish update**:
   ```powershell
   vsce publish patch  # for bug fixes
   vsce publish minor  # for new features
   vsce publish major  # for breaking changes
   ```

---

## 🎉 You're Ready to Publish!

Your extension is **100% ready** for the marketplace. Just run:

```powershell
cd e:\code_with_santan\devflow-studio\devflow-studio
vsce publish
```

And you're live! 🚀

---

**Need help?** Check the official docs: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
