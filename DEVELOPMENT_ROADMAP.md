# Obscurion Development Roadmap

## Project Vision
Transform Obscurion from a feature-rich note-taking app into a **production-grade SaaS platform** with:
- Enterprise-grade admin controls and user management
- Legal compliance (TOS, User Agreement, GDPR-ready)
- Extensive user customization and personalization
- Robust security and bot protection
- Advanced features for power users

---

## Phase 1: Admin System & User Roles (Priority: CRITICAL)

### 1.1 Database Schema Updates
**File**: `prisma/schema.prisma`

```prisma
// Add Role enum
enum UserRole {
  ADMIN
  MODERATOR
  VIP
  USER
}

// Update User model
model User {
  // ... existing fields ...
  role UserRole @default(USER)
  isActive Boolean @default(true)
  isSuspended Boolean @default(false)
  suspendedReason String?
  suspendedAt DateTime?
  lastLogin DateTime?
  loginAttempts Int @default(0)
  lastLoginAttempt DateTime?

  // Admin relations
  createdByAdmin String?
  adminNotes String? // Admin-only notes about user

  // Preferences
  userPreferences UserPreferences?
  dashboardLayout DashboardLayout?
  themeSettings ThemeSettings?

  // Compliance
  dataDeleteRequested Boolean @default(false)
  dataDeleteRequestedAt DateTime?
  tosAccepted Boolean @default(false)
  tosAcceptedAt DateTime?
  agreedToTerms Boolean @default(false)
  agreedToTermsAt DateTime?
}

model UserPreferences {
  id String @id @default(cuid())
  userId String @unique
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Profile
  displayName String?
  bio String?
  avatarUrl String?
  website String?
  isProfilePublic Boolean @default(false)

  // Privacy
  makeNotesPrivate Boolean @default(true)
  allowPublicSharing Boolean @default(false)
  showInPublicDirectory Boolean @default(false)

  // Notifications
  emailNotifications Boolean @default(true)
  activityDigest Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model DashboardLayout {
  id String @id @default(cuid())
  userId String @unique
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  // JSON config for drag-and-drop layout
  layout Json @default("{\"sections\": []}")
  // Example: { "sections": [{ "id": "notes", "position": 0, "hidden": false }, ...] }

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ThemeSettings {
  id String @id @default(cuid())
  userId String @unique
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Colors
  primaryColor String @default("#3b82f6")
  secondaryColor String @default("#1f2937")
  accentColor String @default("#10b981")
  backgroundColor String @default("#f9fafb")
  textColor String @default("#111827")

  // Typography
  fontSize Int @default(16) // px
  fontFamily String @default("system-ui")
  lineHeight Float @default(1.5)

  // Theme
  darkMode Boolean @default(false)
  customCSS String? // Custom CSS for power users

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AuditLog {
  id String @id @default(cuid())
  userId String
  action String // "user_created", "user_suspended", "note_deleted", etc.
  resourceType String // "user", "note", "category", etc.
  resourceId String
  details Json? // Additional context
  ipAddress String?
  userAgent String?

  createdAt DateTime @default(now())

  @@index([userId, createdAt])
  @@index([action, createdAt])
}

model ComplianceLog {
  id String @id @default(cuid())
  userId String?
  action String // "tos_accepted", "data_delete_requested", "profile_exported"
  ipAddress String?
  userAgent String?
  details Json?

  createdAt DateTime @default(now())

  @@index([action, createdAt])
}
```

### 1.2 Admin Dashboard Pages

**File**: `src/app/admin/page.tsx`
```typescript
// Main admin dashboard
- User management table (search, filter, sort)
- System stats (total users, active users, storage used)
- Recent audit logs
- Pending actions (data deletions, suspensions)
```

**File**: `src/app/admin/users/page.tsx`
- List all users with columns: email, role, status, joined date, last login
- Bulk actions: suspend, promote, demote, delete
- User search and filtering
- User detail view modal

**File**: `src/app/admin/users/[id]/page.tsx`
- View user profile
- Change user role (ADMIN, MODERATOR, VIP, USER)
- Suspend/unsuspend user
- View user's data (notes, categories, flashcards)
- Delete user and all associated data
- Edit user's content
- View audit logs for this user

