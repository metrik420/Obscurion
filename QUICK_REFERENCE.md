# Obscurion - Quick Reference Guide

## Key Files at a Glance

### Database Schema
- **File**: `prisma/schema.prisma` (103 lines)
- **Key Models**: User, Note, Category, Flashcard, NoteVersion, NoteTemplate
- **Access Pattern**: Via Prisma ORM singleton in `src/lib/db.ts`

### Authentication
- **Config**: `src/lib/auth.ts` (90 lines)
- **Provider**: NextAuth Credentials (JWT + bcrypt)
- **Session**: 30-day expiration, httpOnly cookies
- **Types**: `src/types/next-auth.d.ts`
- **Signup Route**: `src/app/api/auth/signup/route.ts`

### API Routes (16 total)
- **Notes CRUD**: `src/app/api/notes/route.ts` (623 lines, comprehensive)
- **Flashcards**: `src/app/api/notes/[id]/flashcards/route.ts` + generate endpoint
- **Versions**: `src/app/api/notes/[id]/versions/route.ts`
- **Categories**: `src/app/api/categories/route.ts`
- **Search**: `src/app/api/search/route.ts`
- **Export/Import**: `src/app/api/export/route.ts`, `src/app/api/import/route.ts`
- **Templates**: `src/app/api/templates/route.ts` + `[id]/route.ts`
- **Health**: `src/app/api/health/route.ts`

### Core Utilities
- **Redaction**: `src/lib/redaction.ts` - Auto-removes PII, emails, IPs, secrets
- **Flashcard Generator**: `src/lib/flashcard-generator.ts` (271 lines) - Pattern matching Q&A extraction
- **Validation**: `src/lib/validation.ts` - Input validation helpers
- **Export/Import**: `src/lib/export.ts`, `src/lib/import.ts`

### Pages & Components
- **Main Dashboard**: `src/app/dashboard/page.tsx` (Server component + auth)
- **Notes Management**: `src/app/dashboard/notes/page.tsx` + `client.tsx`
- **Note Detail**: `src/app/dashboard/notes/[id]/page.tsx`
- **Flashcards**: `src/app/dashboard/flashcards/page.tsx` + `client.tsx`
- **Search**: `src/app/dashboard/search/page.tsx` + `client.tsx`
- **Versions**: `src/app/dashboard/versions/page.tsx` + `client.tsx`
- **Auth**: `src/app/auth/signin/page.tsx`, `signup/page.tsx`

### UI Components
- **Button**: `src/components/ui/button.tsx` - Variants: primary, secondary, danger, ghost
- **Card**: `src/components/ui/card.tsx` - CardHeader, CardBody
- **Input**: `src/components/ui/input.tsx`
- **Navigation**: `src/components/Navigation.tsx` (285 lines) - Sticky header with responsive menu

---

## Architecture at a Glance

```
Browser → Next.js 14 (Server + Client Components)
          ↓
          API Routes (Auth, CRUD, Search, Export/Import)
          ↓
          Prisma ORM
          ↓
          PostgreSQL (User, Note, Category, Flashcard, Version, Template)
```

### Key Patterns
1. **Server Components** for data fetching + security
2. **Client Components** (separate `client.tsx` files) for interactivity
3. **Auth Check**: `getServerSession(authOptions)` on every protected route
4. **Authorization**: Verify `session.user.email === note.authorEmail`
5. **Validation**: Input checks before DB operations
6. **Transactions**: `db.$transaction()` for atomic operations
7. **Cascade Deletes**: Prisma handles orphaned records

---

## Common Tasks

### Add a New API Endpoint
1. Create file: `src/app/api/[resource]/route.ts`
2. Import: `{ NextRequest, NextResponse }`, `getServerSession`, `db`, validators
3. Auth check: `const session = await getServerSession(authOptions)`
4. Validate: Use functions from `src/lib/validation.ts`
5. Query: Use `db.[model].findMany()`, `.create()`, `.update()`, `.delete()`
6. Return: `NextResponse.json(data, { status: 201 })`

Example:
```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const data = await db.note.findMany({
    where: { authorEmail: session.user.email },
    include: { categories: true },
  })
  
  return NextResponse.json({ notes: data })
}
```

### Add a New Database Model
1. Edit: `prisma/schema.prisma`
2. Define model with fields, relations, indices
3. Run: `npm run db:migrate` (creates migration)
4. Prisma types auto-generated in `node_modules/.prisma/client`

