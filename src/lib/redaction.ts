/**
 * Auto-redaction utility for sensitive data
 * Redacts emails, IPs, domains, credentials, and ticket IDs
 */

const PATTERNS = {
  email: /([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  ipv6: /(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}/g,
  domain: /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g,
  credential: /(?:password|passwd|pwd|secret|key|token|auth|api_key|apikey)[\s:=]+[^\s\n]+/gi,
  ticketId: /(?:ticket|issue|bug|incident)[\s:=#]*([A-Z0-9-]+)/gi,
}

export function redactContent(content: string): string {
  let redacted = content

  // Redact email addresses
  redacted = redacted.replace(PATTERNS.email, '[REDACTED_EMAIL]')

  // Redact IPv4 addresses
  redacted = redacted.replace(PATTERNS.ipv4, '[REDACTED_IP]')

  // Redact IPv6 addresses
  redacted = redacted.replace(PATTERNS.ipv6, '[REDACTED_IP]')

  // Redact domains (more conservative)
  redacted = redacted.replace(PATTERNS.domain, '[REDACTED_DOMAIN]')

  // Redact credentials
  redacted = redacted.replace(
    PATTERNS.credential,
    (match) => {
      const prefix = match.split(/[\s:=]+/)[0]
      return `${prefix}=[REDACTED_CREDENTIAL]`
    }
  )

  // Redact ticket IDs
  redacted = redacted.replace(PATTERNS.ticketId, (match, ticketId) => {
    return match.replace(ticketId, '[REDACTED_TICKET]')
  })

  return redacted
}

export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute) || 1
}
