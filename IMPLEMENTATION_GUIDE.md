# Obscurion Implementation Guide: From Current to Production

## Current State (What We Have)
✅ User authentication (NextAuth)
✅ Note CRUD operations
✅ Flashcard generation and management
✅ Version history (read-only)
✅ Search functionality
✅ Export/import
✅ Navigation and basic UI

## What's Missing (What We're Building)

### CRITICAL - Start Here (Week 1-2)

#### Step 1: Database Schema Update
**Why**: Everything depends on this
**Time**: 2-3 hours
**Files to modify**:
1. `prisma/schema.prisma` - Add all new models
2. Run migrations

```bash
# In /home/metrik/docker/Obscurion:
npx prisma migrate dev --name add_admin_system
```

#### Step 2: Admin Authentication Layer
**Why**: Protects all admin functionality
**Time**: 3-4 hours
**Files to create**:
1. `src/lib/auth-admin.ts` - Admin check utility
2. `src/middleware.ts` - Admin route protection

#### Step 3: TOS & Privacy Pages (Compliance)
**Why**: Legal requirement before monetization
**Time**: 4-5 hours
**Files to create**:
1. `src/app/tos/page.tsx` - Terms of Service
2. `src/app/privacy/page.tsx` - Privacy Policy
3. `src/app/auth/signup/page.tsx` - Add TOS checkbox
4. `src/app/api/auth/signup/route.ts` - Validate acceptance

#### Step 4: Basic Admin Dashboard
**Why**: Control your users
**Time**: 6-8 hours
**Files to create**:
1. `src/app/admin/layout.tsx` - Admin layout
2. `src/app/admin/page.tsx` - Dashboard home
3. `src/app/admin/users/page.tsx` - User list
4. `src/app/api/admin/users/route.ts` - User API

---

### HIGH PRIORITY - Week 2-3

#### Step 5: User Management APIs
**Why**: Admin needs to control users
**Time**: 6-8 hours
**Files to create**:
1. `src/app/api/admin/users/[id]/role/route.ts`
2. `src/app/api/admin/users/[id]/suspend/route.ts`
3. `src/app/api/admin/users/[id]/delete/route.ts`
4. `src/lib/audit.ts` - Audit logging

#### Step 6: User Settings Pages
**Why**: Users customize their experience
**Time**: 8-10 hours
**Files to create**:
1. `src/app/dashboard/settings/page.tsx` - Settings home
2. `src/app/dashboard/settings/profile/page.tsx` - Profile editing
3. `src/app/dashboard/settings/privacy/page.tsx` - Privacy controls
4. `src/app/api/users/preferences/route.ts` - Save preferences

#### Step 7: Data Deletion Request (GDPR)
**Why**: Legal compliance
**Time**: 6-8 hours
**Files to create**:
1. `src/app/dashboard/settings/account/delete/page.tsx` - Request deletion
2. `src/app/api/auth/request-deletion/route.ts` - Handle request
3. `src/lib/deletion-job.ts` - Background job

---

### MEDIUM PRIORITY - Week 3-4

#### Step 8: Category Management
**Why**: Users need to organize notes
**Time**: 4-6 hours
**Files to create**:
1. `src/app/dashboard/categories/page.tsx` - Category list
2. `src/app/api/categories/route.ts` - CRUD endpoints
3. Update note creation form to include categories

#### Step 9: Theme Customization
**Why**: Make app feel personal
**Time**: 8-10 hours
**Files to create**:
1. `src/app/dashboard/settings/theme/page.tsx` - Theme builder
2. `src/components/ThemeProvider.tsx` - Apply theme
3. `src/app/api/users/theme/route.ts` - Save theme

#### Step 10: Dashboard Layout Builder
**Why**: Users control their dashboard
**Time**: 10-12 hours
**Files to create**:
1. `src/components/DashboardBuilder.tsx` - Drag-drop builder
2. `src/app/dashboard/customize/page.tsx` - Layout editor
3. `src/app/api/users/dashboard/route.ts` - Save layout

#### Step 11: Version Restoration
**Why**: Users can undo changes
**Time**: 6-8 hours
**Modify**:
1. `src/app/dashboard/versions/page.tsx` - Add restore button
2. Create `src/app/api/notes/[id]/versions/[versionId]/restore/route.ts`

