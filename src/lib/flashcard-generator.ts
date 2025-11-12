/**
 * FILE: src/lib/flashcard-generator.ts
 * PURPOSE: Automatically generate flashcard Q&A pairs from note content.
 * INPUTS: Raw note content (string), potentially containing lists, definitions, or Q&A patterns.
 * OUTPUTS: Array of {question, answer, difficulty} objects suitable for spaced repetition.
 * NOTES: Uses pattern matching to detect questions, definitions, and key-value pairs.
 *        Difficulty is inferred from answer length and complexity.
 */

export type FlashcardDifficulty = 'EASY' | 'MEDIUM' | 'HARD'

export interface GeneratedFlashcard {
  question: string
  answer: string
  difficulty: FlashcardDifficulty
}

/**
 * Detects the difficulty of a flashcard based on answer complexity.
 * @param answer - The answer text to analyze
 * @returns FlashcardDifficulty - EASY (< 50 chars), MEDIUM (50-150 chars), HARD (> 150 chars)
 * @complexity O(1) - Simple length check and word count
 */
function detectDifficulty(answer: string): FlashcardDifficulty {
  const length = answer.trim().length
  const wordCount = answer.trim().split(/\s+/).length

  // Short, concise answers are EASY
  if (length < 50 && wordCount < 10) {
    return 'EASY'
  }

  // Medium-length answers with moderate complexity
  if (length < 150 && wordCount < 30) {
    return 'MEDIUM'
  }

  // Long, detailed answers are HARD
  return 'HARD'
}

/**
 * Extracts Q&A pairs from markdown-style question blocks.
 * Matches patterns like:
 *   Q: What is X?
 *   A: X is...
 *
 * @param content - The note content to parse
 * @returns Array of flashcard objects
 */
function extractExplicitQA(content: string): GeneratedFlashcard[] {
  const flashcards: GeneratedFlashcard[] = []

  // Pattern: Q: <question> \n A: <answer>
  // Case-insensitive, allows for "Question:", "Q:", etc.
  const qaPattern = /(?:Q(?:uestion)?|❓)[\s:]+(.+?)[\n\r]+(?:A(?:nswer)?|✅)[\s:]+(.+?)(?=\n\n|\n(?:Q(?:uestion)?|❓)|$)/gis

  const matches = content.matchAll(qaPattern)

  for (const match of matches) {
    const question = match[1].trim()
    const answer = match[2].trim()

    if (question && answer && question.length > 5 && answer.length > 3) {
      flashcards.push({
        question,
        answer,
        difficulty: detectDifficulty(answer),
      })
    }
  }

  return flashcards
}

/**
 * Extracts definition-style flashcards from content.
 * Matches patterns like:
 *   - **Term**: Definition
 *   - Term: Definition
 *   - Term - Definition
 *
 * @param content - The note content to parse
 * @returns Array of flashcard objects with "What is X?" format questions
 */
function extractDefinitions(content: string): GeneratedFlashcard[] {
  const flashcards: GeneratedFlashcard[] = []

  // Pattern: **Term**: Definition or Term: Definition
  const defPattern = /^[\s-]*\*?\*?([^:*\n]{3,50})\*?\*?[\s:]+(.+?)$/gm

  const matches = content.matchAll(defPattern)

  for (const match of matches) {
    const term = match[1].trim()
    const definition = match[2].trim()

    // Validate: term should not contain special chars indicating it's not a term
    // definition should be substantial
    if (
      term &&
      definition &&
      term.length > 2 &&
      definition.length > 10 &&
      !term.includes('?') &&
      !term.includes('http')
    ) {
      flashcards.push({
        question: `What is ${term}?`,
        answer: definition,
        difficulty: detectDifficulty(definition),
      })
    }
  }

  return flashcards
}

/**
 * Extracts flashcards from numbered or bulleted lists with sub-items.
 * Matches patterns like:
 *   1. Question
 *      - Answer point 1
 *      - Answer point 2
 *
 * @param content - The note content to parse
 * @returns Array of flashcard objects
 */
