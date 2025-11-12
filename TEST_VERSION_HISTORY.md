# Version History - Testing Guide

**Date**: 2025-11-11
**Feature**: Version History System
**Status**: Ready for Testing

---

## Quick Start

### Prerequisites
1. Application running at http://localhost:3082
2. User account created and logged in
3. At least one note with some edit history

### Test Setup (5 minutes)

1. **Create a test note with version history**:
   ```bash
   # Open browser to http://localhost:3082/dashboard/notes
   # Click "New Note" button
   # Title: "Version History Test Note"
   # Content: "This is version 1 of my test note."
   # Click "Create Note"
   ```

2. **Edit the note multiple times** (to create versions):
   ```
   Edit 1: Change content to "This is version 2 with more content."
   Wait 5 seconds for auto-save

   Edit 2: Change content to "This is version 3 with even more content."
   Wait 5 seconds for auto-save

   Edit 3: Change title to "Updated Test Note"
   Edit 3: Change content to "This is version 4 after title change."
   Wait 5 seconds for auto-save
   ```

3. **Note the Note ID**:
   - Look at URL: `http://localhost:3082/dashboard/notes/{noteId}`
   - Example: `clx9a7b3c000008l6h2q4r5s6`

---

## Test Cases

### TC-1: Access Version History Page

**Objective**: Verify user can navigate to version history page

**Steps**:
1. Open note editor: `/dashboard/notes/{noteId}`
2. Look at right sidebar under "Quick Actions"
3. Click button "View Version History (#)"
4. Should navigate to `/dashboard/versions?noteId={noteId}`

**Expected Result**:
- Page loads successfully
- Title shows "Version History"
- Subtitle shows "Viewing versions for: {note title}"
- Version list displays with multiple entries
- Current version shown at top with blue border

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

### TC-2: View Version List

**Objective**: Verify version list displays correctly

**Steps**:
1. On version history page
2. Observe the version list

**Expected Result**:
- Current version card at top (blue border, labeled "CURRENT")
- Historical versions listed below
- Each version shows:
  - Version number (v1, v2, v3...)
  - Title
  - Timestamp (relative and absolute)
  - User who created it (if available)
  - Character count
  - Content preview (first ~200 chars)
  - "Restore" button
  - "View Full" button

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

### TC-3: Sort Versions

**Objective**: Verify sorting functionality

**Steps**:
1. On version history page
2. Note current order (newest first by default)
3. Click sort dropdown
4. Select "Oldest First"
5. Observe version list reorders

**Expected Result**:
- Default: Newest first (v4, v3, v2, v1)
- After sort: Oldest first (v1, v2, v3, v4)
- No page reload (instant client-side sort)
- Version numbers update accordingly

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

### TC-4: Restore Version (with Confirmation)

**Objective**: Verify restore functionality and confirmation dialog

**Steps**:
1. On version history page
2. Click "Restore" button on version 2
3. Observe confirmation dialog appears
4. Read dialog content
5. Click "Cancel"
6. Verify dialog closes, nothing restored
7. Click "Restore" on version 2 again
8. Click "Restore Version" button

**Expected Result**:
- Confirmation dialog shows:
  - Version title
  - Version timestamp
  - Content preview
  - Warning about what will happen
- After restore:
  - Success alert: "Version restored successfully!"
  - Page refreshes
  - New version created (count increases by 1)
  - "Back to Editor" button works

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

### TC-5: View Full Version (Comparison Modal)

**Objective**: Verify full version viewing with side-by-side comparison

**Steps**:
1. On version history page
2. Click "View Full" button on version 2
3. Wait for modal to load
4. Observe content

**Expected Result**:
- Modal opens with large overlay
- Title: "Version Comparison"
- Metadata: timestamp, user
- If title changed: yellow warning box showing old vs new title
- Content section shows:
  - Left: Historical version (full content)
  - Right: Current version (full content)
  - Character count for each
  - Diff statistics (+X chars or -X chars)
- Close button (×) works
- Clicking outside modal closes it

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

### TC-6: Quick View from Note Editor

**Objective**: Verify inline version quick view

**Steps**:
1. Navigate to note editor: `/dashboard/notes/{noteId}`
2. In right sidebar, click "Quick View Recent Versions"
3. Observe inline panel expands
4. View content

**Expected Result**:
- Panel expands showing up to 3 most recent versions
- Each version shows:
  - Version number
  - Timestamp
  - Title
  - Preview
  - "Restore" button
- If more than 3 versions exist:
  - "View all X versions →" link at bottom
