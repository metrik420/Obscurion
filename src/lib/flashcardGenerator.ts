/**
 * FILE: src/lib/flashcardGenerator.ts
 * PURPOSE: Smart flashcard generation from note content.
 * INPUTS: Note title and content.
 * OUTPUTS: Array of auto-generated flashcard questions and answers.
 * NOTES: Uses multiple strategies:
 *   1. Key-value pairs from markdown lists
 *   2. Definition extraction (What is X?, How does X work?)
 *   3. Concept-based questions from headings
 */

export interface GeneratedFlashcard {
  question: string
  answer: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
}

/**
 * Generates flashcards from note content using multiple strategies.
 * Returns flashcards with varying difficulty levels based on content complexity.
 */
export function generateFlashcardsFromContent(
  noteTitle: string,
  content: string
): GeneratedFlashcard[] {
  const flashcards: GeneratedFlashcard[] = []

  // Strategy 1: Extract definition-style content (lines with colons)
  const definitions = extractDefinitions(content)
  flashcards.push(...definitions)

  // Strategy 2: Extract key-value pairs from markdown lists
  const keyValuePairs = extractKeyValuePairs(content)
  flashcards.push(...keyValuePairs)

  // Strategy 3: Extract concept-based questions from headings
  const conceptQuestions = extractConceptQuestions(noteTitle, content)
  flashcards.push(...conceptQuestions)

  // Strategy 4: Extract numbered/bulleted lists as definition questions
  const listQuestions = extractListQuestions(content)
  flashcards.push(...listQuestions)

  // Deduplicate and limit to avoid overwhelming the user
  const deduped = deduplicateFlashcards(flashcards)
  return deduped.slice(0, 20) // Limit to 20 per note
}

/**
 * Strategy 1: Extract definition-style content
 * Looks for patterns like "Term: Definition" or "Term - Definition"
 */
function extractDefinitions(content: string): GeneratedFlashcard[] {
  const flashcards: GeneratedFlashcard[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    // Match patterns like "Term: definition" or "Term - definition"
    const match = line.match(/^([^:\-]+)[:\-]\s*(.+)$/)
    if (match) {
      const [, term, definition] = match
      const trimmedTerm = term.trim()
      const trimmedDef = definition.trim()

      // Skip if too short or looks like a heading
      if (trimmedTerm.length < 3 || trimmedTerm.length > 100 || trimmedDef.length < 5) {
        continue
      }

      // Skip common false positives
      if (/^#+\s/.test(line) || /^[-*]\s/.test(line)) {
        continue
      }

      flashcards.push({
        question: `What is ${trimmedTerm}?`,
        answer: trimmedDef,
        difficulty: calculateDifficulty(trimmedDef),
      })
    }
  }

  return flashcards
}

/**
 * Strategy 2: Extract key-value pairs from markdown-style lists
 * Looks for patterns like "- Key: Value" or "- Key → Value"
 */
function extractKeyValuePairs(content: string): GeneratedFlashcard[] {
  const flashcards: GeneratedFlashcard[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    // Match markdown list items with colons or arrows
    const match = line.match(/^[-*]\s+([^:\-→]+)[:\-→]\s*(.+)$/)
    if (match) {
      const [, key, value] = match
      const trimmedKey = key.trim()
      const trimmedValue = value.trim()

      if (trimmedKey.length < 3 || trimmedKey.length > 100 || trimmedValue.length < 5) {
        continue
      }

      flashcards.push({
        question: `What is ${trimmedKey}?`,
        answer: trimmedValue,
        difficulty: calculateDifficulty(trimmedValue),
      })
    }
  }

  return flashcards
}

/**
 * Strategy 3: Extract concept-based questions from headings
 * Creates questions like "How does X work?" from heading content
 */
function extractConceptQuestions(
  noteTitle: string,
  content: string
): GeneratedFlashcard[] {
  const flashcards: GeneratedFlashcard[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Match markdown headings (h2, h3, h4)
    const match = line.match(/^#{2,4}\s+(.+)$/)
    if (match) {
      const heading = match[1].trim()

      // Get the next 2-3 non-empty lines as the answer
      let answerLines: string[] = []
      for (let j = i + 1; j < lines.length && answerLines.length < 3; j++) {
        const nextLine = lines[j].trim()
        if (nextLine && !nextLine.startsWith('#')) {
          answerLines.push(nextLine)
        }
      }

      if (answerLines.length > 0) {
        const answer = answerLines.join(' ').substring(0, 500)

        // Create multiple question formats for the same concept
        flashcards.push({
          question: `What is ${heading}?`,
          answer,
          difficulty: 'MEDIUM',
        })

        // Add a "how does it work" variant for longer content
        if (answer.length > 100) {
          flashcards.push({
            question: `How does ${heading} work?`,
            answer,
            difficulty: 'HARD',
          })
        }
      }
    }
  }

  return flashcards
}

/**
 * Strategy 4: Extract numbered or bulleted list items as definition questions
 * Converts lists into Q&A format
 */
function extractListQuestions(content: string): GeneratedFlashcard[] {
  const flashcards: GeneratedFlashcard[] = []
  const lines = content.split('\n')

  // Group consecutive list items
  let currentList: string[] = []

  for (const line of lines) {
    const isListItem = /^[-*]\s+(.+)$/.test(line) || /^\d+\.\s+(.+)$/.test(line)

    if (isListItem) {
      const itemMatch = line.match(/^(?:[-*]|\d+\.)\s+(.+)$/)
      if (itemMatch) {
        currentList.push(itemMatch[1])
      }
    } else if (currentList.length > 0) {
      // End of list - generate questions if meaningful
      if (currentList.length >= 2) {
        const combinedAnswer = currentList.join('; ')
        if (combinedAnswer.length > 10 && combinedAnswer.length < 500) {
          flashcards.push({
            question: `List the key points about this topic.`,
            answer: combinedAnswer,
            difficulty: 'MEDIUM',
          })
        }
      }
      currentList = []
    }
  }

  return flashcards
}

/**
 * Calculates difficulty based on answer length and complexity
 * Longer, more complex answers = harder flashcards
 */
function calculateDifficulty(answer: string): 'EASY' | 'MEDIUM' | 'HARD' {
  const wordCount = answer.split(/\s+/).length
  const hasMultipleSentences = (answer.match(/[.!?]/g) || []).length > 1

  if (wordCount > 50 || hasMultipleSentences) {
    return 'HARD'
  } else if (wordCount > 20) {
    return 'MEDIUM'
  }
  return 'EASY'
}

/**
 * Removes duplicate flashcards (same question)
 */
function deduplicateFlashcards(flashcards: GeneratedFlashcard[]): GeneratedFlashcard[] {
  const seen = new Set<string>()
  return flashcards.filter((card) => {
    const key = card.question.toLowerCase()
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}