**File**: `src/app/admin/audit-logs/page.tsx`
- View all system audit logs
- Filter by action, user, date range
- Export audit logs

**File**: `src/app/admin/compliance/page.tsx`
- Data deletion requests (pending, approved, completed)
- TOS acceptance tracking
- User agreement acceptance tracking
- GDPR export requests

### 1.3 API Endpoints for Admin

```typescript
// User Management
POST /api/admin/users/:userId/role - Change user role
POST /api/admin/users/:userId/suspend - Suspend user
POST /api/admin/users/:userId/unsuspend - Unsuspend user
DELETE /api/admin/users/:userId - Delete user
GET /api/admin/users - List all users (with pagination)
GET /api/admin/users/:userId - Get user details
PUT /api/admin/users/:userId - Edit user info

// Data Management
DELETE /api/admin/users/:userId/data - Delete all user data
PUT /api/admin/notes/:noteId - Edit note as admin
DELETE /api/admin/notes/:noteId - Delete note as admin
GET /api/admin/users/:userId/data - Export user data

// Audit Logs
GET /api/admin/audit-logs - Get audit logs
GET /api/admin/compliance-logs - Get compliance logs

// System
GET /api/admin/stats - System statistics
```

### 1.4 Access Control Middleware

**File**: `src/lib/auth-admin.ts`
```typescript
// Utility to check if user is admin
export async function requireAdmin(email: string): Promise<boolean> {
  // Only allow metrik@metrikcorp.com and admins in database
  const allowedAdmins = ['metrik@metrikcorp.com'];
  return allowedAdmins.includes(email);
}

// Middleware for API routes
export function adminProtected(handler: NextApiHandler) {
  return async (req, res) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !await requireAdmin(session.user.email)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return handler(req, res);
  };
}
```

### 1.5 Audit Logging

**File**: `src/lib/audit.ts`
```typescript
export async function logAudit(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, any>,
  req?: NextRequest
) {
  // Log to database
  await db.auditLog.create({
    data: {
      userId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: req?.headers.get('x-forwarded-for'),
      userAgent: req?.headers.get('user-agent'),
    },
  });
}
```

---

## Phase 2: Legal Compliance (Priority: HIGH)

### 2.1 TOS Page

**File**: `src/app/tos/page.tsx`
```typescript
// Static page with comprehensive Terms of Service
// Key sections:
// - Service description
// - User rights and responsibilities
// - Intellectual property (Obscurion retains all rights to user data)
// - Content policies
// - Limitation of liability
// - Data retention and deletion policies
// - Modification rights
// - Termination
// - Dispute resolution
```

### 2.2 Privacy Policy

**File**: `src/app/privacy/page.tsx`
```typescript
// Privacy policy covering:
// - Data collection
// - Data usage
// - Data retention
// - GDPR compliance
// - User rights
// - Contact information
```

### 2.3 User Agreement & TOS Acceptance

**File**: `src/app/auth/signup/page.tsx` (modify)
```typescript
// Add checkboxes:
// - I agree to the Terms of Service
// - I agree to the Privacy Policy
// - I understand Obscurion retains rights to all data
//
// Save acceptance to database with timestamp
```

**File**: `src/app/api/auth/signup/route.ts` (modify)
```typescript
// Validate TOS acceptance before creating account
// Store tosAccepted and tosAcceptedAt in User model
// Log compliance event
```

### 2.4 Data Deletion Request

**File**: `src/app/dashboard/settings/account/delete/page.tsx`
```typescript
// GDPR-compliant account deletion flow:
// 1. User initiates deletion request
// 2. Confirmation email sent
// 3. 30-day grace period
// 4. Account marked for deletion
// 5. Automatic deletion after 30 days
// 6. Audit log entry
```

**File**: `src/app/api/auth/request-deletion/route.ts`
```typescript
// POST /api/auth/request-deletion
// - Require password confirmation
// - Send confirmation email with cancellation link
// - Set dataDeleteRequested = true
// - Schedule deletion job (30 days)
```

**File**: `src/lib/deletion-job.ts`
```typescript
// Background job to handle account deletions
// - Find users with dataDeleteRequested = true
// - Check if 30 days have passed
// - Delete all user data
// - Delete user account
// - Log deletion
```

