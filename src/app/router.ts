import { createRouter } from '@tanstack/react-router'
// Импортируем автоматически сгенерированное дерево маршрутов
import { routeTree } from '../routeTree.gen.ts'
import { NotFoundPage } from '../shared/ui/not-found-page'

// Создаем инстанс роутера. Передавать кастомную историю больше не нужно,
// TanStack Router сам создает дефолтную браузерную историю под капотом,
// а в SSR-окружении корректно переключается на memory history.
export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundPage,
  // basepath: '/' — удален, так как '/' является значением по умолчанию
})

// Регистрируем инстанс роутера для обеспечения полной типобезопасности
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
