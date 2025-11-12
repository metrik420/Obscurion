# Obscurion v2 - Comprehensive QA Test Plan

**Date**: 2025-11-11
**Version**: 2.0.0
**Tester**: Director Agent (Quality & Release Coordinator)
**Application URL**: http://localhost:3082

---

## Quality Gates (Critical Success Criteria)

- ✅ All CRITICAL issues must be fixed
- ✅ All HIGH priority issues must be resolved
- ✅ Navigation menu appears on every page consistently
- ✅ Flashcard creation and deletion works end-to-end
- ✅ Version history works with restore functionality
- ✅ No console errors occur during normal operations
- ✅ All pages are responsive and accessible
- ✅ No secrets/tokens exposed in responses or logs
- ✅ All authentication/authorization checks work

---

## Test Categories

### 1. AUTHENTICATION & SESSION MANAGEMENT

**Priority**: CRITICAL

#### Test Cases:
- [ ] Sign up with new user
  - Valid email/password
  - Invalid email format
  - Password too short
  - Duplicate email (should fail)
- [ ] Sign in with existing user
  - Valid credentials
  - Invalid credentials
  - Empty fields
- [ ] Session persistence
  - Navigate between pages (session should persist)
  - Refresh page (should stay logged in)
- [ ] Protected routes
  - Access /dashboard without auth (should redirect to signin)
  - Access /dashboard/notes without auth (should redirect)
  - Access API endpoints without auth (should return 401)
- [ ] Sign out functionality
  - Sign out button works
  - Session cleared after sign out
  - Redirect to home page

**Expected Results**:
- No authentication bypass
- Proper error messages
- Session security maintained

---

### 2. NAVIGATION & UI CONSISTENCY

**Priority**: HIGH

#### Test Cases:
- [ ] Navigation menu appears on all dashboard pages
  - /dashboard
  - /dashboard/notes
  - /dashboard/notes/new
  - /dashboard/notes/[id]
  - /dashboard/search
- [ ] Navigation links work correctly
  - Dashboard link
  - Notes link
  - Search link
  - Templates link (if exists)
  - Sign out link
- [ ] Active page highlighting
  - Current page should be visually indicated
- [ ] Mobile responsiveness
  - Navigation works on mobile viewport
  - Burger menu (if applicable)
- [ ] Breadcrumbs or back buttons
  - Easy navigation between views

**Expected Results**:
- Consistent UI across all pages
- No broken navigation
- Clear visual hierarchy

---

### 3. DASHBOARD PAGE

**Priority**: HIGH

#### Test Cases:
- [ ] Statistics cards display correctly
  - Total notes count (accurate)
  - Active categories count (accurate)
  - Total flashcards count (accurate)
- [ ] Quick actions work
  - "Create New Note" button → /dashboard/notes/new
  - "View All Notes" button → /dashboard/notes
  - "Search" button → /dashboard/search
- [ ] Recent notes list
  - Shows 5 most recent notes
  - Displays: title, type, reading time, categories, updated date
  - Click note → opens editor
  - Empty state if no notes
- [ ] Server-side rendering
  - Page loads with data (no loading spinner)
  - No hydration errors in console

**Expected Results**:
- Accurate statistics
- All links functional
- Fast page load

---

### 4. NOTE CREATION & EDITING

**Priority**: CRITICAL

#### Test Cases:
- [ ] Create new note (/dashboard/notes/new)
  - Title input works
  - Type selector (all 7 types: GENERAL, JOURNAL, VPS, DEDICATED, SHARED, INCIDENT, DOCUMENTATION)
  - Content textarea accepts input
  - Save button creates note
  - Auto-save triggers after 2 seconds
  - Redirect to note editor after creation
- [ ] Edit existing note
  - Load note data correctly
  - Modify title (should save)
  - Modify content (should save)
  - Change type (should save)
  - Auto-save indicator shows when saving
  - Last saved timestamp updates
- [ ] Metadata sidebar displays
  - Reading time (calculated)
  - Flashcard count (accurate)
  - Version count (accurate)
  - Categories (if any)
- [ ] Actions work
  - Save Now button (manual save)
  - Cancel button (return to notes list)
  - Copy to Clipboard (copies content)
  - Export Markdown (downloads file)
- [ ] Validation
  - Title required (1-200 chars)
  - Content required (1-1MB)
  - Error messages for invalid input
- [ ] Auto-redaction
  - IP addresses redacted (e.g., 192.168.1.1 → [REDACTED_IP])
  - Passwords redacted (e.g., password: secret → [REDACTED])
  - Emails redacted (e.g., user@example.com → [REDACTED_EMAIL])

