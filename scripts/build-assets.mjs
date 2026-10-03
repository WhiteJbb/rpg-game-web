// art/<kind>/*.png -> src/assets/<kind>/<id>.webp   (run: node scripts/build-assets.mjs)
import { mkdir, readdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import sharp from 'sharp'

const root = new URL('..', import.meta.url).pathname
const sprite = (size) => (img) =>
  img.trim().resize(size, size, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85, alphaQuality: 90 })
const kinds = {
  backgrounds: (img) => img.resize({ width: 1536 }).webp({ quality: 80 }),
  monsters: sprite(768),
  buildings: sprite(768),
  characters: sprite(768),
  items: sprite(256),
}

let count = 0
for (const [kind, convert] of Object.entries(kinds)) {
  const src = join(root, 'art', kind)
  const files = await readdir(src).catch(() => [])
  const out = join(root, 'src/assets', kind)
  await mkdir(out, { recursive: true })
  for (const f of files.filter((f) => f.endsWith('.png'))) {
    await convert(sharp(join(src, f))).toFile(join(out, basename(f, '.png') + '.webp'))
    count++
  }
}
console.log(`converted ${count} images`)
