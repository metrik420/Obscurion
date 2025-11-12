# Obscurion Project Architecture Overview

## Project Overview

**Obscurion** is an Advanced Knowledge Management and Incident Documentation System built on Next.js 14 with TypeScript, PostgreSQL, and Next-Auth. It provides tools for creating, organizing, and learning from notes with automatic flashcard generation, version control, and content redaction.

**Version**: 2.0.0  
**Port**: 3082  
**Framework**: Next.js 14 (App Router)  
**ORM**: Prisma 5.7.1  
**Auth**: NextAuth 4.24.7  
**Styling**: Tailwind CSS 3.4.1  
**Database**: PostgreSQL

---

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router (server & client components)
- **React 18** - UI library
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **TypeScript** - Type-safe development
- **NextAuth React** - Client-side session handling

### Backend
- **Next.js API Routes** - App Router pattern (`src/app/api/*`)
- **NextAuth 4.24.7** - Authentication (Credentials provider with JWT)
- **Prisma 5.7.1** - ORM for PostgreSQL with migrations
- **bcryptjs** - Password hashing (10-salt rounds)
- **Zod** - Data validation (referenced but not fully integrated everywhere)

### Database
- **PostgreSQL** - Relational database
- **Prisma Migrations** - Schema versioning
- **DB Indices** - Performance optimization on frequently queried fields

### Development
- **TypeScript 5.3.3** - Static typing
- **ESLint** - Code linting
- **PostCSS** - CSS processing for Tailwind
- **Docker** - Containerization

---

## Database Schema (Prisma)

### Core Models

#### User
```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String?
  password    String   (bcrypt hashed)
  role        String   @default("user")  // For RBAC: admin, user, etc.
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  notes         Note[]
  noteVersions  NoteVersion[]
}
```
- User-centric access control via `email` field
- `role` field prepared for future RBAC (admin, moderator, etc.)

#### Note
```prisma
model Note {
  id            String   @id @default(cuid())
  title         String
  content       String   @db.Text  (auto-redacted)
  type          String   @default("GENERAL")
  authorEmail   String   (FK to User.email)
  readingTime   Int      @default(0)  (200 WPM baseline)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  author        User?
  categories    NoteCategory[]
  flashcards    Flashcard[]
  versions      NoteVersion[]

  @@index([authorEmail])
  @@index([createdAt])
}
```
- Notes are immutable on creation; redaction is permanent
- `type` field supports different content categories
- `readingTime` calculated in milliseconds

#### Category
```prisma
model Category {
  id        String   @id @default(cuid())
  name      String   @unique
  createdAt DateTime @default(now())

  notes     NoteCategory[]
}
```
- Global categories, many-to-many with notes

#### NoteCategory
```prisma
model NoteCategory {
  id         String  @id @default(cuid())
  noteId     String  (FK)
  categoryId String  (FK)

  note      Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)
  category  Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([noteId, categoryId])
  @@index([noteId])
  @@index([categoryId])
}
```
- Junction table with cascade delete
- Ensures no duplicate category assignments per note

#### Flashcard
```prisma
model Flashcard {
  id          String   @id @default(cuid())
  question    String
  answer      String   @db.Text
  difficulty  String   @default("MEDIUM")
  noteId      String   (FK)
  createdAt   DateTime @default(now())

  note        Note @relation(fields: [noteId], references: [id], onDelete: Cascade)

  @@index([noteId])
}
```
- Auto-generated from note content on creation
- Difficulty levels: EASY, MEDIUM, HARD (pattern-based detection)
- Cascade deletes with parent note

#### NoteVersion
```prisma
model NoteVersion {
  id        String   @id @default(cuid())
  noteId    String   (FK)
  userId    String   (FK)
  title     String
  content   String   @db.Text (redacted)
  createdAt DateTime @default(now())

  note      Note @relation(fields: [noteId], references: [id], onDelete: Cascade)
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([noteId])
  @@index([userId])
}
```
- Version history on every note update
- Enables audit trail and rollback capability

#### NoteTemplate
```prisma
model NoteTemplate {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  icon        String?
  content     String   @db.Text (boilerplate)
  tags        String[]
  createdAt   DateTime @default(now())
}
```
- Reusable templates for note creation
- Not yet linked to User (potential enhancement)

---

## Authentication & User Model

### NextAuth Configuration (`src/lib/auth.ts`)

**Provider**: Credentials (username/password)

