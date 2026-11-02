const verifyPackagedPptRuntime = require('./verify-packaged-ppt-runtime.cjs')
const { afterPack: verifyOfficeRuntime } = require('./verify-office-runtime.cjs')
const { verifyAsarUnpack } = require('./verify-asar-unpack.cjs')
const { verifyPackagedHarness } = require('./verify-packaged-harness.cjs')
const { packagedRuntimePaths } = require('./packaged-runtime-paths.cjs')

/** electron-builder afterPack: package-content gates run before signing. */
module.exports = async function afterPack(context) {
  const { resources } = packagedRuntimePaths(context)
  verifyAsarUnpack(resources)
  await verifyPackagedHarness(context)
  await verifyPackagedPptRuntime(context)
  await verifyOfficeRuntime(context)
}