---

## Phase 3: User Customization (Priority: HIGH)

### 3.1 User Settings Page

**File**: `src/app/dashboard/settings/profile/page.tsx`
```typescript
// User profile customization:
// - Display name
// - Bio
// - Avatar upload
// - Website/social links
// - Public/private profile toggle
```

### 3.2 Privacy Settings

**File**: `src/app/dashboard/settings/privacy/page.tsx`
```typescript
// Privacy controls:
// - Make all notes private by default
// - Allow/disallow public sharing
// - Show/hide in public directory
// - Control who can access profile
// - Manage shared notes/collaborators
```

### 3.3 Dashboard Layout Customization

**File**: `src/components/dashboard/DragDropBuilder.tsx`
```typescript
// Drag-and-drop dashboard section builder
// Users can:
// - Hide/show sections (Notes, Flashcards, Templates, etc.)
// - Reorder sections
// - Customize section sizes
// - Save layout preference
//
// Store in DashboardLayout model as JSON
```

### 3.4 Theme Customization

**File**: `src/app/dashboard/settings/theme/page.tsx`
```typescript
// Theme builder:
// - Color picker for primary, secondary, accent colors
// - Background and text color customization
// - Dark mode toggle
// - Font size slider
// - Font family selector
// - Line height adjustment
// - Custom CSS editor (for power users)
//
// Apply theme via CSS variables:
// :root {
//   --primary-color: #3b82f6;
//   --font-size: 16px;
//   ...
// }
```

**File**: `src/app/layout.tsx` (modify)
```typescript
// Load user's theme settings on load
// Apply CSS variables
// Allow real-time theme switching
```

---

## Phase 4: Enhanced Core Features (Priority: MEDIUM)

### 4.1 Category Management

**File**: `src/app/dashboard/categories/page.tsx`
```typescript
// CRUD interface for categories:
// - Create new category
// - Edit category name/description
// - Delete category
// - Assign colors to categories
// - View notes in category
```

**File**: `src/app/api/categories/route.ts` (modify)
```typescript
// Add POST /api/categories (create)
// Add PUT /api/categories/:id (update)
// Add DELETE /api/categories/:id (delete)
```

### 4.2 Version History Restoration

**File**: `src/app/dashboard/versions/page.tsx` (enhance)
```typescript
// Add restoration functionality:
// - View all versions in timeline
// - Compare versions (side-by-side diff)
// - Restore to any previous version
// - Add version annotations/notes
// - Delete specific versions
//
// Confirmation required before restore:
// "Are you sure? Current version will be saved as new entry."
```

**File**: `src/app/api/notes/:id/versions/:versionId/restore/route.ts`
```typescript
// POST /api/notes/:id/versions/:versionId/restore
// - Load version data
// - Save current as new version
// - Update note to version content
// - Log audit entry
```

### 4.3 Version Comparison

**File**: `src/components/VersionComparison.tsx`
```typescript
// Side-by-side diff viewer
// - Highlight changes
// - Show character count changes
// - Show word count changes
// - Metadata comparison (title, type, etc.)
```

---

## Phase 5: Advanced Security & Bot Protection (Priority: MEDIUM)

### 5.1 Login/Signup Rate Limiting

**File**: `src/lib/rate-limit.ts`
```typescript
// Implement Redis-based rate limiting:
// - 5 failed login attempts = 15 minute lockout
// - 10 signup attempts per hour per IP
// - Progressive backoff
// - CAPTCHA after 3 failed attempts
// - Log suspicious activity
```

### 5.2 CAPTCHA Integration

**File**: `src/app/auth/signin/page.tsx` (modify)
```typescript
// Integrate hCaptcha or reCAPTCHA v3:
// - Show CAPTCHA after failed login attempts
// - Verify CAPTCHA token on submission
// - Log CAPTCHA validation results
```

### 5.3 Session Management

**File**: `src/lib/auth.ts` (enhance)
```typescript
// Enhanced security:
// - Device fingerprinting
// - Concurrent session limits
// - Session timeout (30 min idle)
// - IP change detection
// - Email notification on new login
```

### 5.4 Suspicious Activity Detection

