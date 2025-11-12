# Flashcard Generation Debugging Guide

## Overview

This guide helps diagnose issues with automatic flashcard generation in Obscurion.

## How Flashcard Generation Works

### 1. When a Note is Created (POST /api/notes)

```
User submits note content
    ↓
Content is redacted (emails, IPs, credentials removed)
    ↓
generateFlashcardsFromContent(redactedContent) is called
    ↓
Three extraction strategies run in parallel:
    - Explicit Q&A: Looks for "Q: ... A: ..." patterns
    - Definitions: Looks for "**Term**: Definition" patterns
    - List-based: Looks for numbered questions with sub-answers
    ↓
Flashcards are validated and deduplicated
    ↓
Valid flashcards are inserted into database via transaction
    ↓
Note is returned with flashcardCount in metadata
```

### 2. When Flashcards are Displayed (GET /api/notes/[id]/flashcards)

```
User clicks "View Flashcards"
    ↓
Frontend calls /api/notes/{noteId}/flashcards
    ↓
API verifies note ownership
    ↓
Flashcards are fetched from database
    ↓
Flashcards are displayed in UI
```

## Console Logging

### Backend Logs (Server Console)

When creating a note:
```
[Flashcard Generation] Starting flashcard generation for new note
[Flashcard Generation] Content length: 523 chars
[Flashcard Generation] Generated 3 raw flashcards
[Flashcard Generation] Sample flashcard: {...}
[Note Creation] Created note with ID: clxxx...
[Flashcard Creation] Validated 3 flashcards
[Flashcard Creation] Successfully created 3 flashcards in database
```

When fetching flashcards:
```
[Flashcard Fetch] Fetching flashcards for note: clxxx...
[Flashcard Fetch] Found 3 flashcards for note: clxxx...
[Flashcard Fetch] Sample flashcard: {...}
```

### Frontend Logs (Browser Console)

When saving a note:
```
[Frontend] Saving note...
[Frontend] Note saved successfully: {id: "clxxx...", flashcardCount: 3}
```

When loading note:
```
[Frontend] Note data fetched: {id: "clxxx...", flashcardCount: 3, title: "..."}
```

When viewing flashcards:
```
[Frontend] Toggling flashcard display
[Frontend] Triggering flashcard fetch
[Frontend] Fetching flashcards for note: clxxx...
[Frontend] Flashcard fetch response status: 200
[Frontend] Received flashcards: 3
[Frontend] First flashcard: {question: "...", difficulty: "MEDIUM"}
```

## Troubleshooting

### Issue: Flashcard count shows 0

**Possible causes:**
1. Content doesn't match any extraction patterns
2. Content is too short (< 50 chars)
3. Validation is filtering out generated flashcards
4. Transaction failed during creation

**How to diagnose:**
1. Check server logs for `[Flashcard Generation]` messages
2. Look for the "Generated X raw flashcards" log
3. Check if validation reduced the count: "Validated Y flashcards"
4. Verify database transaction succeeded

**Solution:**
- Ensure content uses one of the supported patterns (see below)
- Check minimum content length (50 chars)
- Review validation rules in validateFlashcard()

### Issue: Flashcards don't display

**Possible causes:**
1. Frontend fetch is failing (check browser console)
2. API endpoint is returning error
3. Note ownership check is failing
4. Component state is not updating

**How to diagnose:**
1. Open browser DevTools → Console
2. Look for `[Frontend]` log messages
3. Check Network tab for `/api/notes/{id}/flashcards` request
4. Verify response status and body
5. Check if flashcardCount in metadata is > 0

**Solution:**
- Verify user is authenticated
- Check noteId is correct
- Ensure note exists in database
- Verify flashcards table has records for that noteId

### Issue: Flashcard count incorrect

**Possible causes:**
1. Count is cached from before flashcards were created
2. Transaction committed but count query ran before
3. Flashcards were deleted separately

**How to diagnose:**
1. Run direct database query:
   ```sql
   SELECT COUNT(*) FROM "Flashcard" WHERE "noteId" = 'your-note-id';
   ```
2. Check if count matches what's displayed
3. Refresh the page to reload metadata

**Solution:**
- The count is calculated via `_count: { select: { flashcards: true } }` in the API
- Ensure this is included in all note queries
- Verify Prisma client is up to date

## Supported Content Patterns

### 1. Explicit Q&A Format

```
Q: What is Docker?
A: Docker is a platform for developing, shipping, and running applications.

Question: What is Kubernetes?
Answer: Kubernetes is a container orchestration platform.
```