- "View All" button in header links to full page

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

### TC-7: Empty State

**Objective**: Verify behavior when no versions exist

**Steps**:
1. Create a brand new note (never edited)
2. Navigate to version history page
3. Or click "Quick View Recent Versions"

**Expected Result**:
- Message: "No version history available yet."
- Explanation: "Versions are created automatically when you edit notes."
- No errors in console

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

### TC-8: Error Handling - No Note ID

**Objective**: Verify error handling when noteId missing

**Steps**:
1. Navigate to `/dashboard/versions` (no noteId param)

**Expected Result**:
- Error card displays:
  - Title: "No Note Selected"
  - Message: "No note ID provided. Please select a note..."
  - Button: "Go to Notes"
- Button works (navigates to /dashboard/notes)

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

### TC-9: Error Handling - Invalid Note ID

**Objective**: Verify error handling with invalid ID

**Steps**:
1. Navigate to `/dashboard/versions?noteId=invalid-id-123`

**Expected Result**:
- Error message displays
- User-friendly text (not technical error)
- Option to go back or return to notes

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

### TC-10: Mobile Responsiveness

**Objective**: Verify mobile layout

**Steps**:
1. Open version history page
2. Open browser DevTools (F12)
3. Toggle device toolbar (Ctrl+Shift+M)
4. Select "iPhone 12 Pro" or similar (390px width)
5. Navigate through version list
6. Click "View Full" to open comparison modal

**Expected Result**:
- Version list stacks vertically (no horizontal scroll)
- Version cards are readable
- Buttons are tappable (>44px touch target)
- Comparison modal:
  - Stacks side-by-side panels vertically on mobile
  - Content scrolls within containers
  - Close button is accessible

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

### TC-11: Keyboard Navigation

**Objective**: Verify accessibility for keyboard users

**Steps**:
1. Open version history page
2. Press Tab key repeatedly
3. Navigate through all interactive elements
4. Press Enter on "View Full" button
5. Press Escape key to close modal
6. Press Enter on "Restore" button
7. Tab through confirmation dialog
8. Press Escape to cancel

**Expected Result**:
- All buttons are reachable via Tab
- Focus ring visible on each element
- Enter key activates buttons
- Escape key closes modals/dialogs
- Tab order is logical (top to bottom, left to right)
- No keyboard traps

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

### TC-12: Security - Other User's Notes

**Objective**: Verify users cannot access other users' versions

**Steps**:
1. Sign in as User A
2. Create a note, note the ID
3. Sign out
4. Sign in as User B
5. Navigate to `/dashboard/versions?noteId={UserA_NoteID}`

**Expected Result**:
- Error: "Forbidden" or "Not found"
- Cannot view User A's versions
- API returns 403 Forbidden

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

### TC-13: Performance - Large Version Count

**Objective**: Verify performance with many versions

**Steps**:
1. Create a note
2. Edit it 50+ times (script or manual)
3. Navigate to version history page
4. Measure page load time

**Expected Result**:
- Page loads in < 1 second
- Version list renders without lag
- Sorting is instant
- No browser freeze or crash

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________
- Load time: _____ ms

---

### TC-14: API Endpoint - List Versions

**Objective**: Verify API returns correct data

**Steps**:
1. Open browser DevTools Network tab
2. Navigate to version history page
3. Filter by "versions" in network requests
4. Inspect request to `/api/notes/{id}/versions`

**Expected Result**:
- HTTP 200 OK
- Response JSON:
  ```json
  {
    "noteId": "clx...",
    "versions": [...],
    "total": 4
  }
  ```
- Each version has: id, title, contentPreview, contentLength, createdAt, user
- contentPreview is truncated (~200 chars)

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

### TC-15: API Endpoint - Full Version

**Objective**: Verify full content API

**Steps**:
1. Open version history page
2. Open DevTools Network tab
3. Click "View Full" on any version
4. Inspect request to `/api/notes/{id}/versions/{versionId}`

**Expected Result**:
- HTTP 200 OK
- Response JSON includes:
  - Full content (not truncated)
  - All metadata (id, title, createdAt, user)
- Content matches what is displayed in modal

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

### TC-16: API Endpoint - Restore Version

**Objective**: Verify restore API

**Steps**:
1. Open version history page
2. Open DevTools Network tab
3. Click "Restore" on a version, confirm
4. Inspect request to `/api/notes/{id}/versions` (PUT)

**Expected Result**:
- HTTP 200 OK
- Request body: `{ "versionId": "clv..." }`
- Response:
  - Updated note data
  - restoredFromVersionId field
  - Message: "Note restored..."
