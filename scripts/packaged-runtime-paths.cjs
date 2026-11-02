const path = require('node:path')

/**
 * Locate the packaged runtime for the platform electron-builder is targeting.
 *
 * Hooks used to infer this from `process.platform` (the build host) and always
 * append `.exe` off-macOS, which silently pointed Linux builds at the macOS
 * Helper or a non-existent `DSH Desktop.exe`. `context.electronPlatformName` is
 * the target, and Linux keeps the plain Electron binary name without an
 * extension, so the three target-specific shapes live here instead.
 */
function packagedRuntimePaths(context) {
  const product = context.packager.appInfo.productFilename
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName === 'darwin' || electronPlatformName === 'mas') {
    const contents = path.join(appOutDir, `${product}.app`, 'Contents')
    return {
      product,
      resources: path.join(contents, 'Resources'),
      executable: path.join(contents, 'Frameworks', `${product} Helper.app`, 'Contents', 'MacOS', `${product} Helper`)
    }
  }
  if (electronPlatformName === 'win32') {
    return {
      product,
      resources: path.join(appOutDir, 'resources'),
      executable: path.join(appOutDir, `${product}.exe`)
    }
  }
  // Linux packages the executable as `executableName` (dsh-desktop) beside resources/.
  return {
    product,
    resources: path.join(appOutDir, 'resources'),
    executable: path.join(appOutDir, product)
  }
}

module.exports = { packagedRuntimePaths }
