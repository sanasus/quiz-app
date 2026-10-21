import type { TFunction } from 'i18next'

const APP_NAME = 'QuizApp'

/** Route → i18n key of the page name; routes not listed use the bare app name. */
const TITLE_KEYS: Record<string, string> = {
  '/setup': 'app.nav.new_quiz',
  '/quiz': 'app.nav.new_quiz',
  '/results': 'results.title',
  '/stats': 'stats.title',
  '/achievements': 'achievements.title',
  '/settings': 'settings.title',
}

/** «Results · QuizApp»; the home page is just «QuizApp». */
export function documentTitle(pathname: string, t: TFunction): string {
  const key = TITLE_KEYS[pathname.replace(/\/+$/, '') || '/']
  return key ? `${t(key)} · ${APP_NAME}` : APP_NAME
}
