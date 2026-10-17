/**
 * Category mapping between the two live providers.
 *
 * The app lets the user pick a category on /setup and then switches the
 * active provider (quizapi ↔ trivia). QuizAPI slugs are leaf-level and
 * numerous; trivia exposes 10 canonical slugs. This module resolves a
 * quizapi leaf slug onto a canonical trivia slug so a chosen category
 * survives a provider switch, and reports `null` when a quizapi topic
 * has no trivia counterpart (programming, devops, database, …) — the
 * request then goes out unfiltered (the whole pool).
 *
 * Ported verbatim from the frontend's triviaapi.ts.
 */

/** The 10 categories /v2/metadata reports as `byCategory` keys. */
const TRIVIA_CANONICAL_SLUGS: readonly string[] = [
  'arts_and_literature',
  'film_and_tv',
  'food_and_drink',
  'general_knowledge',
  'geography',
  'history',
  'music',
  'science',
  'society_and_culture',
  'sport_and_leisure',
]

/** Alias slugs exposed by /v2/categories, grouped by canonical slug. */
const TRIVIA_ALIAS_GROUPS: Record<string, readonly string[]> = {
  arts_and_literature: ['arts', 'literature', 'novels'],
  film_and_tv: ['movies', 'film'],
  food_and_drink: ['food', 'drink', 'alcohol'],
  society_and_culture: ['society', 'culture'],
  sport_and_leisure: ['sports', 'sport', 'games'],
}

/**
 * QuizAPI leaf slugs (from a live /api/v1/categories response) grouped
 * by the trivia category they fall back to. Unmapped on purpose → null:
 * programming, devops-and-cloud, database, cybersecurity, mathematics,
 * business-and-finance and the pop-culture leaves video-games, comics,
 * celebrities, fashion (their topic has no trivia counterpart).
 */
const QUIZAPI_LEAF_GROUPS: Record<string, readonly string[]> = {
  science: [
    'physics',
    'chemistry',
    'biology',
    'astronomy',
    'earth-science',
    'genetics',
    'ecology',
    'neuroscience',
    'quantum-physics',
    'climate-science',
    'marine-biology',
    'paleontology',
  ],
  history: [
    'world-wars',
    'ancient-history',
    'medieval-history',
    'modern-history',
    'american-history',
    'european-history',
    'asian-history',
    'ancient-rome',
    'ancient-greece',
    'cold-war',
    'renaissance',
    'industrial-revolution',
  ],
  geography: [
    'world-capitals',
    'africa',
    'europe',
    'asia',
    'americas',
    'mountains',
    'rivers',
    'oceans',
    'countries',
    'flags',
  ],
  arts_and_literature: [
    'classic-literature',
    'shakespeare',
    'poetry',
    'modern-fiction',
    'science-fiction',
    'fantasy',
    'world-literature',
    'literary-devices',
    'nobel-laureates',
    'children-s-literature',
    'art-and-architecture',
  ],
  film_and_tv: ['movies', 'tv-shows', 'anime'],
  music: ['music'],
  sport_and_leisure: ['sports'],
  food_and_drink: ['food-and-drink'],
  general_knowledge: [
    'trivia',
    'fun-facts',
    'world-records',
    'inventions',
    'famous-people',
    'languages',
    'philosophy',
    'health-and-wellness',
  ],
  society_and_culture: ['mythology'],
}

/** Flat slug → canonical trivia slug lookup. */
const CATEGORY_BY_SLUG: Record<string, string> = buildCategoryLookup()

function buildCategoryLookup(): Record<string, string> {
  const lookup: Record<string, string> = {}
  for (const canonical of TRIVIA_CANONICAL_SLUGS) {
    lookup[canonical] = canonical
  }
  addGroupedSlugs(lookup, TRIVIA_ALIAS_GROUPS)
  addGroupedSlugs(lookup, QUIZAPI_LEAF_GROUPS)
  return lookup
}

function addGroupedSlugs(
  lookup: Record<string, string>,
  groups: Record<string, readonly string[]>,
): void {
  for (const [canonical, slugs] of Object.entries(groups)) {
    for (const slug of slugs) {
      lookup[slug] = canonical
    }
  }
}

/**
 * Map a quizapi category slug onto a canonical trivia slug.
 * `null` means "no category filter" — the whole pool: 'all', an empty
 * or undefined slug, or a quizapi topic the fallback has no questions
 * for (programming, devops, database, …).
 */
export function resolveTriviaCategory(slug: string | undefined): string | null {
  if (!slug || slug === 'all') return null
  return CATEGORY_BY_SLUG[slug] ?? null
}

/**
 * Canonical slug of a /v2/categories entry: the alias that also exists
 * in metadata's byCategory, else one containing '_', else the first.
 */
export function pickCanonicalSlug(
  slugs: string[],
  byCategory: Record<string, number> | undefined,
): string {
  const fromMetadata =
    byCategory && slugs.find((slug) => byCategory[slug] !== undefined)
  if (fromMetadata) return fromMetadata

  const underscored = slugs.find((slug) => slug.includes('_'))
  if (underscored) return underscored

  return slugs[0]
}
