# Quick Start: Testing Flashcard Generation

## Step 1: Start the Server

```bash
cd /home/metrik/docker/Obscurion
npm run dev
```

## Step 2: Open Browser Console

1. Navigate to http://localhost:3000 (or your dev URL)
2. Open DevTools (F12 or right-click → Inspect)
3. Go to Console tab

## Step 3: Create a Test Note

1. Log in to your account
2. Go to Dashboard → Notes → Create New Note
3. Paste this test content:

```
Q: What is a VPN?
A: A Virtual Private Network that creates a secure encrypted connection over the internet.

**Firewall**: A network security device that monitors and controls incoming and outgoing network traffic based on predetermined security rules.

1. What are the benefits of HTTPS?
   - Encrypted communication between client and server
   - Authentication of the website identity
   - Data integrity protection
```

4. Add a title: "Flashcard Test"
5. Click "Create Note"

## Step 4: Check Server Logs

Look for these messages in your terminal:

```
[Flashcard Generation] Starting flashcard generation for new note
[Flashcard Generation] Content length: XXX chars
[Flashcard Generation] Generated 3 raw flashcards
[Note Creation] Created note with ID: clxxx...
[Flashcard Creation] Validated 3 flashcards
[Flashcard Creation] Successfully created 3 flashcards in database
```

## Step 5: Check Browser Console

You should see:

```
[Frontend] Saving note...
[Frontend] Note saved successfully: {id: "clxxx...", flashcardCount: 3}
```

## Step 6: Verify Metadata

Look at the right sidebar under "Metadata":
- Should show: **Flashcards: 3**

## Step 7: View Flashcards

1. Click the button: **View Flashcards (3)**
2. Browser console should show:
   ```
   [Frontend] Toggling flashcard display
   [Frontend] Triggering flashcard fetch
   [Frontend] Fetching flashcards for note: clxxx...
   [Frontend] Received flashcards: 3
   ```
3. You should see 3 flashcard cards displayed with questions and answers

## Expected Result

You should see 3 flashcards:

1. **Q:** What is a VPN?
   **A:** A Virtual Private Network that creates a secure encrypted connection over the internet.
   **Difficulty:** MEDIUM

2. **Q:** What is Firewall?
   **A:** A network security device that monitors and controls incoming and outgoing network traffic based on predetermined security rules.
   **Difficulty:** HARD

3. **Q:** What are the benefits of HTTPS?
   **A:** Encrypted communication between client and server • Authentication of the website identity • Data integrity protection
   **Difficulty:** MEDIUM

## If Flashcards Don't Show

### Check 1: Content Length
- Content must be **at least 50 characters**
- Your test content is 400+ chars, so this should pass

### Check 2: Pattern Matching
Make sure you're using one of these formats:
- `Q: question? A: answer`
- `**Term**: definition`
- `1. Question? • answer`

### Check 3: Server Logs
If you see this in server logs:
```
[Flashcard Generation] Generated 0 raw flashcards
```
Then your content doesn't match any patterns. Try the exact test content above.

### Check 4: Database
Check if flashcards were created:
```bash
npx prisma studio
```
Then navigate to Flashcard table and look for records with your note ID.

### Check 5: Authentication
Make sure you're logged in. If you see:
```
[Flashcard Fetch] Unauthorized access attempt
```
You need to sign in again.

## Supported Content Patterns

### 1. Explicit Q&A
```
Q: What is Docker?
A: Docker is a containerization platform.
```

### 2. Definitions
```
**Docker**: A containerization platform for applications.
```
(Auto-converts to "What is Docker?")

### 3. Lists
```
1. What are container benefits?
   - Portability
   - Consistency
   - Efficiency
```

### 4. Mixed (All Three)
You can use all formats in one note!

## Common Issues

| Issue | Solution |
|-------|----------|
| Count shows 0 | Content too short or no patterns matched |
| Can't click button | Make sure note is saved (not "new") |
| No logs appear | Check console is open, refresh page |
| Server logs missing | Verify dev server is running |
| Unauthorized error | Log out and log back in |

## Debug Commands

```bash
# Test generation logic directly
npx tsx test-flashcard-direct.ts

# Open database viewer
npx prisma studio

# View logs in real-time
npm run dev | grep "Flashcard"
```

## Need More Help?

See `FLASHCARD_DEBUGGING_GUIDE.md` for comprehensive troubleshooting.

---

**Quick Reference**: Open browser console + server terminal, create note with test content, check for `[Flashcard]` logs, verify count in metadata, click "View Flashcards".
