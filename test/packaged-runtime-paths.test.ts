import { createRequire } from 'node:module'
import { join } from 'node:path'
import { expect, it } from 'vitest'

const require = createRequire(import.meta.url)
type PackagedContext = {
  electronPlatformName: string
  appOutDir: string
  packager: { appInfo: { productFilename: string } }
}
const { packagedRuntimePaths } = require('../scripts/packaged-runtime-paths.cjs') as {
  packagedRuntimePaths(context: PackagedContext): { product: string; resources: string; executable: string }
}

function context(electronPlatformName: string, product = 'DSH Desktop') {
  return { electronPlatformName, appOutDir: join('/out', electronPlatformName), packager: { appInfo: { productFilename: product } } }
}

it('reaches the macOS payload through the bundle and its Node-mode Helper', () => {
  const paths = packagedRuntimePaths(context('darwin'))
  expect(paths.resources).toBe(join('/out/darwin', 'DSH Desktop.app', 'Contents', 'Resources'))
  expect(paths.executable).toBe(join('/out/darwin', 'DSH Desktop.app', 'Contents', 'Frameworks', 'DSH Desktop Helper.app', 'Contents', 'MacOS', 'DSH Desktop Helper'))
  expect(packagedRuntimePaths(context('mas')).resources).toContain('DSH Desktop.app')
})

it('reaches the Windows payload as a flat directory with an exe', () => {
  const paths = packagedRuntimePaths(context('win32'))
  expect(paths.resources).toBe(join('/out/win32', 'resources'))
  expect(paths.executable).toBe(join('/out/win32', 'DSH Desktop.exe'))
})

// Packaging a Linux target used to resolve `<product>.exe`, so every afterPack
// gate failed with "Cannot locate the packaged Electron executable" even though
// the deb itself had been written. A regression here re-breaks all three gates.
it('reaches the Linux payload as a flat directory with the extension-less executable', () => {
  const paths = packagedRuntimePaths(context('linux', 'dsh-desktop'))
  expect(paths.product).toBe('dsh-desktop')
  expect(paths.resources).toBe(join('/out/linux', 'resources'))
  expect(paths.executable).toBe(join('/out/linux', 'dsh-desktop'))
  expect(paths.executable.endsWith('.exe')).toBe(false)
})
