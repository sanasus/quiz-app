// Renders scripts/og-image.svg to public/og-image.png (1200x630).
// Run via `npm run og:image`; the PNG is committed.
import sharp from 'sharp'

await sharp('scripts/og-image.svg').png().toFile('public/og-image.png')
console.log('public/og-image.png written')