**File**: `src/lib/security.ts`
```typescript
// Monitor for:
// - Unusual login locations (geo-IP)
// - Rapid data exports
// - Mass note deletions
// - API key usage patterns
// - Trigger alerts/require verification
```

---

## Phase 6: Advanced Features (Priority: LOW)

### 6.1 API Keys for Power Users

**File**: `src/app/dashboard/settings/api/page.tsx`
```typescript
// User API key management:
// - Generate/revoke API keys
// - Scope management (read, write, delete)
// - Rate limit configuration
// - Key usage statistics
```

**File**: `src/app/api/v1/notes/route.ts`
```typescript
// Programmatic API for users
// - List notes
// - Create note
// - Update note
// - Delete note
// - Get flashcards
// - Generate flashcards
```

### 6.2 Webhooks

**File**: `src/app/dashboard/settings/webhooks/page.tsx`
```typescript
// User webhooks:
// - Note created/updated/deleted events
// - Flashcard generated
// - Version created
// - POST to user's webhook URL
```

### 6.3 Import/Export Enhancements

**File**: `src/app/dashboard/settings/data/export/page.tsx`
```typescript
// Enhanced export:
// - Export all notes as HTML, Markdown, PDF
// - Export with metadata
// - Schedule recurring exports
// - Email exports
// - GDPR-compliant data download
```

### 6.4 Collaboration (Future)

```typescript
// Share notes with other users
// - View-only access
// - Edit access
// - Comments and discussion
// - Version control for collaborators
```

---

## Implementation Timeline

| Phase | Features | Estimated Time | Priority |
|-------|----------|-----------------|----------|
| 1 | Admin system, user roles, audit logs | 3-4 weeks | CRITICAL |
| 2 | TOS, Privacy Policy, data deletion | 1-2 weeks | HIGH |
| 3 | User customization, theme builder | 2-3 weeks | HIGH |
| 4 | Categories, version restore, diffs | 2-3 weeks | MEDIUM |
| 5 | Rate limiting, CAPTCHA, bot protection | 2 weeks | MEDIUM |
| 6 | API keys, webhooks, exports | 2-3 weeks | LOW |

**Total Estimated Time**: 12-18 weeks for full implementation

---

## Quick Start: Next Steps

### Immediate Actions (This Week)
1. ✅ Run `prisma migrate` with Phase 1 schema updates
2. Create `/src/app/admin/` directory structure
3. Create `/src/app/tos/` and `/src/app/privacy/` pages
4. Update signup flow to collect TOS acceptance

### This Sprint
1. Build basic admin dashboard
2. Implement user role checking
3. Add audit logging to all sensitive actions
4. Create user preferences page

### This Month
1. Complete admin user management
2. Implement data deletion request flow
3. Add dashboard customization
4. Add theme customization

---

## Database Migration Strategy

```bash
# After schema updates in prisma/schema.prisma:

# 1. Create migration
npx prisma migrate dev --name add_admin_features

# 2. Push to database
npx prisma db push

# 3. Generate client
npx prisma generate

# 4. Rebuild Docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Security Checklist

- [ ] All admin endpoints protected by requireAdmin()
- [ ] Audit logging on all admin actions
- [ ] Rate limiting on login/signup
- [ ] CAPTCHA on authentication
- [ ] Input validation on all forms
- [ ] SQL injection prevention (Prisma handles)
- [ ] XSS prevention (Next.js handles)
- [ ] CSRF tokens on state-changing requests
- [ ] HTTPS enforced in production
- [ ] Environment variables for secrets
- [ ] Admin IP whitelisting (optional)
- [ ] Session timeout enforcement
- [ ] Password reset security
- [ ] Two-factor authentication (future)

---

## Testing Checklist

- [ ] Admin can view all users
- [ ] Admin can suspend/unsuspend users
- [ ] Admin can change user roles
- [ ] Suspended users cannot login
- [ ] Audit logs record all admin actions
- [ ] Users cannot access admin pages
- [ ] Data deletion requests work end-to-end
- [ ] Theme customization persists
- [ ] Dashboard layout persists
- [ ] Version restoration works correctly
- [ ] Rate limiting blocks brute force attempts
- [ ] User agreement required for signup

