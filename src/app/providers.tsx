import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from '@tanstack/react-router'
import { I18nextProvider } from 'react-i18next'
import type { ReactNode } from 'react'
import i18n from './i18n'
import { router } from './router'
import { queryClient } from './query-client'
import { SettingsEffects } from './settings-effects'

export function Providers({ children }: { children?: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <SettingsEffects />
        {children}
        <RouterProvider router={router} />
      </I18nextProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  )
}
