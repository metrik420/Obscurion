# Navigation Component Debug Guide

If the Navigation component is still not visible after the fixes, use this debug checklist:

## Quick Visual Test

The Navigation component should appear as a **white bar** at the top of the page with:
- Height: 64px (4rem)
- Background: White
- Border: Thin gray line at bottom
- Content: "Obscurion" logo on left, navigation links in center, user info on right

## Browser DevTools Inspection

### Step 1: Open DevTools
- Press F12 or right-click > Inspect
- Go to the Console tab

### Step 2: Check for Errors
Look for these common errors:

```
❌ useSession must be wrapped in a SessionProvider
❌ Cannot read property 'user' of undefined
❌ Navigation is not defined
❌ Module not found: '@/components/Navigation'
```

### Step 3: Check Component Rendering

Run this in the Browser Console:
```javascript
// Check if Navigation component is in DOM
document.querySelector('nav[aria-label="Main navigation"]')
// Should return: <nav class="bg-white border-b ...">...</nav>

// If null, component is not rendering
```

### Step 4: Check Session Status

Run this in the Browser Console (on a dashboard page):
```javascript
// This will show you the session state
console.log('Session check - open Network tab and refresh, look for /api/auth/session')
```

### Step 5: Inspect Element

1. Right-click on where Navigation should be (top of page)
2. Select "Inspect"
3. Look for `<nav aria-label="Main navigation">` in the Elements tab
4. If found but not visible, check computed styles:
   - Is `display: none` applied?
   - Is `opacity: 0` applied?
   - Is `visibility: hidden` applied?
   - Is it being covered by another element?

## Common Issues and Solutions

### Issue 1: White Screen or Component Not Mounting

**Symptoms:**
- Entire page is blank
- Console shows React/Next.js errors

**Solutions:**
```bash
# Clear Next.js cache
rm -rf /home/metrik/docker/Obscurion/.next

# Restart dev server
npm run dev
```

### Issue 2: Navigation Shows Loading State Forever

**Symptoms:**
- Navigation shows gray skeleton/loading bars
- Never shows actual content

**Cause:** Session is not loading

**Debug:**
1. Open Network tab in DevTools
2. Refresh page
3. Look for `/api/auth/session` request
4. Check response:
   - 200 OK + session data = working
   - 401 Unauthorized = need to login
   - 500 Error = server issue

**Solution:**
- If 401: Go to `/auth/signin` and login
- If 500: Check server logs for database connection errors

### Issue 3: Navigation Exists But Is Invisible

**Symptoms:**
- `document.querySelector('nav')` returns element in console
- But nothing visible on screen

**Debug:**
```javascript
// In Browser Console
const nav = document.querySelector('nav[aria-label="Main navigation"]')
console.log('Nav element:', nav)
console.log('Computed styles:', window.getComputedStyle(nav))
console.log('Z-index:', nav.style.zIndex)
console.log('Opacity:', window.getComputedStyle(nav).opacity)
console.log('Display:', window.getComputedStyle(nav).display)
```

**Solutions:**
1. Check if another element has `position: fixed` with higher z-index
2. Check if page content is covering navigation
3. Try adding this temporarily to Navigation.tsx (line 84):
   ```tsx
   <nav
     className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm"
     aria-label="Main navigation"
     style={{ position: 'sticky', top: 0, zIndex: 9999, backgroundColor: 'white' }}
   >
   ```

### Issue 4: Tailwind CSS Not Loading

**Symptoms:**
- Navigation appears but has no styling
- Raw unstyled HTML visible

**Debug:**
Check if Tailwind classes are working anywhere:
```javascript
// In Browser Console
document.querySelector('[class*="bg-"]') // Should find elements with Tailwind classes
```

**Solution:**
```bash
# Verify tailwind.config.ts exists and is correct
cat /home/metrik/docker/Obscurion/tailwind.config.ts

# Verify globals.css imports Tailwind
cat /home/metrik/docker/Obscurion/src/styles/globals.css

# Should contain:
# @tailwind base;
# @tailwind components;
# @tailwind utilities;
```

## Temporary Debug Component

If you need to verify React rendering is working, add this to any dashboard page:

```tsx
// Add at the top of dashboard/page.tsx after imports
function DebugBanner() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'red',
      color: 'white',
      padding: '10px',
      textAlign: 'center',
      zIndex: 99999,
      fontSize: '20px'
    }}>
      DEBUG: If you can see this, React is rendering!
    </div>
  )
}

// Then add <DebugBanner /> before <Navigation />
return (
  <>
    <DebugBanner />
    <Navigation />
    {/* rest of page */}
  </>
)
```

If you see the red banner but not Navigation, the issue is specific to the Navigation component.

## Server Logs

Check the server console for errors:

```bash
# If running in tmux or screen
# Look for these error patterns:

✓ Ready in 2.5s
○ Compiling / ...
✓ Compiled / in 500ms

# Good signs ^

✗ Error: Cannot find module '@/components/Navigation'
✗ Module not found
✗ Error: Invalid hook call

# Bad signs ^ - means build issue
```

## Session Provider Check

Verify SessionProvider is wrapping your app:

1. Open `/home/metrik/docker/Obscurion/src/app/layout.tsx`
2. Verify it has:
   ```tsx
   <Providers>
     {children}
   </Providers>
   ```

3. Open `/home/metrik/docker/Obscurion/src/components/providers.tsx`
4. Verify it has:
   ```tsx
   <SessionProvider>
     {children}
   </SessionProvider>
   ```

Both files are already correct based on the fix verification.

## Nuclear Option: Fresh Start

If nothing works:

```bash
cd /home/metrik/docker/Obscurion

# Stop dev server (Ctrl+C if running in terminal)

# Clear everything
rm -rf .next
rm -rf node_modules
rm -rf package-lock.json

# Fresh install
npm install

# Rebuild
npm run build

# Verify build succeeds
# Then start dev
npm run dev
```

## Success Indicators

You'll know Navigation is working when:
1. ✅ White bar appears at top of page
2. ✅ "Obscurion" logo visible on left
3. ✅ Navigation links visible (Dashboard, Notes, Search)
4. ✅ Your email address visible on right
5. ✅ Logout button visible
6. ✅ Active page has blue highlight
7. ✅ Clicking links navigates correctly
8. ✅ Mobile view shows hamburger menu

## Still Not Working?

If you've tried everything above and Navigation still doesn't appear:

1. **Check your authentication:**
   - Are you logged in?
   - Go to `/auth/signin` and login
   - Then navigate to `/dashboard`

2. **Check the actual file exists:**
   ```bash
   ls -la /home/metrik/docker/Obscurion/src/components/Navigation.tsx
   # Should show the file
   ```

3. **Check for syntax errors:**
   ```bash
   npm run build
   # Should complete with no errors
   ```

4. **Verify imports are correct:**
   ```bash
   cd /home/metrik/docker/Obscurion
   grep -r "from '@/components/Navigation'" src/app/dashboard/
   # Should show all pages importing Navigation
   ```

All of these have been verified and are working correctly in the codebase.

---

**The Navigation component code is correct. If it's not visible, it's likely a runtime issue with session/authentication or browser cache.**

**Recommended action: Clear browser cache, hard refresh (Ctrl+Shift+R), and verify you're logged in.**