```typescript
const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      // Email + password authentication
      authorize: async (credentials) => {
        // 1. Find user by email
        // 2. Compare bcrypt password
        // 3. Return user object with { id, email, name, role }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60  // 30 days
  },
  callbacks: {
    jwt: (token, user) => {
      // Populate token with id, email, role
    },
    session: (session, token) => {
      // Inject role into session.user
    }
  },
  pages: {
    signIn: '/auth/signin'
  },
  cookies: {
    secure: true in production, false in dev
    sameSite: 'lax'
    httpOnly: true
  }
}
```

### Session Type (`src/types/next-auth.d.ts`)

```typescript
interface User {
  id: string
  email: string
  name?: string
  role?: string  // Admin RBAC ready
}
```

### Password Hashing
- Algorithm: bcryptjs with 10 salt rounds
- Applied on signup in `/api/auth/signup`
- Verified on login in credentials provider
- Never stored in plaintext

### Current Access Control
- **User-scoped**: All operations check `session.user.email`
- **Authorization**: Verify note author matches current user before updates
- **No RBAC yet**: `role` field exists but not enforced on endpoints

---

## API Endpoints & Route Structure

### Authentication Routes

#### `POST /api/auth/signin` 
- Handled by NextAuth (credentials verification)
- Returns JWT session token
- Redirects to `/auth/signin` on failure

#### `POST /api/auth/signup`
- Create new user with email + password
- Hash password with bcrypt
- Verify email uniqueness
- Returns: `{ user: { email, name } }`
- Status: 201 on success, 409 if user exists

#### `GET/POST /api/auth/[...nextauth]`
- NextAuth catch-all handler
- Manages session, signout, CSRF tokens

### Notes CRUD (`/api/notes`)

#### `GET /api/notes`
**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 10, max: 100)
- `sortBy` (createdAt, updatedAt, title, readingTime)
- `sortOrder` (asc, desc)
- `categoryId` (optional filter)
- `type` (optional filter)

