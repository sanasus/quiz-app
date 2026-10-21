// Stand-in for vite-plugin-pwa's virtual module in unit tests (the real
// one only exists inside a vite build). Tests mock it with vi.mock.
export function useRegisterSW(): never {
  throw new Error('useRegisterSW must be mocked in unit tests')
}
