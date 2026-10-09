import type {ApiMetadata} from "../types/quiz.ts";

/** Mock data delay in ms. */
const MOCK_DELAY = 800

/** Sleep for MOCK_DELAY ms. */
export function mockDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY))
}

/** Mock metadata for development. */
export const mockMetadata = {
  difficulties: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
  questionTypes: ['multiple_choice', 'true_false'],
} as const

/** Generate mock metadata with delay. */
export async function fetchMockMetadata(): Promise<ApiMetadata> {
  await mockDelay()
  return mockMetadata as unknown as ApiMetadata
}