**Response**:
```json
{
  "notes": [
    {
      "id": "...",
      "title": "...",
      "content": "... (redacted)",
      "type": "GENERAL",
      "readingTime": 5,
      "categories": ["Security", "Incident"],
      "flashcardCount": 12,
      "versionCount": 3
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

#### `POST /api/notes`
**Request Body**:
```json
{
  "title": "string (1-200 chars)",
  "content": "string (1MB max)",
  "type": "GENERAL|INCIDENT|PROCEDURE|etc",
  "categoryIds": ["cat1", "cat2"]  // optional
}
```

**Side Effects**:
1. **Auto-Redaction**: Removes emails, IPs, credentials, secrets
2. **Reading Time**: Calculated as `contentWords / 200 * 60`
3. **Flashcard Generation**: Uses pattern matching on redacted content
   - Q&A patterns (Q: ... A: ...)
   - List-based patterns (1. ... 2. ...)
   - Definition patterns (Term: ... Definition: ...)
4. **Version Tracking**: Creates initial NoteVersion entry
5. **Category Association**: Links to existing categories

**Response**: Created note with `flashcardCount` (201 Created)

#### `PUT /api/notes`
**Request Body**:
```json
{
  "id": "noteId",
  "title": "...",  // optional
  "content": "...",  // optional + redacted
  "type": "...",  // optional
  "categoryIds": [...]  // optional, replaces all
}
```

**Side Effects**:
1. Re-applies redaction to new content
2. Recalculates reading time
3. Creates NoteVersion entry
4. Does NOT regenerate flashcards (manual operation)
5. Replaces all category associations

**Response**: Updated note with metadata

#### `DELETE /api/notes?id=...`
**Cascade Deletes**:
- All NoteCategory associations
- All Flashcard records
- All NoteVersion records

**Response**: `{ success: true, message: "..." }`

### Flashcards (`/api/notes/[id]/flashcards`)

#### `GET /api/notes/[id]/flashcards`
- Fetch all flashcards for a specific note
- Returns array with difficulty, question, answer

#### `POST /api/notes/[id]/flashcards`
- Manually create flashcard for a note
- Body: `{ question, answer, difficulty }`

#### `POST /api/notes/[id]/flashcards/generate`
- **Re-generate flashcards from note content**
- Deletes existing, creates new ones
- Uses same pattern matching as note creation
- Returns count and sample cards

#### `PUT/DELETE /api/notes/[id]/flashcards/[cardId]`
- Update individual card (question, answer, difficulty)
- Delete specific card

### Versions (`/api/notes/[id]/versions`)

#### `GET /api/notes/[id]/versions`
- Fetch all version history for a note
- Paginated, sorted by createdAt desc
- Shows who edited and when

#### `GET /api/notes/[id]/versions/[versionId]`
- Fetch specific version content

### Search (`/api/search`)
- Full-text search across notes
- Query: `?q=searchTerm`
- Searches title + content
- Scoped to current user

### Categories (`/api/categories`)
- `GET`: List all categories with note counts
- `POST`: Create new category
- `PUT`: Update category name
- `DELETE?id=...`: Delete category (orphaned notes remain)

### Templates (`/api/templates`)
- `GET`: List all available templates
- `POST`: Create template
- `GET /[id]`: Fetch specific template
- `PUT/DELETE /[id]`: Update/remove template

### Utility Routes

#### `GET /api/health`
- Basic health check for deployment
- Returns: `{ status: "ok" }`

#### `GET/POST /api/export`
- Export all notes to JSON/Markdown/CSV
- Scoped to authenticated user

#### `POST /api/import`
- Import notes from file
- Triggers redaction + flashcard generation

---

## UI Components & Page Structure

### Component Architecture

**Base UI Components** (`src/components/ui/`):
- `button.tsx` - Reusable button with variants (primary, secondary, danger, ghost)
- `card.tsx` - Card container with header/body
- `input.tsx` - Form input with styling

**Layout Components** (`src/components/layout/`):
- Navigation component (sticky header)
- Sidebar or footer components (if present)

**Complex Components**:
- `editor/` - Rich text editor for note creation
- `forms/` - Form components (login, note creation, etc.)
- `notes/` - Note-specific components (list, detail view)

**Navigation Component** (`src/components/Navigation.tsx`):
- Sticky header with Obscurion branding
- Desktop nav links: Dashboard, Notes, Flashcards, Search
- Mobile hamburger menu
- User email display + logout button
- Active link highlighting via `usePathname()`
- Accessibility: ARIA labels, keyboard navigation

### Dashboard Pages

#### `/dashboard` (Main Dashboard)
- **Component**: `src/app/dashboard/page.tsx`
- **Type**: Server component with auth check
- **Features**:
  - Welcome message with user email
  - Statistics cards: Total Notes, Categories, Flashcards
  - Recent Notes list (last 5)
  - Quick action buttons (Create Note, View All, Search)
- **Data Fetching**: Server-side via Prisma
- **Auth**: Redirects to signin if not authenticated

#### `/dashboard/notes` (Notes List)
- **Component**: `src/app/dashboard/notes/page.tsx` + `client.tsx`
- **Features**:
  - Paginated table/grid view
  - Filters: Category, Type, Sort
  - Create new note button
  - Edit/delete actions

#### `/dashboard/notes/[id]` (Note Detail)
- **Component**: `src/app/dashboard/notes/[id]/page.tsx`
- **Features**:
  - Full note content display
  - Edit/delete controls
  - Version history sidebar
  - Flashcards associated with note
  - Category tags
  - Reading time display

#### `/dashboard/flashcards` (Flashcard Study)
- **Component**: `src/app/dashboard/flashcards/page.tsx` + `client.tsx`
- **Features**:
  - Flashcard browser (study mode)
  - Filter by difficulty
  - Mark as learned
  - Statistics per note

#### `/dashboard/search` (Global Search)
- **Component**: `src/app/dashboard/search/page.tsx` + `client.tsx`
- **Features**:
  - Full-text search input
  - Results list with highlighting
  - Filter by date, category
  - Jump to note detail

#### `/dashboard/versions` (Version History)
- **Component**: `src/app/dashboard/versions/page.tsx` + `client.tsx`
- **Features**:
  - Timeline of all note edits
  - Diff viewer for changes
  - Restore to previous version

### Authentication Pages

#### `/auth/signin` (Login)
- **Component**: `src/app/auth/signin/page.tsx`
- **Features**:
  - Email input
  - Password input
  - Remember me (optional)
  - Sign up link
  - Error messages

#### `/auth/signup` (Registration)
- **Component**: `src/app/auth/signup/page.tsx`
- **Features**:
  - Email input
  - Password input
  - Name input (optional)
  - Password confirmation
  - Sign in link

### Root Page
- `/` (Homepage)
  - Public landing page
  - "Sign In" / "Sign Up" CTAs
  - Feature overview

---

## File Organization

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Homepage
│   ├── api/                     # API routes (REST endpoints)
│   │   ├── auth/
│   │   │   ├── [...nextauth]/   # NextAuth handler
│   │   │   └── signup/          # Registration endpoint
│   │   ├── notes/               # Note CRUD
│   │   ├── flashcards/          # Flashcard endpoints
│   │   ├── categories/          # Category management
│   │   ├── search/              # Search endpoint
│   │   ├── export/              # Export endpoint
│   │   ├── import/              # Import endpoint
│   │   ├── templates/           # Template management
│   │   └── health/              # Health check
│   ├── auth/                    # Auth pages
│   │   ├── signin/page.tsx
│   │   └── signup/page.tsx
│   └── dashboard/               # Protected dashboard routes
│       ├── page.tsx             # Main dashboard
│       ├── notes/               # Notes management
│       ├── flashcards/          # Flashcard study
│       ├── search/              # Search UI
│       └── versions/            # Version history
│
├── components/                  # Reusable React components
│   ├── ui/                      # Atomic UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   ├── layout/                  # Layout components
│   ├── editor/                  # Rich text editor
│   ├── forms/                   # Form components
│   ├── notes/                   # Note-specific components
│   ├── Navigation.tsx           # Main navigation header
│   └── providers.tsx            # NextAuth provider wrapper
│
├── lib/                         # Utility functions & core logic
│   ├── auth.ts                  # NextAuth configuration
│   ├── db.ts                    # Prisma client singleton
│   ├── flashcard-generator.ts   # Flashcard extraction (271 LOC)
│   ├── redaction.ts             # Content redaction (emails, IPs, secrets)
│   ├── validation.ts            # Input validation (Zod-style)
│   ├── export.ts                # Export to JSON/CSV/Markdown
│   ├── import.ts                # Import from file
│   └── utils.ts                 # General utilities
│
├── hooks/                       # Custom React hooks (if any)
├── types/                       # TypeScript type definitions
│   └── next-auth.d.ts          # NextAuth augmentation
├── styles/                      # Global styles (if any)
└── prisma/
    └── schema.prisma            # Database schema definition
```

