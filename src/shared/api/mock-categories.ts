/** Mock categories for development. */
export const mockCategories = {
  topics: [
    {
      id: 't1',
      name: 'Science',
      slug: 'science',
      categories: [
        { id: 'c1', name: 'Physics', slug: 'physics', quizCount: 120 },
        { id: 'c2', name: 'Chemistry', slug: 'chemistry', quizCount: 85 },
        { id: 'c3', name: 'Biology', slug: 'biology', quizCount: 95 },
      ],
    },
    {
      id: 't2',
      name: 'History',
      slug: 'history',
      categories: [
        { id: 'c4', name: 'Ancient', slug: 'ancient', quizCount: 60 },
        { id: 'c5', name: 'Modern', slug: 'modern', quizCount: 75 },
      ],
    },
    {
      id: 't3',
      name: 'Geography',
      slug: 'geography',
      categories: [
        { id: 'c6', name: 'Europe', slug: 'europe', quizCount: 45 },
        { id: 'c7', name: 'Asia', slug: 'asia', quizCount: 50 },
      ],
    },
    {
      id: 't4',
      name: 'Mathematics',
      slug: 'math',
      categories: [
        { id: 'c8', name: 'Algebra', slug: 'algebra', quizCount: 110 },
        { id: 'c9', name: 'Geometry', slug: 'geometry', quizCount: 80 },
      ],
    },
    {
      id: 't5',
      name: 'Technology',
      slug: 'technology',
      categories: [
        { id: 'c10', name: 'Programming', slug: 'programming', quizCount: 200 },
        { id: 'c11', name: 'Web', slug: 'web', quizCount: 150 },
      ],
    },
    {
      id: 't6',
      name: 'Literature',
      slug: 'literature',
      categories: [
        { id: 'c12', name: 'Classic', slug: 'classic', quizCount: 40 },
        { id: 'c13', name: 'Modern', slug: 'modern-lit', quizCount: 35 },
      ],
    },
  ],
  flatCategories: [] as { id: string; name: string; slug: string; quizCount: number }[],
} as const

// Build flat list
for (const topic of mockCategories.topics) {
  for (const cat of topic.categories) {
    mockCategories.flatCategories.push({ ...cat })
  }
}

import type { Topic, Category } from '../types/quiz'
import { mockDelay } from './mock-data'

/** Generate mock categories with delay. */
export async function fetchMockCategories(): Promise<{
  topics: Topic[]
  flatCategories: Category[]
}> {
  await mockDelay()
  return {
    topics: mockCategories.topics as unknown as Topic[],
    flatCategories: mockCategories.flatCategories as unknown as Category[],
  }
}