**Expected Results**:
- Seamless note creation/editing
- Auto-save works reliably
- No data loss
- Redaction applied server-side

---

### 5. FLASHCARD GENERATION & MANAGEMENT

**Priority**: CRITICAL

#### Test Cases:
- [ ] Flashcards auto-generate on note creation
  - Create note with Q&A format:
    ```
    Q: What is a VPN?
    A: A Virtual Private Network.
    ```
  - Create note with definition format:
    ```
    **Firewall**: A network security device.
    ```
  - Create note with list format:
    ```
    1. What is HTTPS?
       - Encrypted communication
    ```
  - Check flashcard count in metadata sidebar
  - Verify count matches expected (3 flashcards for above)
- [ ] View flashcards (/dashboard/notes/[id]/flashcards or modal)
  - "View Flashcards (N)" button shows count
  - Click button → displays flashcards
  - Flashcards show question and answer
  - Difficulty level shown (EASY, MEDIUM, HARD)
- [ ] Flashcard CRUD
  - Create flashcard manually (if supported)
  - Edit flashcard (if supported)
  - Delete flashcard (if supported)
- [ ] Flashcard difficulty calculation
  - Short Q&A → EASY
  - Medium Q&A → MEDIUM
  - Long Q&A → HARD
- [ ] No flashcards for short notes
  - Notes < 50 chars should generate 0 flashcards
  - Check metadata sidebar shows 0

**Expected Results**:
- Flashcards generate correctly
- Count accurate
- All formats recognized
- No crashes or errors

**Test Content**:
```markdown
Q: What is a VPN?
A: A Virtual Private Network that creates a secure encrypted connection.

**Firewall**: A network security device that monitors network traffic.

1. What are the benefits of HTTPS?
   - Encrypted communication
   - Authentication
   - Data integrity
```
**Expected**: 3 flashcards generated

---

### 6. NOTES LIST & BULK OPERATIONS

**Priority**: HIGH

#### Test Cases:
- [ ] Notes list displays (/dashboard/notes)
  - Table with columns: Checkbox, Title, Type, Categories, Reading Time, Updated, Actions
  - Pagination (10 notes per page)
  - Page indicator (Page X of Y)
  - Total count display
- [ ] Sorting
  - Sort by date (newest/oldest)
  - Sort by title (A-Z, Z-A)
  - Sort by reading time (low/high)
- [ ] Individual row actions
  - Click title → opens note editor
  - Export button → downloads Markdown
  - Delete button → confirmation dialog → deletes note
- [ ] Bulk actions
  - Select all checkbox
  - Individual row checkboxes
  - Selected count display
  - Bulk delete → confirmation → deletes all selected
- [ ] Empty state
  - No notes message
  - CTA button to create first note
- [ ] Pagination
  - Next/Previous buttons work
  - Buttons disabled on first/last page
  - Page change fetches new data

**Expected Results**:
- All operations work
- Confirmation dialogs prevent accidental deletion
- Smooth pagination

---

### 7. SEARCH FUNCTIONALITY

**Priority**: HIGH

#### Test Cases:
- [ ] Search interface (/dashboard/search)
  - Search input visible
  - Placeholder text present
  - Live search with debounce (500ms)
- [ ] Search results
  - Search for existing term → shows results
  - Search for non-existent term → "No results" message
  - Result count indicator ("Found X results")
  - Results show: title, snippet, type, categories, reading time, updated date
  - Snippets show context (200 chars)
- [ ] Match highlighting
  - Search term highlighted in title (yellow background)
  - Search term highlighted in snippet (yellow background)
  - Multiple matches highlighted
- [ ] Category filter sidebar
  - List all categories with note counts
  - "All Categories" option
  - Click category → filters results
  - Active filter highlighted
- [ ] Search-as-you-type
  - Results update as user types
  - Debounce prevents excessive API calls
  - Loading indicator during search
- [ ] Click result
  - Opens note editor
  - Correct note loaded

**Expected Results**:
- Fast, accurate search
- Highlighting works
- Filtering works
- No performance issues

---

### 8. VERSION HISTORY & RESTORE

**Priority**: CRITICAL

#### Test Cases:
- [ ] Version history created
  - Initial version on note creation
  - New version on note update
  - Version count in metadata sidebar accurate
- [ ] View version history (/api/notes/[id]/versions or UI)
  - List all versions (newest first)
  - Show: version ID, title, content preview, timestamp, user
  - Content preview (200 chars)
- [ ] Restore previous version
  - Select version to restore
  - Confirmation dialog (if applicable)
  - Restore → creates new version (non-destructive)
  - Note content updated to restored version
  - Version count increments (restore creates new version)
