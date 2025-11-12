// Role-based permission definitions
export type UserRole = 'ADMIN' | 'MODERATOR' | 'VIP' | 'USER'

export interface Permission {
  action: string
  resource: string
}

export interface RolePermissions {
  [key: string]: Permission[]
}

// Define permissions for each role
export const ROLE_PERMISSIONS: RolePermissions = {
  ADMIN: [
    // User management
    { action: 'view', resource: 'users' },
    { action: 'edit', resource: 'users' },
    { action: 'delete', resource: 'users' },
    { action: 'suspend', resource: 'users' },
    { action: 'unsuspend', resource: 'users' },
    { action: 'change_role', resource: 'users' },

    // Note management
    { action: 'view', resource: 'notes' },
    { action: 'edit', resource: 'notes' },
    { action: 'delete', resource: 'notes' },
    { action: 'moderate', resource: 'notes' },

    // System management
    { action: 'view', resource: 'audit_logs' },
    { action: 'view', resource: 'compliance_logs' },
    { action: 'view', resource: 'analytics' },

    // Standard user permissions
    { action: 'create', resource: 'notes' },
    { action: 'view', resource: 'own_notes' },
    { action: 'edit', resource: 'own_notes' },
    { action: 'delete', resource: 'own_notes' },
    { action: 'create', resource: 'categories' },
  ],

  MODERATOR: [
    // User viewing
    { action: 'view', resource: 'users' },

    // Note moderation
    { action: 'view', resource: 'notes' },
    { action: 'delete', resource: 'notes' },
    { action: 'moderate', resource: 'notes' },

    // Audit viewing
    { action: 'view', resource: 'audit_logs' },

    // Standard user permissions
    { action: 'create', resource: 'notes' },
    { action: 'view', resource: 'own_notes' },
    { action: 'edit', resource: 'own_notes' },
    { action: 'delete', resource: 'own_notes' },
    { action: 'create', resource: 'categories' },
  ],

  VIP: [
    // Standard user permissions
    { action: 'create', resource: 'notes' },
    { action: 'view', resource: 'own_notes' },
    { action: 'edit', resource: 'own_notes' },
    { action: 'delete', resource: 'own_notes' },
    { action: 'create', resource: 'categories' },

    // VIP-specific features (premium features)
    { action: 'generate', resource: 'flashcards' },
    { action: 'export', resource: 'notes' },
    { action: 'import', resource: 'notes' },
    { action: 'unlimited', resource: 'storage' }, // Placeholder for future storage limits
  ],

  USER: [
    // Standard user permissions
    { action: 'create', resource: 'notes' },
    { action: 'view', resource: 'own_notes' },
    { action: 'edit', resource: 'own_notes' },
    { action: 'delete', resource: 'own_notes' },
    { action: 'create', resource: 'categories' },

    // Basic features (limited flashcards for free users)
    { action: 'generate', resource: 'flashcards_limited' },
  ],
}

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(
  role: UserRole,
  action: string,
  resource: string
): boolean {
  const permissions = ROLE_PERMISSIONS[role] || []
  return permissions.some(
    (perm) => perm.action === action && perm.resource === resource
  )
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(
  role: UserRole,
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some((perm) =>
    hasPermission(role, perm.action, perm.resource)
  )
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(
  role: UserRole,
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every((perm) =>
    hasPermission(role, perm.action, perm.resource)
  )
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Get role hierarchy level (higher = more power)
 */
export function getRoleHierarchy(role: UserRole): number {
  const hierarchy: Record<UserRole, number> = {
    ADMIN: 4,
    MODERATOR: 3,
    VIP: 2,
    USER: 1,
  }
  return hierarchy[role] || 0
}

/**
 * Check if user can manage another user (admin can manage anyone, etc.)
 */
export function canManageUser(
  managerRole: UserRole,
  targetRole: UserRole
): boolean {
  return getRoleHierarchy(managerRole) > getRoleHierarchy(targetRole)
}

/**
 * Check if role is higher than or equal to target role
 */
export function isRoleHigherOrEqual(
  role: UserRole,
  targetRole: UserRole
): boolean {
  return getRoleHierarchy(role) >= getRoleHierarchy(targetRole)
}

/**
 * Permission middleware for API endpoints
 * Returns error response if user lacks required permission
 */
export function requirePermission(
  userRole: UserRole,
  action: string,
  resource: string
): { allowed: boolean; error?: string } {
  if (!hasPermission(userRole, action, resource)) {
    return {
      allowed: false,
      error: `Permission denied: ${action} on ${resource}`
    }
  }
  return { allowed: true }
}

/**
 * Check if user is resource owner (for own_notes, own_profile, etc.)
 */
export function isResourceOwner(
  userId: string,
  resourceOwnerId: string
): boolean {
  return userId === resourceOwnerId
}
