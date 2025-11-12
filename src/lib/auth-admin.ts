/**
 * Admin Authentication Utility
 * Verifies if a user has admin privileges
 */

import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'

const ADMIN_EMAILS = [
  'metrik@metrikcorp.com',
  // Add other admin emails here
]

/**
 * Check if user is admin
 * @param email User email
 * @returns true if user is admin
 */
export async function isAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false

  // Check against hardcoded list
  if (ADMIN_EMAILS.includes(email.toLowerCase())) {
    return true
  }

  // Check against database role
  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { role: true },
    })
    return user?.role === UserRole.ADMIN
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Check if user is admin or moderator
 * @param email User email
 * @returns true if user is admin or moderator
 */
export async function isModerator(email: string | null | undefined): Promise<boolean> {
  if (!email) return false

  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { role: true },
    })
    return user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR
  } catch (error) {
    console.error('Error checking moderator status:', error)
    return false
  }
}

/**
 * Get user role
 * @param email User email
 * @returns User role or null
 */
export async function getUserRole(email: string | null | undefined): Promise<UserRole | null> {
  if (!email) return null

  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { role: true },
    })
    return user?.role || null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}