- After restore:
  - New version created in database
  - Note content matches restored version

**Actual Result**:
- [ ] Pass
- [ ] Fail: ___________

---

## Database Verification

### Verify Version Creation

**Query**:
```sql
SELECT id, noteId, title, LEFT(content, 50) as content_preview, createdAt, userId
FROM NoteVersion
WHERE noteId = '{your-note-id}'
ORDER BY createdAt DESC;
```

**Expected**:
- Multiple rows for test note
- Each edit creates a new row
- Restore operation creates additional row

---

### Verify Non-Destructive Restore

**Steps**:
1. Note current version count: e.g., 4 versions
2. Restore version 2
3. Check database again

**Query**:
```sql
SELECT COUNT(*) FROM NoteVersion WHERE noteId = '{your-note-id}';
```

**Expected**:
- Count increases by 1 (now 5 versions)
- Original version 2 still exists
- New version created with same content as version 2

---

## Automated Test Script (Optional)

If using Playwright or similar:

```javascript
test('Version History - Full Flow', async ({ page }) => {
  // 1. Login
  await page.goto('http://localhost:3082/auth/signin')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // 2. Create note
  await page.goto('http://localhost:3082/dashboard/notes/new')
  await page.fill('input[name="title"]', 'Version Test')
  await page.fill('textarea[name="content"]', 'Version 1')
  await page.click('button:has-text("Create Note")')
  await page.waitForURL(/\/dashboard\/notes\/[a-z0-9]+/)
  const noteId = page.url().split('/').pop()

  // 3. Edit note to create versions
  await page.fill('textarea[name="content"]', 'Version 2')
  await page.waitForTimeout(3000) // auto-save
  await page.fill('textarea[name="content"]', 'Version 3')
  await page.waitForTimeout(3000) // auto-save

  // 4. Navigate to version history
  await page.click('button:has-text("View Version History")')
  await page.waitForURL(/\/dashboard\/versions/)

  // 5. Verify version list
  const versionCards = page.locator('[data-testid="version-card"]')
  expect(await versionCards.count()).toBeGreaterThan(0)

  // 6. Test restore
  await page.click('button:has-text("Restore"):first')
  await page.click('button:has-text("Restore Version")')
  await page.waitForSelector('text=restored successfully')

  // 7. Test comparison modal
  await page.click('button:has-text("View Full"):first')
  await page.waitForSelector('text=Version Comparison')
  expect(await page.isVisible('text=HISTORICAL VERSION')).toBe(true)
  expect(await page.isVisible('text=CURRENT VERSION')).toBe(true)
})
```

---

## Bug Report Template

If you find issues, please report using this format:

**Bug Title**: [TC-##] Brief description

**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected Behavior**:
- ...

**Actual Behavior**:
- ...

**Environment**:
- Browser: Chrome 120.0
- OS: Windows 11
- Screen size: 1920x1080

**Console Errors** (if any):
```
Paste errors here
```

**Screenshots** (if applicable):
Attach screenshot

---

## Success Criteria

Version History feature is considered **PASSING** if:

- [ ] All 16 test cases pass
- [ ] No console errors during normal usage
- [ ] Restore functionality works correctly
- [ ] API endpoints return expected data
- [ ] Mobile layout is usable
- [ ] Keyboard navigation works
- [ ] Security checks prevent unauthorized access
- [ ] Performance is acceptable (<1s page load)

---

## Testing Checklist Summary

- [ ] TC-1: Access Version History Page
- [ ] TC-2: View Version List
- [ ] TC-3: Sort Versions
- [ ] TC-4: Restore Version
- [ ] TC-5: View Full Version
- [ ] TC-6: Quick View from Editor
- [ ] TC-7: Empty State
- [ ] TC-8: Error - No Note ID
- [ ] TC-9: Error - Invalid Note ID
- [ ] TC-10: Mobile Responsiveness
- [ ] TC-11: Keyboard Navigation
- [ ] TC-12: Security Test
- [ ] TC-13: Performance Test
- [ ] TC-14: API - List Versions
- [ ] TC-15: API - Full Version
- [ ] TC-16: API - Restore Version

---

**Estimated Testing Time**: 45-60 minutes for complete manual testing
**Priority**: HIGH - User requested feature multiple times
**Blocking Issues**: None known

**Next Steps After Testing**:
1. Fix any bugs found
2. Update documentation if needed
3. Deploy to production
4. Monitor for errors in first 24 hours