---

## Core Patterns & Utilities

### Redaction System (`src/lib/redaction.ts`)

Automatically removes sensitive data from note content:

**Patterns Removed**:
- Email addresses: `name@example.com`
- IP addresses: `192.168.1.1`, `2001:db8::1`
- API keys: `sk-...`, `token_...`
- Database connection strings
- Private keys and credentials
- Credit card numbers
- SSNs and sensitive IDs

**Implementation**: Regex-based pattern matching + replacement with placeholders

**Timing**: Applied on note creation and update (permanent, irreversible)

**Side Effect**: Stored content is already redacted

### Flashcard Generation (`src/lib/flashcard-generator.ts`, 271 LOC)

Extracts Q&A pairs from note content using pattern matching:

**Supported Patterns**:

1. **Q&A Format**:
   ```
   Q: What is X?
   A: X is Y
   ```

2. **List Format** (auto-generates questions):
   ```
   Key Learning Points:
   1. First concept
   2. Second concept
   ```

3. **Definition Format**:
   ```
   Term: Definition
   ```

4. **Section Extraction** (headers with bullets):
   ```
   ## Important Facts
   - Fact 1
   - Fact 2
   ```

**Difficulty Detection**:
- EASY: Short answers, simple vocabulary
- MEDIUM: Moderate length, technical terms
- HARD: Long answers, complex concepts

**Validation**:
- Question: 5-500 chars
- Answer: 10-5000 chars
- Removes duplicates

**Quantity**: Capped to avoid overwhelming flashcard decks

### Validation (`src/lib/validation.ts`)

Input sanitization and validation:

- `validateNoteTitle()` - 1-200 chars
- `validateNoteContent()` - 1MB max
- `validateNoteType()` - Enum check
- `validateCategoryIds()` - Max 20, valid IDs
- `validatePagination()` - Page/limit bounds
- `validateSort()` - Allowed fields only
- `isValidId()` - CUID format check

### Database Client (`src/lib/db.ts`)

Singleton Prisma client with development hot-reload:

```typescript
const globalForPrisma = global as { prisma: PrismaClient }
export const db = globalForPrisma.prisma || new PrismaClient()
if (NODE_ENV !== 'production') globalForPrisma.prisma = db
```

---

## Security Features

### Authentication
- **JWT tokens** with 30-day expiration
- **bcryptjs** password hashing (10 rounds)
- **HttpOnly cookies** to prevent XSS
- **CSRF protection** via NextAuth
- **Secure flag** in production

### Authorization
- **User-scoped queries**: All notes filtered by `authorEmail`
- **Ownership verification**: Check note author before edits
- **Session validation**: `getServerSession()` on protected routes

### Data Protection
- **Auto-redaction**: PII, credentials, secrets removed
- **Cascade deletes**: Orphaned records cleaned up
- **No plaintext storage**: Passwords hashed, sensitive data redacted

### API Security
- **NextAuth validation**: Credentials provider with bcrypt verify
- **Input validation**: Type checking, length limits, enum validation
- **Error messages**: Generic errors to prevent info leakage
- **Rate limiting**: (if implemented in middleware)

