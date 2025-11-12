/**
 * Audit Logging Utility
 * Logs all admin and sensitive actions for compliance
 */

import { db } from '@/lib/db'

export interface AuditLogParams {
  adminEmail: string
  action: string
  resourceType: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export interface ComplianceLogParams {
  userEmail: string
  event: string
  details?: Record<string, any>
  ipAddress?: string
}

/**
 * Log admin action
 * @param params Audit log parameters
 */
export async function logAdminAction(params: AuditLogParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        adminEmail: params.adminEmail,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        details: JSON.stringify(params.details || {}),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}

/**
 * Log compliance event (TOS acceptance, deletions, etc.)
 * @param params Compliance log parameters
 */
export async function logComplianceEvent(params: ComplianceLogParams): Promise<void> {
  try {
    await db.complianceLog.create({
      data: {
        userEmail: params.userEmail,
        event: params.event,
        details: JSON.stringify(params.details || {}),
        ipAddress: params.ipAddress,
      },
    })
  } catch (error) {
    console.error('Failed to log compliance event:', error)
  }
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(options?: {
  adminEmail?: string
  action?: string
  limit?: number
  offset?: number
}) {
  try {
    const logs = await db.auditLog.findMany({
      where: {
        ...(options?.adminEmail && { adminEmail: options.adminEmail }),
        ...(options?.action && { action: options.action }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      select: {
        id: true,
        adminEmail: true,
        action: true,
        resourceType: true,
        resourceId: true,
        details: true,
        ipAddress: true,
        createdAt: true,
      },
    })

    return logs.map((log) => ({
      ...log,
      details: JSON.parse(log.details),
    }))
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return []
  }
}

/**
 * Get compliance logs with filtering
 */
export async function getComplianceLogs(options?: {
  userEmail?: string
  event?: string
  limit?: number
  offset?: number
}) {
  try {
    const logs = await db.complianceLog.findMany({
      where: {
        ...(options?.userEmail && { userEmail: options.userEmail }),
        ...(options?.event && { event: options.event }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      select: {
        id: true,
        userEmail: true,
        event: true,
        details: true,
        ipAddress: true,
        createdAt: true,
      },
    })

    return logs.map((log) => ({
      ...log,
      details: JSON.parse(log.details),
    }))
  } catch (error) {
    console.error('Failed to fetch compliance logs:', error)
    return []
  }
}