- [ ] Manual version creation
  - Create snapshot of current state
  - Use case: checkpoint before major edits
- [ ] Authorization
  - Only note owner can view/restore versions
  - Other users get 403 Forbidden

**Expected Results**:
- Version history works
- Restore is non-destructive
- Audit trail preserved

---

### 9. CATEGORIES

**Priority**: MEDIUM

#### Test Cases:
- [ ] Fetch categories (/api/categories GET)
  - Returns all categories
  - Shows note count per category
  - Alphabetical order
- [ ] Create category (/api/categories POST)
  - Create new category
  - Unique name validation (case-insensitive)
  - Name length validation (1-50 chars)
  - Only safe characters allowed
- [ ] Assign categories to notes
  - Add category during note creation
  - Add category during note edit
  - Multiple categories per note
  - Category badges display in UI
- [ ] Category filtering
  - Filter notes by category
  - Search by category

**Expected Results**:
- Categories work correctly
- Validation prevents duplicates
- Filtering accurate

---

### 10. IMPORT & EXPORT

**Priority**: MEDIUM

#### Test Cases:
- [ ] Export single note (Markdown)
  - Click "Export Markdown" on note
  - File downloads with correct name
  - File contains YAML frontmatter
  - Content matches note
- [ ] Export category (Markdown)
  - Export all notes in category
  - Multiple notes separated by horizontal rules
  - Each note has frontmatter
- [ ] Export as PDF (HTML)
  - Returns HTML suitable for printing
  - Inline styles applied
  - Can be printed to PDF via browser
- [ ] Import Markdown file
  - Upload .md file
  - File parsed correctly
  - Frontmatter extracted (title, type, tags)
  - Note created with content
  - Categories created from tags
  - Flashcards generated
- [ ] Import validation
  - File type validation (.md only)
  - File size limit (5MB)
  - Rate limit (5 files per request)
- [ ] Import error handling
  - Invalid file → error message
  - Partial success → summary report
  - Per-file success/failure status

**Expected Results**:
- Export produces valid files
- Import parses correctly
- Error handling robust

---

### 11. TEMPLATES

**Priority**: LOW

#### Test Cases:
- [ ] List templates (/api/templates GET)
  - Returns all templates
  - Shows: name, description, icon, tags
- [ ] Get template by ID (/api/templates/[id] GET)
  - Returns full template content
- [ ] Create template (/api/templates POST)
  - Create new template
  - Validation (name, content)
- [ ] Use template to create note
  - Select template
  - Content pre-filled
  - User can edit before saving

**Expected Results**:
- Templates system works
- Speeds up note creation

---

### 12. API ENDPOINTS

**Priority**: CRITICAL

#### Test Cases:
- [ ] Health check (/api/health)
  - Returns 200 OK
  - No errors
- [ ] Authentication required
  - All /api/notes endpoints require auth
  - All /api/categories endpoints require auth
  - All /api/search endpoints require auth
  - Unauthenticated requests return 401
- [ ] Authorization checks
  - User can only access own notes
  - User cannot edit/delete other users' notes
  - Attempts return 403 Forbidden
- [ ] Input validation
  - Invalid data returns 400 Bad Request
  - Error messages are clear
- [ ] Rate limiting (if implemented)
  - Too many requests return 429

**Expected Results**:
- All endpoints secured
- Proper HTTP status codes
- Clear error messages

---

### 13. PERFORMANCE

**Priority**: MEDIUM

#### Test Cases:
- [ ] Page load times
  - Dashboard < 1 second
  - Notes list < 1 second
  - Note editor < 500ms
  - Search results < 500ms
- [ ] API response times
  - GET /api/notes < 200ms
  - POST /api/notes < 500ms
  - GET /api/search < 300ms
- [ ] Database queries
  - No N+1 query problems
  - Pagination working
  - Indices being used
- [ ] Client-side performance
  - No memory leaks
  - Debouncing working (auto-save, search)
  - No excessive re-renders

**Expected Results**:
- Fast, responsive application
- No performance bottlenecks

---

### 14. SECURITY

**Priority**: CRITICAL

#### Test Cases:
- [ ] No secrets in responses
  - API responses don't contain passwords
  - API responses don't contain session tokens
  - API responses don't contain database credentials
- [ ] No secrets in logs
  - Server logs don't contain sensitive data
  - Browser console doesn't show secrets
- [ ] SQL injection prevention
  - Prisma ORM used (parameterized queries)
  - No raw SQL with user input
- [ ] XSS prevention
  - User content properly escaped in React
  - No dangerouslySetInnerHTML without sanitization
- [ ] CSRF protection
  - NextAuth provides CSRF tokens