### Add a New Dashboard Page
1. Create: `src/app/dashboard/[feature]/page.tsx` (Server)
2. Add auth check + data fetch with `getDashboardData(userEmail)`
3. Create: `src/app/dashboard/[feature]/client.tsx` (Client, with `'use client'`)
4. Export client component from page
5. Add navigation link in `src/components/Navigation.tsx`

### Style a Component
- Use Tailwind utility classes (already configured)
- Colors: gray, blue (primary), purple (secondary), red, green
- Responsive: `hidden md:flex` (mobile-first)
- Dark mode: (supported but not configured yet)

### Create a Form
1. Make it a client component: `'use client'`
2. Use `useState` for form state
3. Use `useSession()` for auth check
4. POST to API route, handle response
5. Use `Button`, `Input` components from `src/components/ui/`

---

## Database Schema Quick View

```
User
├─ id (CUID)
├─ email (unique)
├─ name
├─ password (bcrypt)
├─ role (default: "user")
└─ Relations: notes, noteVersions

Note
├─ id (CUID)
├─ title
├─ content (redacted)
├─ type (GENERAL, INCIDENT, etc)
├─ authorEmail (FK → User.email)
├─ readingTime (seconds)
└─ Relations: categories, flashcards, versions

Category
├─ id (CUID)
├─ name (unique)
└─ Relations: notes (via NoteCategory)

NoteCategory (Junction)
├─ noteId (FK)
├─ categoryId (FK)
└─ Unique constraint: (noteId, categoryId)

Flashcard
├─ id (CUID)
├─ question
├─ answer
├─ difficulty (EASY, MEDIUM, HARD)
├─ noteId (FK)
└─ Relations: note

NoteVersion (Audit Trail)
├─ id (CUID)
├─ noteId (FK)
├─ userId (FK)
├─ title
├─ content (redacted)
└─ createdAt

NoteTemplate
├─ id (CUID)
├─ name (unique)
├─ description
├─ icon
├─ content (boilerplate)
└─ tags (array)
```

---

## API Response Format

### Success Response (200, 201)
```json
{
  "notes": [
    {
      "id": "cuid...",
      "title": "...",
      "content": "...",
      "type": "GENERAL",
      "authorEmail": "user@example.com",
      "readingTime": 5,
      "categories": ["Security"],
      "categoryIds": ["cat123"],
      "flashcardCount": 12,
      "versionCount": 2,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasMore": true
  }
}
```

### Error Response (4xx, 5xx)
```json
{
  "error": "Validation error | Unauthorized | Not found | Internal server error",
  "message": "Detailed explanation of what went wrong"
}
```

---

## Common Queries

### Fetch User's Notes with Categories
```typescript
const notes = await db.note.findMany({
  where: { authorEmail: 'user@example.com' },
  include: {
    categories: { include: { category: true } },
    _count: { select: { flashcards: true, versions: true } }
  },
  orderBy: { updatedAt: 'desc' },
  take: 10,
  skip: 0,
})
```

### Create Note with Categories & Flashcards
```typescript
const note = await db.$transaction(async (tx) => {
  const newNote = await tx.note.create({
    data: {
      title: 'Title',
      content: 'redacted content',
      authorEmail: 'user@example.com',
      readingTime: 5,
    },
  })
  
  // Add categories
  await tx.noteCategory.createMany({
    data: [
      { noteId: newNote.id, categoryId: 'cat1' },
    ],
  })
  
  // Add flashcards
  await tx.flashcard.createMany({
    data: [
      { noteId: newNote.id, question: 'Q?', answer: 'A.', difficulty: 'MEDIUM' },
    ],
  })
  
  return newNote
})
```

### Update Note with New Categories
```typescript
await db.$transaction(async (tx) => {
  // Remove old
  await tx.noteCategory.deleteMany({ where: { noteId: 'note1' } })
  
  // Add new
  await tx.noteCategory.createMany({
    data: [
      { noteId: 'note1', categoryId: 'cat2' },
    ],
  })
  
  // Create version entry
  await tx.noteVersion.create({
    data: {
      noteId: 'note1',
      userId: 'user1',
      title: 'New Title',
      content: 'new content',
    },
  })
})
```

---

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/obscurion
NEXTAUTH_URL=https://example.com
NEXTAUTH_SECRET=very-long-random-secret-min-32-chars