---

### NICE TO HAVE - Week 4+

#### Step 12: Rate Limiting & CAPTCHA
**Why**: Protect against brute force
**Time**: 6-8 hours
**Files to create**:
1. `src/lib/rate-limit.ts` - Rate limit middleware
2. Modify login/signup pages with CAPTCHA

#### Step 13: Audit Logs Dashboard
**Why**: See what's happening
**Time**: 4-6 hours
**Files to create**:
1. `src/app/admin/audit-logs/page.tsx`
2. `src/app/api/admin/audit-logs/route.ts`

---

## Recommended Implementation Order

```
Week 1:
  Day 1-2: Schema update, migrations, audit logging setup
  Day 3-4: Admin auth layer, TOS/Privacy pages
  Day 5: Basic admin dashboard

Week 2:
  Day 1-2: User management APIs
  Day 3-4: Settings pages (profile, privacy)
  Day 5: Data deletion request flow

Week 3:
  Day 1-2: Category management
  Day 3-4: Theme customization
  Day 5: Dashboard layout builder

Week 4:
  Day 1-2: Version restoration
  Day 3-4: Rate limiting/CAPTCHA
  Day 5: Testing & polish

Week 5+:
  Audit logs, API keys, webhooks, advanced features
```

---

## Implementation Checklist

### Schema & Database
- [ ] Add UserRole enum
- [ ] Update User model with new fields
- [ ] Create UserPreferences model
- [ ] Create DashboardLayout model
- [ ] Create ThemeSettings model
- [ ] Create AuditLog model
- [ ] Create ComplianceLog model
- [ ] Run migration: `npx prisma migrate dev`
- [ ] Test database connection
- [ ] Backup existing data

### Admin System
- [ ] Create admin auth utility (`src/lib/auth-admin.ts`)
- [ ] Create admin layout (`src/app/admin/layout.tsx`)
- [ ] Create admin dashboard page (`src/app/admin/page.tsx`)
- [ ] Create user list page (`src/app/admin/users/page.tsx`)
- [ ] Create user detail page (`src/app/admin/users/[id]/page.tsx`)
- [ ] Create user role API (`src/app/api/admin/users/[id]/role/route.ts`)
- [ ] Create user suspend API (`src/app/api/admin/users/[id]/suspend/route.ts`)
- [ ] Create audit logging utility (`src/lib/audit.ts`)
- [ ] Test admin access restrictions
- [ ] Test audit logging on all admin actions

### Legal Compliance
- [ ] Create TOS page (`src/app/tos/page.tsx`)
- [ ] Create Privacy page (`src/app/privacy/page.tsx`)
- [ ] Update signup to require TOS acceptance
- [ ] Save TOS acceptance timestamp
- [ ] Create data deletion page
- [ ] Create data deletion API
- [ ] Create background job for deletion
- [ ] Test 30-day deletion grace period

### User Features
- [ ] Create settings layout
- [ ] Create profile settings page
- [ ] Create privacy settings page
- [ ] Create theme settings page
- [ ] Create dashboard customizer
- [ ] Create preferences API
- [ ] Create theme API
- [ ] Create dashboard layout API
- [ ] Test preference persistence
- [ ] Test theme application

### Enhanced Core Features
- [ ] Add category CRUD APIs
- [ ] Update note form with category selector
- [ ] Create version comparison view
- [ ] Create version restore API
- [ ] Test version restoration
- [ ] Update version history UI

### Security
- [ ] Implement rate limiting
- [ ] Add CAPTCHA to login/signup
- [ ] Add rate limit tests
- [ ] Add CAPTCHA tests
- [ ] Security audit

### Testing
- [ ] Unit tests for auth utils
- [ ] Integration tests for admin APIs
- [ ] End-to-end tests for user flows
- [ ] Admin access control tests
- [ ] Data deletion tests
- [ ] Performance tests

### Deployment
- [ ] Update docker-compose.yml if needed
- [ ] Run migrations in production
- [ ] Backup production data
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor for errors

---

## Key Implementation Tips

### 1. Start Small
Don't try to do everything at once. Ship the basic admin dashboard first.

