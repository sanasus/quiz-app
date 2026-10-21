import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config'

// The logo is full-bleed with the mark inside the maskable safe zone,
// so the platform masks need no extra padding.
const BG = '#6c5ce7'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    maskable: {
      ...preset.maskable,
      padding: 0,
      resizeOptions: { background: BG },
    },
    apple: { ...preset.apple, padding: 0, resizeOptions: { background: BG } },
  },
  images: ['public/logo.svg'],
})