- [ ] Auto-redaction works
  - IP addresses redacted
  - Passwords redacted
  - Emails redacted
  - API keys redacted

**Expected Results**:
- No security vulnerabilities
- Data properly protected
- Redaction working

---

### 15. ACCESSIBILITY & RESPONSIVENESS

**Priority**: MEDIUM

#### Test Cases:
- [ ] Keyboard navigation
  - Tab through all interactive elements
  - Enter/Space activate buttons
  - Escape closes modals
- [ ] Screen reader compatibility
  - ARIA labels on buttons
  - Proper heading hierarchy (H1, H2, H3)
  - Alt text on images
- [ ] Mobile responsiveness
  - Test on viewport widths: 320px, 768px, 1024px, 1920px
  - Navigation works on mobile
  - Tables responsive or scrollable
  - Buttons accessible on touch
- [ ] Color contrast
  - Text readable (WCAG AA compliance)
  - Links distinguishable
- [ ] Focus indicators
  - Visible focus outlines
  - Focus trapping in modals

**Expected Results**:
- Accessible to all users
- Works on all screen sizes
- WCAG 2.1 AA compliant

---

### 16. ERROR HANDLING

**Priority**: HIGH

#### Test Cases:
- [ ] Network errors
  - Disable network → try to save note
  - Error message displayed
  - User can retry
- [ ] Server errors
  - Simulate 500 error → check UI response
  - User-friendly error message
  - No stack traces in production
- [ ] Validation errors
  - Empty required fields → show error
  - Invalid email → show error
  - Content too long → show error
- [ ] Not found errors
  - Access non-existent note → 404 message
  - Access non-existent user → 404 message
- [ ] Database connection errors
  - Graceful degradation
  - Error logged
  - User notified

**Expected Results**:
- Graceful error handling
- User-friendly messages
- No crashes

---

### 17. BROWSER CONSOLE CHECKS

**Priority**: HIGH

#### Test Cases:
- [ ] No JavaScript errors
  - Navigate all pages
  - Perform all actions
  - Check console for errors
- [ ] No React warnings
  - No key prop warnings
  - No hydration mismatches
  - No deprecated API warnings
- [ ] Logging appropriate
  - Helpful logs in development
  - No sensitive data logged
  - No excessive logging (performance)

**Expected Results**:
- Clean console
- No unexpected errors
- Useful debugging info

---

## Testing Environment

- **Browser**: Chrome/Firefox/Safari (test all)
- **Viewport Sizes**: 320px, 768px, 1024px, 1920px
- **Network**: Normal, Slow 3G (throttling)
- **Application**: http://localhost:3082
- **Docker**: Containers running and healthy

---

## Bug Severity Classification

### CRITICAL
- Application crash or data loss
- Security vulnerability
- Authentication bypass
- Data corruption
- Core feature completely broken

### HIGH
- Major feature not working
- Broken navigation
- API errors affecting multiple users
- Performance degradation > 2x expected
- Accessibility blocker

### MEDIUM
- Minor feature not working
- UI inconsistency
- Non-critical error messages
- Performance degradation < 2x expected
- Missing validation

### LOW
- Cosmetic issues
- Minor UI improvements
- Documentation typos
- Nice-to-have features
- Minor performance optimizations

---

## Test Execution Order

1. **Phase 1**: Authentication & Session (CRITICAL)
2. **Phase 2**: Navigation & UI Consistency (HIGH)
3. **Phase 3**: Note CRUD (CRITICAL)
4. **Phase 4**: Flashcard Generation (CRITICAL)
5. **Phase 5**: Version History (CRITICAL)
6. **Phase 6**: Search & Filtering (HIGH)
7. **Phase 7**: Bulk Operations (HIGH)
8. **Phase 8**: Import/Export (MEDIUM)
9. **Phase 9**: Categories (MEDIUM)
10. **Phase 10**: Templates (LOW)
11. **Phase 11**: Performance & Security (CRITICAL)
12. **Phase 12**: Accessibility (MEDIUM)

---

## Success Criteria for Release

### READY TO DEPLOY ✅
- All CRITICAL issues fixed
- All HIGH issues fixed
- < 5 MEDIUM issues (non-blocking)
- All quality gates passed
- No console errors
- Navigation consistent
- Flashcards working
- Version history working

### NEEDS MINOR FIXES ⚠️
- 1-2 CRITICAL issues (with workarounds)
- < 10 HIGH issues
- Some quality gates failed
- Minor console errors
- Mostly functional

### NEEDS MAJOR WORK ❌
- > 2 CRITICAL issues
- > 10 HIGH issues
- Core features broken
- Security vulnerabilities
- Not production-ready

---

**Next Step**: Execute test plan systematically and document all findings.