### 2. Protect Admin Routes
Every admin page/API must check:
```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.email || !await requireAdmin(session.user.email)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

### 3. Log Everything
Use audit logging for every admin action:
```typescript
await logAudit(
  session.user.email,
  'user_suspended',
  'user',
  userId,
  { reason: 'spam' },
  req
);
```

### 4. Validate Input
Always validate and sanitize user input:
```typescript
const schema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MODERATOR', 'VIP', 'USER']),
});
const { email, role } = schema.parse(body);
```

### 5. Handle Errors Gracefully
Return meaningful error messages:
```typescript
try {
  // operation
} catch (err) {
  console.error('Error:', err);
  return NextResponse.json(
    { error: 'Failed to update user' },
    { status: 500 }
  );
}
```

### 6. Test Everything
Before deploying:
- Test as regular user (should not see admin pages)
- Test as admin (should see everything)
- Test data deletion flow
- Test theme changes
- Test version restoration

### 7. Database Migrations
Always backup before migrating:
```bash
# Backup
docker-compose exec obscurion-v2-postgres pg_dump -U obscurion -d obscurion > backup.sql

# Migrate
npx prisma migrate dev

# Verify
npx prisma studio # Browse database
```

---

## File Structure After Implementation

```
src/
├── app/
│   ├── admin/                          # NEW
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── audit-logs/
│   │   │   └── page.tsx
│   │   └── compliance/
│   │       └── page.tsx
│   ├── tos/                            # NEW
│   │   └── page.tsx
│   ├── privacy/                        # NEW
│   │   └── page.tsx
│   ├── auth/
│   │   ├── signup/                     # MODIFIED
│   │   └── signin/
│   ├── dashboard/
│   │   ├── settings/                   # NEW
│   │   │   ├── page.tsx
│   │   │   ├── profile/
│   │   │   ├── privacy/
│   │   │   ├── theme/
│   │   │   ├── api/
│   │   │   ├── data/
│   │   │   └── account/
│   │   │       └── delete/
│   │   ├── categories/                 # NEW
│   │   │   └── page.tsx
│   │   ├── customize/                  # NEW
│   │   │   └── page.tsx
│   │   └── versions/                   # ENHANCED
│   │       └── page.tsx
│   ├── api/
│   │   ├── admin/                      # NEW
│   │   │   ├── users/
│   │   │   ├── audit-logs/
│   │   │   └── compliance/
│   │   ├── auth/                       # MODIFIED
│   │   │   ├── request-deletion/
│   │   │   └── signup/
│   │   ├── users/                      # NEW
│   │   │   ├── preferences/
│   │   │   ├── theme/
│   │   │   └── dashboard/
│   │   ├── categories/                 # NEW
│   │   └── notes/
│   │       └── [id]/
│   │           └── versions/
│   │               └── [versionId]/
│   │                   └── restore/    # NEW
│   └── middleware.ts                   # NEW
├── lib/
│   ├── auth-admin.ts                   # NEW
│   ├── audit.ts                        # NEW
│   ├── deletion-job.ts                 # NEW
│   ├── rate-limit.ts                   # NEW
│   └── auth.ts                         # MODIFIED
└── components/
    ├── DashboardBuilder.tsx             # NEW
    ├── ThemeProvider.tsx                # NEW
    ├── VersionComparison.tsx            # NEW
    └── admin/                           # NEW
        ├── UserTable.tsx
        ├── AuditLog.tsx
        └── StatsCard.tsx
```

---

## Questions to Ask Before Starting Each Phase

**Before Phase 1**: Do you have database backup? Is Prisma Studio working?

**Before Phase 2**: What specific terms do you want in TOS? Any legal counsel?

**Before Phase 3**: What theme options matter most to users? Dark mode first?

**Before Phase 4**: Do users need categories? Should they be hierarchical?

**Before Phase 5**: Which security feature is most important? Rate limiting first?

---

## Post-Implementation

After each phase, measure:
- User adoption (do they use the feature?)
- Support tickets (does it cause confusion?)
- Performance impact (does it slow things down?)
- Security (any vulnerabilities?)
- Bug reports (what breaks?)

Use this data to inform the next phase.

