/** Mock questions for development. */
import type { Question } from '../types/quiz'
import { mockDelay } from './mock-data'

/** Generate mock questions with delay. */
export async function fetchMockQuestions(
  count: number,
  difficulty: string,
  category: string,
): Promise<Question[]> {
  await mockDelay()
  return generateMockQuestions(count, difficulty, category)
}

export const mockQuestions: Question[] = [
  {
    id: 'q1',
    text: 'What is the capital of France?',
    options: [
      { id: 'q1a', text: 'Paris' },
      { id: 'q1b', text: 'London' },
      { id: 'q1c', text: 'Berlin' },
      { id: 'q1d', text: 'Madrid' },
    ],
    correctOptionIds: ['q1a'],
    multiple: false,
    category: 'geography',
    difficulty: 'easy',
    explanation:
      'Paris has been the capital of France since the late 12th century.',
  },
  {
    id: 'q2',
    text: 'Which planet is closest to the Sun?',
    options: [
      { id: 'q2a', text: 'Venus' },
      { id: 'q2b', text: 'Mercury' },
      { id: 'q2c', text: 'Mars' },
      { id: 'q2d', text: 'Earth' },
    ],
    correctOptionIds: ['q2b'],
    multiple: false,
    category: 'science',
    difficulty: 'easy',
    explanation:
      'Mercury is the closest planet to the Sun at about 57.9 million km.',
  },
  {
    id: 'q3',
    text: 'What is the chemical symbol for gold?',
    options: [
      { id: 'q3a', text: 'Au' },
      { id: 'q3b', text: 'Ag' },
      { id: 'q3c', text: 'Fe' },
      { id: 'q3d', text: 'Cu' },
    ],
    correctOptionIds: ['q3a'],
    multiple: false,
    category: 'science',
    difficulty: 'medium',
    explanation: 'Au comes from the Latin word "aurum" meaning gold.',
  },
  {
    id: 'q4',
    text: 'Which of the following are JavaScript frameworks?',
    description: 'Select all that apply.',
    options: [
      { id: 'q4a', text: 'React' },
      { id: 'q4b', text: 'Django' },
      { id: 'q4c', text: 'Vue' },
      { id: 'q4d', text: 'Flask' },
    ],
    correctOptionIds: ['q4a', 'q4c'],
    multiple: true,
    category: 'technology',
    difficulty: 'medium',
    explanation:
      'React and Vue are JavaScript frameworks. Django and Flask are Python frameworks.',
  },
  {
    id: 'q5',
    text: 'In what year did World War II end?',
    options: [
      { id: 'q5a', text: '1943' },
      { id: 'q5b', text: '1944' },
      { id: 'q5c', text: '1945' },
      { id: 'q5d', text: '1946' },
    ],
    correctOptionIds: ['q5c'],
    multiple: false,
    category: 'history',
    difficulty: 'easy',
    explanation:
      'World War II ended in 1945 with the surrender of Germany and Japan.',
  },
  {
    id: 'q6',
    text: 'What is the largest ocean on Earth?',
    options: [
      { id: 'q6a', text: 'Atlantic Ocean' },
      { id: 'q6b', text: 'Indian Ocean' },
      { id: 'q6c', text: 'Pacific Ocean' },
      { id: 'q6d', text: 'Arctic Ocean' },
    ],
    correctOptionIds: ['q6c'],
    multiple: false,
    category: 'geography',
    difficulty: 'easy',
    explanation:
      'The Pacific Ocean covers about 165.25 million square kilometers.',
  },
  {
    id: 'q7',
    text: 'What is the value of Pi to two decimal places?',
    options: [
      { id: 'q7a', text: '3.14' },
      { id: 'q7b', text: '3.16' },
      { id: 'q7c', text: '3.12' },
      { id: 'q7d', text: '3.18' },
    ],
    correctOptionIds: ['q7a'],
    multiple: false,
    category: 'math',
    difficulty: 'easy',
    explanation:
      'Pi (π) is approximately 3.14159..., so to two decimal places it is 3.14.',
  },
  {
    id: 'q8',
    text: 'Which programming language is known as the "language of the web"?',
    options: [
      { id: 'q8a', text: 'JavaScript' },
      { id: 'q8b', text: 'Python' },
      { id: 'q8c', text: 'Java' },
      { id: 'q8d', text: 'C++' },
    ],
    correctOptionIds: ['q8a'],
    multiple: false,
    category: 'technology',
    difficulty: 'easy',
    explanation:
      'JavaScript is the primary language for web browser development.',
  },
  {
    id: 'q9',
    text: 'What is the speed of light approximately?',
    description: 'In km/s',
    options: [
      { id: 'q9a', text: '200,000 km/s' },
      { id: 'q9b', text: '300,000 km/s' },
      { id: 'q9c', text: '400,000 km/s' },
      { id: 'q9d', text: '150,000 km/s' },
    ],
    correctOptionIds: ['q9b'],
    multiple: false,
    category: 'science',
    difficulty: 'medium',
    explanation:
      'The speed of light in a vacuum is approximately 299,792 km/s.',
  },
  {
    id: 'q10',
    text: 'Which data structure uses FIFO (First In, First Out)?',
    options: [
      { id: 'q10a', text: 'Stack' },
      { id: 'q10b', text: 'Queue' },
      { id: 'q10c', text: 'Tree' },
      { id: 'q10d', text: 'Graph' },
    ],
    correctOptionIds: ['q10b'],
    multiple: false,
    category: 'technology',
    difficulty: 'medium',
    explanation:
      'A Queue follows FIFO: the first element added is the first one removed.',
  },
  {
    id: 'q11',
    text: 'What is the time complexity of binary search?',
    options: [
      { id: 'q11a', text: 'O(n)' },
      { id: 'q11b', text: 'O(log n)' },
      { id: 'q11c', text: 'O(n log n)' },
      { id: 'q11d', text: 'O(n²)' },
    ],
    correctOptionIds: ['q11b'],
    multiple: false,
    category: 'technology',
    difficulty: 'hard',
    explanation:
      'Binary search halves the search space each step, giving O(log n) complexity.',
  },
  {
    id: 'q12',
    text: 'What is the boiling point of water at sea level in Celsius?',
    options: [
      { id: 'q12a', text: '90°C' },
      { id: 'q12b', text: '100°C' },
      { id: 'q12c', text: '110°C' },
      { id: 'q12d', text: '120°C' },
    ],
    correctOptionIds: ['q12b'],
    multiple: false,
    category: 'science',
    difficulty: 'hard',
    explanation:
      'Water boils at 100°C (212°F) at standard atmospheric pressure (1 atm).',
  },
]

/** Generate a deterministic mock list based on config. */
export function generateMockQuestions(
  count: number,
  difficulty: string,
  category: string,
): Question[] {
  let filtered = mockQuestions

  if (difficulty !== 'easy') {
    filtered = filtered.filter((q) => {
      const levels: Record<string, number> = {
        easy: 0,
        medium: 1,
        hard: 2,
        expert: 3,
      }
      return levels[q.difficulty] >= levels[difficulty]
    })
  }

  if (category !== 'all') {
    filtered = filtered.filter((q) => q.category === category)
  }

  // Deterministic shuffle based on difficulty + category seed
  const seed = difficulty.charCodeAt(0) + category.length
  const shuffled = [...filtered].sort((a, b) => {
    const hashA = (a.id.charCodeAt(1) * seed) % 1000
    const hashB = (b.id.charCodeAt(1) * seed) % 1000
    return hashA - hashB
  })

  return shuffled.slice(0, count)
}