function extractListBasedQA(content: string): GeneratedFlashcard[] {
  const flashcards: GeneratedFlashcard[] = []

  // Split content into lines
  const lines = content.split('\n')
  let currentQuestion = ''
  let currentAnswers: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Check if line is a numbered or bulleted item that looks like a question
    const isQuestion = /^(?:\d+[\.\)]\s+|[-*]\s+)(.+\?)$/.test(line)

    if (isQuestion) {
      // Save previous Q&A if exists
      if (currentQuestion && currentAnswers.length > 0) {
        const answer = currentAnswers.join('\n').trim()
        if (answer.length > 3) {
          flashcards.push({
            question: currentQuestion,
            answer,
            difficulty: detectDifficulty(answer),
          })
        }
      }

      // Start new Q&A
      currentQuestion = line.replace(/^(?:\d+[\.\)]\s+|[-*]\s+)/, '').trim()
      currentAnswers = []
    } else if (currentQuestion && /^\s+[-*]\s+(.+)/.test(line)) {
      // This is a sub-item (indented bullet/dash), likely an answer component
      const answerPart = line.replace(/^\s+[-*]\s+/, '').trim()
      currentAnswers.push(answerPart)
    }
  }

  // Don't forget the last Q&A
  if (currentQuestion && currentAnswers.length > 0) {
    const answer = currentAnswers.join('\n').trim()
    if (answer.length > 3) {
      flashcards.push({
        question: currentQuestion,
        answer,
        difficulty: detectDifficulty(answer),
      })
    }
  }

  return flashcards
}

/**
 * Main function to generate flashcards from note content.
 * Applies multiple extraction strategies and deduplicates results.
 *
 * @param content - The full note content to process
 * @returns Array of unique flashcard objects
 * @throws Never throws - returns empty array for invalid/empty content
 * @complexity O(n) where n is content length (regex matching is linear)
 * @invariant Output flashcards have non-empty question and answer fields
 *
 * Edge cases:
 * - Empty content → returns []
 * - Short notes (< 50 chars) → returns []
 * - No recognizable patterns → returns []
 * - Duplicate questions → deduplicated by question text
 */
export function generateFlashcardsFromContent(content: string): GeneratedFlashcard[] {
  // Handle edge cases
  if (!content || typeof content !== 'string' || content.trim().length < 50) {
    return []
  }

  const allFlashcards: GeneratedFlashcard[] = []

  // Strategy 1: Extract explicit Q&A blocks
  const explicitQA = extractExplicitQA(content)
  allFlashcards.push(...explicitQA)

  // Strategy 2: Extract definition-style pairs
  const definitions = extractDefinitions(content)
  allFlashcards.push(...definitions)

  // Strategy 3: Extract list-based Q&A
  const listQA = extractListBasedQA(content)
  allFlashcards.push(...listQA)

  // Deduplicate by question text (case-insensitive)
  const seen = new Set<string>()
  const uniqueFlashcards = allFlashcards.filter((card) => {
    const normalizedQ = card.question.toLowerCase().trim()
    if (seen.has(normalizedQ)) {
      return false
    }
    seen.add(normalizedQ)
    return true
  })

  // Additional validation: ensure questions end with ? or are definitions
  return uniqueFlashcards.filter((card) => {
    const hasValidQuestion =
      card.question.includes('?') ||
      card.question.toLowerCase().startsWith('what is') ||
      card.question.toLowerCase().startsWith('how to') ||
      card.question.toLowerCase().startsWith('define')

    return hasValidQuestion && card.answer.length >= 3
  })
}

/**
 * Validates and sanitizes a flashcard object before database insertion.
 * @param card - The flashcard to validate
 * @returns Sanitized flashcard or null if invalid
 */
export function validateFlashcard(card: any): GeneratedFlashcard | null {
  if (!card || typeof card !== 'object') {
    return null
  }

  const { question, answer, difficulty } = card

  if (
    typeof question !== 'string' ||
    typeof answer !== 'string' ||
    question.trim().length < 5 ||
    answer.trim().length < 3
  ) {
    return null
  }

  const validDifficulties: FlashcardDifficulty[] = ['EASY', 'MEDIUM', 'HARD']
  const finalDifficulty = validDifficulties.includes(difficulty)
    ? difficulty
    : 'MEDIUM'

  return {
    question: question.trim().slice(0, 500), // Limit question length
    answer: answer.trim().slice(0, 2000), // Limit answer length
    difficulty: finalDifficulty,
  }
}
