# Obscurion Architecture Diagram

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / Client                         │
├─────────────────────────────────────────────────────────────────┤
│ React Components (UI)                                            │
│ - Navigation, Dashboard, Notes, Flashcards, Search, Auth        │
│ - Tailwind CSS Styling                                          │
│ - NextAuth Session Management (useSession)                      │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTP/HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js 14 Server                             │
├─────────────────────────────────────────────────────────────────┤
│ App Router (src/app/)                                            │
│ ├─ Page Routes (Server Components + Client Components)          │
│ │  ├─ /dashboard/* (authenticated)                              │
│ │  ├─ /auth/signin, /auth/signup                                │
│ │  └─ / (homepage)                                              │
│ │                                                                │
│ ├─ API Routes (src/app/api/)                                    │
│ │  ├─ /auth/[...nextauth]     ← NextAuth handler               │
│ │  ├─ /auth/signup             ← User registration              │
│ │  ├─ /notes                   ← CRUD operations                │
│ │  ├─ /notes/[id]/flashcards   ← Flashcard management           │
│ │  ├─ /notes/[id]/versions     ← Version history                │
│ │  ├─ /categories              ← Category management            │
│ │  ├─ /search                  ← Full-text search               │
│ │  ├─ /export, /import         ← Data migration                 │
│ │  ├─ /templates               ← Template management            │
│ │  └─ /health                  ← Health check                   │
│                                                                   │
│ Middleware / Utilities (src/lib/)                                │
│ ├─ auth.ts           ← NextAuth config (JWT + bcrypt)           │
│ ├─ db.ts             ← Prisma client singleton                  │
│ ├─ flashcard-generator.ts ← Pattern matching (Q&A extraction)   │
│ ├─ redaction.ts      ← PII removal (emails, IPs, secrets)       │
│ ├─ validation.ts     ← Input validation                         │
│ ├─ export.ts         ← JSON/CSV/Markdown export                 │
│ └─ import.ts         ← File import + processing                 │
│                                                                   │
│ Components (src/components/)                                     │
│ ├─ ui/               ← Reusable UI (Button, Card, Input)        │
│ ├─ Navigation.tsx    ← Sticky header + nav links                │
│ ├─ layout/           ← Layout wrappers                          │
│ ├─ editor/           ← Rich text editor                         │
│ ├─ forms/            ← Form components                          │
│ └─ notes/            ← Note-specific components                 │
│                                                                   │
│ Session Management                                               │
│ └─ NextAuth (JWT)    ← 30-day tokens, httpOnly cookies         │
└────────────────────┬────────────────────────────────────────────┘
                     │ SQL/Prisma ORM
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                         │
├─────────────────────────────────────────────────────────────────┤
│ Tables:                                                          │
│ ├─ User                    ← Accounts (email, role, password)   │
│ ├─ Note                    ← Redacted content, reading time      │
│ ├─ Category                ← Global categories                  │
│ ├─ NoteCategory            ← Many-to-many junction             │
│ ├─ Flashcard               ← Q&A pairs (auto-generated)         │
│ ├─ NoteVersion             ← Audit trail, version history       │
│ └─ NoteTemplate            ← Boilerplate templates              │
│                                                                   │
│ Indices:                                                         │
│ ├─ User.email              ← Unique, for auth lookup            │
│ ├─ Note.authorEmail        ← For user-scoped queries            │
│ ├─ Note.createdAt          ← For sorting                        │
│ ├─ NoteCategory.noteId     ← For category lookups               │
│ ├─ Flashcard.noteId        ← For note flashcard lists           │
│ └─ NoteVersion.noteId      ← For version history                │
│                                                                   │
│ Cascade Deletes:                                                 │
│ ├─ Delete Note → Delete NoteCategory, Flashcard, NoteVersion   │
│ └─ Delete Category → Delete NoteCategory (notes remain)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Create Note Flow

```
User Input (Title, Content, Categories)
         ▼
POST /api/notes
         ▼
1. Auth Check (getServerSession)
         ▼
2. Validate Input
   - Title: 1-200 chars
   - Content: < 1MB
   - CategoryIds: max 20
         ▼
3. Apply Auto-Redaction
   - Remove emails, IPs, credentials
   - Stored content is irreversibly redacted
         ▼
4. Calculate Reading Time (200 WPM baseline)
         ▼
5. Generate Flashcards (Pattern Matching)
   - Q&A patterns: "Q: ... A: ..."
   - List patterns: "1. ... 2. ..."
   - Definition patterns: "Term: Definition"
   - Section extraction: Headers + bullets
   - Difficulty detection: EASY, MEDIUM, HARD
         ▼
6. DB Transaction Start
   - Create Note (redacted content)
   - Create NoteCategory associations
   - Create Flashcard records
   - Create NoteVersion entry
   - DB Transaction Commit
         ▼
7. Return Created Note (201 Created)
   - Includes flashcardCount, categories
```

### Update Note Flow

```
User Input (Title, Content, Categories)
         ▼
PUT /api/notes
         ▼
1. Auth Check + Authorization
   - Verify user owns the note
         ▼
2. Validate & Re-Apply Redaction
   - If content changed: redact again
   - Recalculate reading time
         ▼
3. DB Transaction Start
   - Update Note fields
   - Replace NoteCategory associations
   - Create NoteVersion entry
   - DB Transaction Commit
         ▼
4. Return Updated Note
   - NOTE: Does NOT regenerate flashcards
     (Use POST /api/notes/[id]/flashcards/generate for that)
```

### Authentication Flow

```
Email + Password Input
         ▼
POST /api/auth/signin (NextAuth)
         ▼
1. Find User by Email
         ▼
2. Compare Password (bcrypt)
         ▼
3. Password Match?
   - YES: Generate JWT token
   - NO: Return null (auth failed)
         ▼
4. Create Session
   - Token: {id, email, role}
   - Cookie: httpOnly, sameSite=lax, secure in prod
   - MaxAge: 30 days
         ▼
5. Set Cookie + Redirect to /dashboard
```

---

## Component Hierarchy

### Dashboard Layout

```
Layout (SessionProvider)
├─ Navigation (Sticky Header)
│  ├─ Logo + Brand
│  ├─ Nav Links (Desktop)
│  │  ├─ Dashboard
│  │  ├─ Notes
│  │  ├─ Flashcards
│  │  └─ Search
│  ├─ Mobile Hamburger Menu
│  └─ User Email + Logout
│
└─ Page (Server Component)
   └─ Client Components (as needed)
      ├─ Stats Cards
      ├─ Recent Notes List
      └─ Quick Action Buttons
```

### Notes Management

```
Notes Page (Server)
└─ NotesClient (Client)
   ├─ Search / Filter Bar
   ├─ Notes Table/Grid
   │  ├─ Note Row
   │  │  ├─ Title
   │  │  ├─ Categories
   │  │  ├─ Reading Time
   │  │  ├─ Last Updated
   │  │  └─ Actions (Edit, Delete)
   │  └─ Pagination Controls
   └─ Create Note Button
      └─ Form Modal
         ├─ Title Input
         ├─ Content Editor
         ├─ Category Selector
         └─ Submit Button
```

---

## Security Architecture

```
┌─ Request ────────────────────────────────────────┐
│                                                   │
├─ NextAuth Middleware                             │
│  └─ Verify JWT Token                             │
│     └─ If invalid/expired: Redirect to signin    │
│                                                   │
├─ getServerSession() in API Routes                │
│  └─ Extract user from JWT                        │
│     └─ If null: Return 401 Unauthorized          │
│                                                   │
├─ Authorization Check                             │
│  └─ Verify user.email matches resource owner    │
│     └─ If mismatch: Return 403 Forbidden         │
│                                                   │
├─ Input Validation                                │
│  └─ Type, length, enum checks                   │
│     └─ If invalid: Return 400 Bad Request        │
│                                                   │
├─ Sensitive Data Protection                       │
│  ├─ Auto-Redaction (emails, IPs, secrets)       │
│  ├─ Bcrypt password hashing (10 rounds)         │
│  └─ HttpOnly cookies (XSS protection)           │
│                                                   │
├─ DB Cascade Deletes                              │
│  └─ Orphaned records cleaned automatically       │
│                                                   │
└─ CSRF Protection                                 │
   └─ NextAuth manages CSRF tokens                 │
```

---

## Role-Based Access Control (RBAC) - Ready to Implement

```
Current State:
└─ role field exists in User model
   └─ Defaults to "user"
   └─ Populated in JWT token
   └─ Propagated to session

Missing Enforcement:
├─ No role checks in API endpoints
├─ No admin panel
└─ No fine-grained permissions

Recommended Implementation:
┌─ Role Definitions
│  ├─ admin      ← Full access, system config, user management
│  ├─ moderator  ← Can view/moderate all notes
│  ├─ user       ← Own notes only (current behavior)
│  └─ viewer     ← Read-only access to shared notes
│
├─ Route Protection
│  ├─ /dashboard/admin/*     ← Requires role: admin
│  ├─ /api/admin/*           ← Requires role: admin
│  ├─ /api/users/[id]        ← Requires ownership or admin
│  └─ /api/notes/[id]        ← Requires ownership or moderator+
│
├─ Middleware Pattern
│  ├─ requireRole('admin')
│  ├─ requireRole('moderator')
│  ├─ requireOwnership()
│  └─ requirePermission(action, resource)
│
└─ Database Audit
   ├─ Action log: user, action, resource, timestamp
   ├─ Role change log
   └─ Query all by session role
```

---

## Data Model Relationships

```
User (1) ──────── (N) Note
 |                   |
 |                   ├─── (N) NoteCategory
 |                   |        |
 |                   |        └─── (1) Category
 |                   |
 |                   ├─── (N) Flashcard
 |                   |
 |                   └─── (N) NoteVersion
 |
 └───────────────────────────────────── (N) NoteVersion


Unique Constraints:
- User.email           ← Unique
- Category.name        ← Unique
- NoteCategory         ← Unique(noteId, categoryId)
- NoteTemplate.name    ← Unique
```

---

## API Endpoint Matrix

```
METHOD  PATH                                    AUTH  OWNER  RESPONSE
────────────────────────────────────────────────────────────────────────
GET     /api/notes                              ✓     ✓      List with pagination
POST    /api/notes                              ✓     -      Create (201)
PUT     /api/notes                              ✓     ✓      Update
DELETE  /api/notes?id=...                       ✓     ✓      Success

GET     /api/notes/[id]/flashcards              ✓     ✓      Flashcard list
POST    /api/notes/[id]/flashcards              ✓     ✓      Create flashcard
POST    /api/notes/[id]/flashcards/generate     ✓     ✓      Regenerate all
PUT     /api/notes/[id]/flashcards/[cardId]     ✓     ✓      Update
DELETE  /api/notes/[id]/flashcards/[cardId]     ✓     ✓      Delete

GET     /api/notes/[id]/versions                ✓     ✓      Version list
GET     /api/notes/[id]/versions/[versionId]    ✓     ✓      Version detail

GET     /api/categories                         ✓     -      All categories
POST    /api/categories                         ✓     -      Create
PUT     /api/categories/[id]                    ✓     -      Update
DELETE  /api/categories/[id]                    ✓     -      Delete

GET     /api/search?q=...                       ✓     ✓      Search results

POST    /api/export                             ✓     ✓      JSON/CSV data
POST    /api/import                             ✓     -      Import notes

GET     /api/templates                          ✓     -      List templates
POST    /api/templates                          ✓     -      Create
GET     /api/templates/[id]                     ✓     -      Detail
PUT     /api/templates/[id]                     ✓     -      Update
DELETE  /api/templates/[id]                     ✓     -      Delete

POST    /api/auth/signin                        -     -      JWT token
POST    /api/auth/signup                        -     -      User created
GET     /api/auth/[...nextauth]                 -     -      NextAuth

GET     /api/health                             -     -      { status: "ok" }

Legend:
  AUTH  = Requires authenticated session
  OWNER = Must own the resource (e.g., note author)
  ✓     = Required
  -     = Not required
```

---

## Technology Decision Matrix

### Why Next.js 14?
- Server components for security + SEO
- File-based routing (intuitive)
- Built-in API routes (no separate backend)
- Image optimization (if used)
- Fast refresh during development

### Why PostgreSQL?
- Relational schema (clear relationships)
- ACID transactions (data integrity)
- JSONB support (flexible data)
- Full-text search (future enhancement)
- Mature ecosystem

### Why Prisma?
- Type-safe ORM (auto-generated types)
- Schema-first approach (source of truth)
- Migration system (versioned changes)
- Query optimization (less boilerplate)
- IDE autocomplete

### Why NextAuth?
- OAuth-ready (future: Google, GitHub, SAML)
- JWT-based sessions (stateless)
- Built-in providers (Credentials for now)
- CSRF protection
- TypeScript support

### Why Tailwind CSS?
- Utility-first (fast prototyping)
- Small bundle size (purges unused)
- Dark mode support (built-in)
- Mobile-first responsive design
- Great ecosystem (plugins, UI kits)

### Why bcryptjs?
- Pure JavaScript (no native bindings)
- Configurable salt rounds (10 for security)
- Standard algorithm
- No security vulnerabilities

---

## Scalability Considerations

### Current Capacity
- Single PostgreSQL instance
- In-memory Prisma client
- No caching layer
- No CDN (CSS/JS served by Next.js)

### Scaling Path

**Phase 1: Optimize Current Setup**
- Database indices ✓ (already in place)
- Query optimization (N+1 problem checking)
- Response caching (HTTP headers)
- Compression (gzip, brotli)

**Phase 2: Horizontal Scaling**
- Load balancer (nginx, Vercel, AWS ALB)
- Separate read replicas (PostgreSQL)
- Session store (Redis, external)
- API gateway (rate limiting, auth)

**Phase 3: Microservices** (if needed)
- Flashcard generation service (async job queue)
- Search service (Elasticsearch)
- File upload service (S3, MinIO)
- Notification service (email, webhook)

---

## Deployment Checklist

```
Code:
☐ Environment variables set (NEXTAUTH_SECRET, DATABASE_URL)
☐ NEXTAUTH_URL matches production domain
☐ NODE_ENV=production
☐ All secrets removed from code
☐ TypeScript builds without errors
☐ ESLint passes

Database:
☐ PostgreSQL running and accessible
☐ DATABASE_URL environment variable set
☐ Prisma migrations applied (npm run db:migrate)
☐ Database backups configured
☐ Connection pooling enabled (if using PgBouncer)

Security:
☐ HTTPS enforced
☐ CORS configured (if needed)
☐ Rate limiting on signup/signin
☐ CSRF tokens enabled (NextAuth)
☐ HttpOnly cookies enforced
☐ Password requirements documented

Monitoring:
☐ Error tracking (Sentry, DataDog)
☐ Performance monitoring (APM)
☐ Uptime monitoring (/api/health)
☐ Log aggregation configured
☐ Alerts set for critical errors

Docker:
☐ Dockerfile uses production image
☐ Health check configured
☐ Volume mounts for persistent data
☐ Network security (only required ports exposed)
☐ Resource limits set (CPU, memory)
```

