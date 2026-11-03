import { createRequire } from 'node:module'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

const require = createRequire(import.meta.url)
const { parsePatchFile } = require('patch-package/dist/patch/parse') as {
  parsePatchFile: (file: string) => unknown
}

describe('patch hunk counts', () => {
  it('keeps every patch-package file parseable so Windows postinstall can apply them', async () => {
    const patchesDir = path.join(projectRoot, 'patches')
    const names = (await readdir(patchesDir)).filter((name) => name.endsWith('.patch'))
    expect(names.length).toBeGreaterThan(0)

    const errors: string[] = []
    for (const name of names) {
      const content = await readFile(path.join(patchesDir, name), 'utf8')
      try {
        parsePatchFile(content)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`${name}: ${message}`)
      }
    }

    expect(errors).toEqual([])
  })

  it('keeps image generation and the log bridge in the dsh package.json patch', async () => {
    const patch = await readFile(patchPath('@deepseek-ai/dsh'), 'utf8')
    expect(patch).toContain('+    "dsh-image-generation": "0.1.0"')
    expect(patch).toContain('+    "dsh-desktop-log-bridge": "0.1.0",')
  })

  // Linux only reaches the WASM engine when the installed-package probe can
  // tell "absent" from "present". Electron's asar fs answers a missing entry
  // with null, which the upstream `!== void 0` check read as installed, so the
  // packaged PPT preview and Office CLI both failed with "package is incomplete".
  // The behavior itself is covered by the afterPack gates on a Linux runner;
  // this contract keeps the hunk from being dropped on an upstream refresh
  // before that same fix lands there.
  it('keeps the null-safe Linux engine probe in the libreoffice-kit patch', async () => {
    const patch = await readFile(patchPath('@deepseek-ai/libreoffice-kit'), 'utf8')
    // The app loads lib/index.js while resources/office-cli.mjs loads lib/cli.js.
    for (const file of ['lib/index.js', 'lib/cli.js']) {
      expect(patch, file).toContain(`diff --git a/node_modules/@deepseek-ai/libreoffice-kit/${file}`)
    }
    expect(patch).toContain('return entry !== void 0 && entry !== null;')
    expect(patch.match(/function installedPackageExists\(name\) \{/g)).toHaveLength(2)
  })

  it('rejects a dsh hunk header that undercounts the merged dependency lines', async () => {
    const patch = await readFile(patchPath('@deepseek-ai/dsh'), 'utf8')
    const manifestStart = patch.indexOf('diff --git a/node_modules/@deepseek-ai/dsh/package.json')
    expect(manifestStart).toBeGreaterThanOrEqual(0)
    const broken = patch.slice(0, manifestStart) + patch.slice(manifestStart).replace(
      /(@@ -\d+,\d+ \+\d+,)(\d+)( @@)/,
      (_header: string, prefix: string, count: string, suffix: string) =>
        `${prefix}${Number(count) - 1}${suffix}`
    )
    expect(broken).not.toBe(patch)
    expect(() => parsePatchFile(broken)).toThrow(/hunk header integrity check failed/)
  })
})