**Pattern:** `Q:/Question: ... A:/Answer: ...`

### 2. Definition Format

```
**Docker**: A platform for developing, shipping, and running applications.

**Kubernetes**: A container orchestration platform for automating deployment.
```

**Pattern:** `**Term**: Definition` or `Term: Definition`

**Note:** Automatically converts to "What is {Term}?" questions

### 3. List-Based Q&A

```
1. What is the difference between TCP and UDP?
   - TCP is connection-oriented
   - UDP is connectionless
   - TCP is reliable

2. What are the benefits of HTTPS?
   - Encrypted communication
   - Authentication
   - Data integrity
```

**Pattern:** Numbered question ending with `?` followed by indented bullet points

### 4. Mixed Format

You can combine all three formats in a single note. The generator will extract flashcards using all applicable patterns.

## Minimum Requirements

For flashcards to be generated, content must:

1. Be at least 50 characters long
2. Match at least one extraction pattern
3. Have questions ≥ 5 characters
4. Have answers ≥ 3 characters
5. Questions must contain `?` or start with "What is/How to/Define"

## Testing Flashcard Generation

### Method 1: Direct Logic Test

```bash
npx tsx test-flashcard-direct.ts
```

This tests the generation logic without database or API.

### Method 2: End-to-End Test

1. Start development server: `npm run dev`
2. Create a note with test content (see recommended content below)
3. Check both server console and browser console for logs
4. Verify flashcard count in metadata
5. Click "View Flashcards" to see generated cards

### Method 3: Database Query

```bash
npx prisma studio
```

Then navigate to Flashcard table and verify records exist.

## Recommended Test Content

```
Q: What is a VPN?
A: A Virtual Private Network that creates a secure encrypted connection over the internet.

**Firewall**: A network security device that monitors and controls incoming and outgoing network traffic based on predetermined security rules.

1. What are the benefits of HTTPS?
   - Encrypted communication between client and server
   - Authentication of the website identity
   - Data integrity protection
```

This content should generate 3 flashcards.

## Code Locations

| Component | File Path |
|-----------|-----------|
| Generation Logic | `/src/lib/flashcard-generator.ts` |
| Note Creation API | `/src/app/api/notes/route.ts` (POST handler) |
| Flashcard Fetch API | `/src/app/api/notes/[id]/flashcards/route.ts` |
| Frontend Display | `/src/app/dashboard/notes/[id]/page.tsx` |
| Database Schema | `/prisma/schema.prisma` |

## Database Schema

```prisma
model Flashcard {
  id         String   @id @default(cuid())
  question   String
  answer     String   @db.Text
  difficulty String   @default("MEDIUM")
  noteId     String
  createdAt  DateTime @default(now())

  note       Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)

  @@index([noteId])
}
```

## Common Edge Cases

### Case 1: Content with Sensitive Data

Content is redacted BEFORE flashcard generation, so generated flashcards will contain redacted content:

```
Original: "Email admin@example.com for access"
Redacted: "Email [REDACTED] for access"
Flashcard: Will contain [REDACTED]
```

### Case 2: Very Long Content

- Content length is unlimited for generation
- But questions are capped at 500 chars
- And answers are capped at 2000 chars

### Case 3: Special Characters

The generator handles:
- Unicode characters
- Markdown formatting
- Code blocks (may generate unexpected results)
- HTML (should be avoided in note content)

## Performance Considerations

- Generation is O(n) where n = content length
- Regex matching is linear with content size
- Database insertion uses batch createMany for efficiency
- Typical generation time: < 50ms for notes up to 10KB

## Security Notes

- Flashcards inherit note ownership (via noteId foreign key)
- Cascade delete: Deleting a note deletes all flashcards
- No public access: All endpoints require authentication
- Ownership verification happens in API layer

## Future Improvements

Potential enhancements:
1. AI-powered generation using LLM APIs
2. Spaced repetition scheduling
3. Manual flashcard editing
4. Import/export flashcard decks
5. Flashcard review mode with tracking
6. Difficulty auto-adjustment based on review performance

## Support

If flashcards still aren't working after following this guide:

1. Collect server logs (with timestamps)
2. Collect browser console logs
3. Export database schema: `npx prisma db pull`
4. Run database query to verify flashcard records
5. Share sample content that should generate flashcards
6. Include screenshots of the issue

## Changelog

- 2025-11-11: Added comprehensive logging to all flashcard-related code
- 2025-11-11: Fixed generation to use redacted content (was using original)
- 2025-11-11: Enhanced frontend logging for debugging
- 2025-11-11: Created debugging guide and test scripts