---

## Architecture Patterns

### Server Components + Client Components
- **Pages**: Server components for data fetching + auth checks
- **Interactivity**: Separate `page.tsx` + `client.tsx` pattern
- **Benefits**: SEO, security (hide credentials), performance

### API Layer Pattern
- **Authentication**: `getServerSession(authOptions)` on every route
- **Authorization**: Verify ownership/permissions before mutations
- **Validation**: Input validation before DB operations
- **Transactions**: Use `db.$transaction()` for atomic operations
- **Response Format**: Consistent JSON with error messages

### Data Fetching
- **Server-side**: Parallel `Promise.all()` for dashboard stats
- **Client-side**: `useSession()` for auth-dependent UI
- **Pagination**: Offset-based with limit/page params
- **Includes**: Prisma relations loaded efficiently

### State Management
- **NextAuth session**: Global auth state
- **URL params**: Pagination, filters via `searchParams`
- **Component state**: Local React state for UI toggles

### Type Safety
- **TypeScript strict mode**: All types must be explicit
- **Prisma types**: Auto-generated from schema
- **NextAuth augmentation**: Custom User/Session/JWT types
- **Zod validation**: (referenced but not fully integrated)

---

## Performance Optimizations

### Database
- **Indices**: Created on frequently queried fields (authorEmail, createdAt, noteId)
- **Selective includes**: Only load related data when needed
- **Pagination**: Limit query results (max 100 per page)
- **Parallel queries**: `Promise.all()` for dashboard stats

### Frontend
- **Image optimization**: (if using Next.js Image)
- **Code splitting**: Automatic per-route
- **CSS-in-JS**: Tailwind purges unused styles
- **Server rendering**: Reduce JS sent to client

### API
- **Compression**: Next.js built-in
- **Caching**: (potentially leverageable via headers)
- **Error handling**: Graceful failures with meaningful messages

---

## Known Limitations & Future Enhancements

### Current Gaps
- **No RBAC**: `role` field exists but not enforced
- **No audit logging**: Only version history on notes
- **No soft deletes**: Hard deletes cascade immediately
- **No rate limiting**: Unauthenticated endpoints vulnerable to abuse
- **No multi-tenancy**: Single-user focus
- **No API documentation**: Swagger/OpenAPI missing
- **Flashcard gamification**: No spaced repetition, streak tracking

### Recommended Enhancements for Admin/Compliance
1. **Admin Panel**:
   - User management (list, ban, modify roles)
   - System audit log (all actions)
   - Site statistics (active users, storage used)
   - Backup/export all data

2. **User Roles**:
   - Admin: Full access + system config
   - Moderator: Can view/moderate all notes
   - User: Own notes only (current)
   - Viewer: Read-only access

3. **Customization**:
   - Branding (logo, colors, site name)
   - Note templates per organization
   - Custom redaction rules
   - Flashcard difficulty presets

4. **Compliance**:
   - Data retention policies
   - GDPR data export/deletion
   - Audit trail with timestamps
   - IP whitelisting
   - API key management
   - SSO integration (OAuth, SAML)

---

## Development Commands

```bash
npm run dev              # Start dev server on port 3082
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint

npm run db:migrate       # Run Prisma migrations
npm run db:push          # Push schema to DB (dev only)
npm run db:seed          # Seed database
npm run db:studio         # Open Prisma Studio GUI
```

---

## Environment Variables

```env
DATABASE_URL="postgresql://user:pass@host:5432/obscurion"
NEXTAUTH_URL="https://example.com"
NEXTAUTH_SECRET="long-random-secret-change-in-production"
NODE_ENV="production|development"
```

---

## Deployment Architecture

- **Docker**: Standalone Next.js image, PostgreSQL container
- **Port**: 3082 (customizable via `-p` flag)
- **Health Check**: `GET /api/health` returns `{ status: "ok" }`
- **Database**: PostgreSQL with automatic migrations

---

## Summary

Obscurion is a **well-structured, type-safe** knowledge management system with:

✓ Clear separation of concerns (API, components, utils)
✓ Server components for security + SEO
✓ Comprehensive user auth with session management
✓ Automatic content redaction + flashcard generation
✓ Version control on all notes
✓ Role-based auth scaffolding (ready for RBAC)
✓ RESTful API with pagination & filtering
✓ Responsive UI with accessibility (ARIA, keyboard nav)

**Ready for**:
- Adding admin dashboard (user management, audit logs)
- Implementing full RBAC (admin, moderator, user tiers)
- Customization features (branding, templates, rules)
- Compliance tools (data export, retention policies)
- Enterprise features (SSO, API keys, webhooks)

