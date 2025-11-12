/**
 * FILE: src/lib/validation.ts
 * PURPOSE: Input validation schemas and utilities for API endpoints.
 * INPUTS: User input from API requests (JSON bodies, query params).
 * OUTPUTS: Validated and typed data or validation errors.
 * NOTES: Uses runtime validation to prevent injection and enforce data integrity.
 *        No external validation library required - pure TypeScript validation.
 */

/**
 * Validates email format.
 * @param email - Email string to validate
 * @returns boolean - true if valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) && email.length <= 255
}

/**
 * Validates and sanitizes note title.
 * @param title - Title string to validate
 * @returns Sanitized title or null if invalid
 */
export function validateNoteTitle(title: unknown): string | null {
  if (typeof title !== 'string') return null
  const trimmed = title.trim()
  if (trimmed.length < 1 || trimmed.length > 200) return null
  // Remove any null bytes or control characters
  return trimmed.replace(/[\x00-\x1F\x7F]/g, '')
}

/**
 * Validates and sanitizes note content.
 * @param content - Content string to validate
 * @returns Sanitized content or null if invalid
 */
export function validateNoteContent(content: unknown): string | null {
  if (typeof content !== 'string') return null
  const trimmed = content.trim()
  if (trimmed.length < 1 || trimmed.length > 1000000) return null // Max 1MB text
  return trimmed
}

/**
 * Validates note type enum.
 * @param type - Type string to validate
 * @returns Valid type or default 'GENERAL'
 */
export function validateNoteType(type: unknown): string {
  const validTypes = ['GENERAL', 'JOURNAL', 'VPS', 'DEDICATED', 'SHARED', 'INCIDENT', 'DOCUMENTATION']
  if (typeof type === 'string' && validTypes.includes(type.toUpperCase())) {
    return type.toUpperCase()
  }
  return 'GENERAL'
}

/**
 * Validates category name.
 * @param name - Category name to validate
 * @returns Sanitized name or null if invalid
 */
export function validateCategoryName(name: unknown): string | null {
  if (typeof name !== 'string') return null
  const trimmed = name.trim()
  if (trimmed.length < 1 || trimmed.length > 50) return null
  // Only allow alphanumeric, spaces, hyphens, underscores
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) return null
  return trimmed
}

/**
 * Validates array of category IDs.
 * @param categoryIds - Array of category ID strings
 * @returns Validated array or empty array if invalid
 */
export function validateCategoryIds(categoryIds: unknown): string[] {
  if (!Array.isArray(categoryIds)) return []
  return categoryIds
    .filter((id) => typeof id === 'string' && id.length > 0 && id.length <= 50)
    .slice(0, 20) // Max 20 categories per note
}

/**
 * Validates pagination parameters.
 * @param page - Page number (string or number)
 * @param limit - Items per page (string or number)
 * @returns {page, limit, offset} - Validated pagination params
 */
export function validatePagination(
  page: unknown,
  limit: unknown
): { page: number; limit: number; offset: number } {
  let validPage = 1
  let validLimit = 10

  if (typeof page === 'string') {
    const parsed = parseInt(page, 10)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 10000) {
      validPage = parsed
    }
  } else if (typeof page === 'number' && page > 0 && page <= 10000) {
    validPage = page
  }

  if (typeof limit === 'string') {
    const parsed = parseInt(limit, 10)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      validLimit = parsed
    }
  } else if (typeof limit === 'number' && limit > 0 && limit <= 100) {
    validLimit = limit
  }

  return {
    page: validPage,
    limit: validLimit,
    offset: (validPage - 1) * validLimit,
  }
}

/**
 * Validates search query string.
 * @param query - Search query to validate
 * @returns Sanitized query or empty string
 */
export function validateSearchQuery(query: unknown): string {
  if (typeof query !== 'string') return ''
  const trimmed = query.trim()
  if (trimmed.length > 200) return trimmed.slice(0, 200)
  return trimmed
}

/**
 * Validates template name.
 * @param name - Template name to validate
 * @returns Sanitized name or null if invalid
 */
export function validateTemplateName(name: unknown): string | null {
  if (typeof name !== 'string') return null
  const trimmed = name.trim()
  if (trimmed.length < 1 || trimmed.length > 100) return null
  return trimmed.replace(/[\x00-\x1F\x7F]/g, '')
}

/**
 * Validates export format.
 * @param format - Export format string
 * @returns 'markdown' | 'pdf' | null
 */
export function validateExportFormat(format: unknown): 'markdown' | 'pdf' | null {
  if (typeof format !== 'string') return null
  const normalized = format.toLowerCase()
  if (normalized === 'markdown' || normalized === 'md') return 'markdown'
  if (normalized === 'pdf') return 'pdf'
  return null
}

/**
 * Validates CUID/database ID format.
 * @param id - ID string to validate
 * @returns boolean - true if valid CUID format
 */
export function isValidId(id: unknown): boolean {
  if (typeof id !== 'string') return false
  // CUID format: starts with 'c', 25 chars total, alphanumeric lowercase
  return /^c[a-z0-9]{24}$/.test(id)
}

/**
 * Sanitizes filename for safe filesystem operations.
 * @param filename - Original filename
 * @returns Safe filename without path traversal characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.+/g, '.')
    .slice(0, 255)
}

/**
 * Validates sort field and direction.
 * @param sortBy - Field name to sort by
 * @param sortOrder - 'asc' or 'desc'
 * @returns {field, order} - Validated sort params
 */
export function validateSort(
  sortBy: unknown,
  sortOrder: unknown
): { field: string; order: 'asc' | 'desc' } {
  const validFields = ['createdAt', 'updatedAt', 'title', 'readingTime']
  let field = 'createdAt'
  let order: 'asc' | 'desc' = 'desc'

  if (typeof sortBy === 'string' && validFields.includes(sortBy)) {
    field = sortBy
  }

  if (typeof sortOrder === 'string') {
    const normalized = sortOrder.toLowerCase()
    if (normalized === 'asc' || normalized === 'desc') {
      order = normalized
    }
  }

  return { field, order }
}