# Optional
NODE_ENV=production
```

---

## Development vs Production

### Development
- `NODE_ENV=development`
- Prisma client kept in global variable (hot reload)
- NEXTAUTH_URL can be http://localhost:3082
- Secure cookie flag disabled
- Debug logging enabled

### Production
- `NODE_ENV=production`
- NEXTAUTH_URL must be https
- Secure cookie flag enabled
- All secrets in environment variables
- Error tracking (Sentry, DataDog)
- Database backups configured

---

## Performance Tips

1. **Database Queries**
   - Always include indices on frequently used fields
   - Use `select` to fetch only needed columns
   - Avoid N+1 queries (use `include` wisely)
   - Paginate large result sets

2. **Components**
   - Use server components for data fetching
   - Keep client components small
   - Memoize callbacks: `useCallback`
   - Lazy load with `React.lazy()`

3. **API**
   - Cache responses with headers: `Cache-Control: public, max-age=3600`
   - Compress responses: Gzip built-in
   - Use pagination on GET endpoints

4. **CSS**
   - Tailwind purges unused styles
   - CSS < 100KB (currently much smaller)
   - No custom CSS files (use Tailwind utilities)

---

## Debugging

### Check Session
```typescript
const session = await getServerSession(authOptions)
console.log('Session:', session?.user)  // { id, email, name, role }
```

### Inspect Database
```bash
npm run db:studio  # Opens Prisma Studio GUI
```

### Check Built Files
```bash
npm run build  # Runs TypeScript + Next.js build
# Check .next/ directory for errors
```

### View Logs
```bash
# In production, use `npm start`
# Logs go to stdout (capture with Docker logs, PM2, etc)
```

---

## Useful Commands

```bash
# Development
npm run dev              # Start on localhost:3082

# Building
npm run build            # Build for production
npm start                # Start production server

# Database
npm run db:migrate       # Run pending migrations
npm run db:push          # Push schema (dev only)
npm run db:studio        # Open Prisma GUI
npm run db:seed          # Run seed script (if exists)

# Code Quality
npm run lint             # Run ESLint
```

---

## Common Errors & Solutions

### "User not found"
- Check email spelling
- Verify user exists: `npm run db:studio`
- Try signup first

### "Unauthorized" on API
- Check session token (cookie expires after 30 days)
- Re-login if needed
- Verify NEXTAUTH_URL matches request origin

### "Invalid note ID"
- Note ID must be valid CUID format
- Try: `await db.note.findUnique({ where: { id } })`
- Return 404 if not found

### Database Connection Error
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Check password doesn't have special characters
- If special chars: URL-encode them

### Flashcard Generation No Results
- Check content has patterns (Q: A:, lists with numbers, etc)
- Min question: 5 chars, Min answer: 10 chars
- Check redaction didn't remove too much

---

## Ready for Enhancement Areas

Based on existing scaffolding:

1. **Admin Features**
   - Role field exists, needs enforcement
   - Add `/dashboard/admin` pages
   - User management, audit logs, site stats

2. **User Roles**
   - Role enforcement middleware
   - Fine-grained permissions
   - Moderator views for all notes

3. **Customization**
   - Branding (logo, colors, site name)
   - Custom redaction rules
   - Note template library

4. **Compliance**
   - GDPR data export/deletion
   - Audit trail UI
   - Data retention policies
   - IP whitelisting

5. **Enterprise**
   - SSO (OAuth, SAML)
   - API keys
   - Webhooks
   - Multi-org support

---

## File Size Reference

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/api/notes/route.ts` | 623 | Main CRUD handler |
| `src/lib/flashcard-generator.ts` | 271 | Q&A extraction |
| `src/components/Navigation.tsx` | 285 | Header nav |
| `prisma/schema.prisma` | 103 | Database schema |
| `src/lib/auth.ts` | 90 | NextAuth config |
| Total TypeScript files | 48 | Throughout codebase |

---

## Summary Checklist

When adding features, ensure:
- ✓ Auth check with `getServerSession()`
- ✓ Authorization check (email verification)
- ✓ Input validation with validation functions
- ✓ DB transaction for multi-step operations
- ✓ Consistent error responses
- ✓ Server component for data fetching
- ✓ Separate client component for interactivity
- ✓ Responsive design (mobile-first Tailwind)
- ✓ TypeScript strict mode compliance
- ✓ Navigation link if new page

