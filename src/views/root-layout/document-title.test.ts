import { describe, expect, it } from 'vitest'
import i18n from 'i18next'
import en from '../../locales/en.json'
import ru from '../../locales/ru.json'
import { documentTitle } from './document-title'

const instance = i18n.createInstance()
await instance.init({
  lng: 'en',
  resources: { en: { translation: en }, ru: { translation: ru } },
})

describe('documentTitle', () => {
  it('is the bare app name on the home page and unknown routes', () => {
    expect(documentTitle('/', instance.t)).toBe('QuizApp')
    expect(documentTitle('/nope', instance.t)).toBe('QuizApp')
  })

  it('prefixes the page name', () => {
    expect(documentTitle('/results', instance.t)).toBe('Results · QuizApp')
    expect(documentTitle('/stats', instance.t)).toBe('Stats · QuizApp')
  })

  it('tolerates a trailing slash', () => {
    expect(documentTitle('/settings/', instance.t)).toBe('Settings · QuizApp')
  })

  it('follows the language', () => {
    expect(documentTitle('/results', instance.getFixedT('ru'))).toBe(
      'Результаты · QuizApp',
    )
  })
})
