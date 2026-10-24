import { mkdir, readFile } from 'node:fs/promises'
import sharp from 'sharp'

const svg = await readFile('icon.svg')
await mkdir('public/icons', { recursive: true })

await sharp(svg).resize(192, 192).png().toFile('public/icons/icon-192.png')
await sharp(svg).resize(512, 512).png().toFile('public/icons/icon-512.png')
await sharp(svg).resize(180, 180).png().toFile('public/icons/apple-touch-icon-180.png')

const inner = await sharp(svg).resize(410, 410).png().toBuffer()
await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#0e1316' }
})
  .composite([{ input: inner, top: 51, left: 51 }])
  .png()
  .toFile('public/icons/icon-maskable-512.png')

console.log('[forja-icons] 4 PNG generados en public/icons')
