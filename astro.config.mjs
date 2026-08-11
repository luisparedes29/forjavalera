// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import { build as esbuild } from 'esbuild'
import { injectManifest } from 'workbox-build'
import { rm } from 'node:fs/promises'

// Integración PWA: SW propio (src/sw.ts) + precache del build compilado.
// vite-plugin-pwa no se ejecuta en el pipeline de Astro 7 (Vite 8/Rolldown),
// así que replicamos su modo injectManifest con workbox-build + esbuild
// dentro del hook astro:build:done.
function pwa() {
  return {
    name: 'forja-pwa',
    hooks: {
      'astro:build:done': async () => {
        const swBundle = 'dist/.sw.bundle.js'
        try {
          await esbuild({
            entryPoints: ['src/sw.ts'],
            bundle: true,
            format: 'iife',
            target: 'es2020',
            outfile: swBundle,
            define: { 'process.env.NODE_ENV': '"production"' },
            logLevel: 'silent'
          })
          const result = await injectManifest({
            swSrc: swBundle,
            swDest: 'dist/sw.js',
            injectionPoint: 'self.__WB_MANIFEST',
            globDirectory: 'dist',
            globPatterns: ['**/*.{js,css,html,svg,ico,webmanifest,png,woff2,json}'],
            globIgnores: ['**/.sw.bundle.js'],
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
          })
          console.log(`[forja-pwa] sw.js generado con ${result.count} archivos en precaché`)
        } catch (err) {
          console.warn('[forja-pwa] no se pudo generar el service worker:', err)
        } finally {
          await rm(swBundle, { force: true }).catch(() => {})
        }
      }
    }
  }
}

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://forja.netlify.app',
  integrations: [react(), pwa()]
})