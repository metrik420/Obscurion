/**
 * FILE: test-flashcard-direct.ts
 * PURPOSE: Direct test of flashcard generation logic without database.
 * INPUTS: Sample content strings.
 * OUTPUTS: Console logs showing generated flashcards.
 * NOTES: Run with: npx tsx test-flashcard-direct.ts
 *        Or: npm install -D tsx && npx tsx test-flashcard-direct.ts
 */

import { generateFlashcardsFromContent } from './src/lib/flashcard-generator'

console.log('='.repeat(80))
console.log('FLASHCARD GENERATION DIRECT TEST')
console.log('='.repeat(80))

const testCases = [
  {
    name: 'Explicit Q&A Format',
    content: `
Q: What is Docker?
A: Docker is a platform for developing, shipping, and running applications in containers.

Q: What is Kubernetes?
A: Kubernetes is an open-source container orchestration platform that automates deployment, scaling, and management of containerized applications.
    `.trim(),
  },
  {
    name: 'Definition Format',
    content: `
**API**: Application Programming Interface - a set of rules that allows software applications to communicate with each other.

**REST**: Representational State Transfer - an architectural style for designing networked applications.

**GraphQL**: A query language for APIs that provides a complete description of data in your API.
    `.trim(),
  },
  {
    name: 'List-Based Q&A',
    content: `
1. What is the difference between TCP and UDP?
   - TCP is connection-oriented and reliable
   - UDP is connectionless and faster
   - TCP has error checking, UDP does not

2. What are the OSI model layers?
   - Physical, Data Link, Network, Transport, Session, Presentation, Application
    `.trim(),
  },
  {
    name: 'Mixed Format',
    content: `
Q: What is a VPN?
A: A Virtual Private Network that creates a secure connection over the internet.

**Firewall**: A network security device that monitors and controls incoming and outgoing network traffic.

1. What are the benefits of HTTPS?
   - Encrypted communication
   - Authentication of website
   - Data integrity
    `.trim(),
  },
  {
    name: 'Short Content (should return empty)',
    content: 'Just a short note.',
  },
  {
    name: 'No Patterns (should return empty)',
    content: `
This is a longer note but it doesn't contain any recognizable patterns
for flashcard generation. It's just regular prose text that goes on
for a while without any questions or definitions.
    `.trim(),
  },
]

testCases.forEach((testCase, index) => {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`TEST ${index + 1}: ${testCase.name}`)
  console.log('='.repeat(80))
  console.log(`Content length: ${testCase.content.length} chars`)
  console.log(`\nContent:\n${testCase.content.substring(0, 200)}...\n`)

  const flashcards = generateFlashcardsFromContent(testCase.content)

  console.log(`Generated ${flashcards.length} flashcards:`)

  if (flashcards.length === 0) {
    console.log('  (none)')
  } else {
    flashcards.forEach((card, idx) => {
      console.log(`\n  Flashcard ${idx + 1}:`)
      console.log(`    Q: ${card.question}`)
      console.log(`    A: ${card.answer.substring(0, 100)}${card.answer.length > 100 ? '...' : ''}`)
      console.log(`    Difficulty: ${card.difficulty}`)
    })
  }
})

console.log(`\n${'='.repeat(80)}`)
console.log('TEST COMPLETE')
console.log('='.repeat(80))
