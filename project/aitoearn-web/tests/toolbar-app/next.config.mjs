import path from 'node:path'
import { fileURLToPath } from 'node:url'

const fixtureDir = path.dirname(fileURLToPath(import.meta.url))
const sourceDir = path.resolve(fixtureDir, '../../src')

// Keep the fixture isolated while resolving the real application source tree.
const config = {
  experimental: {
    externalDir: true,
  },
  webpack(webpackConfig) {
    webpackConfig.resolve.alias['@'] = sourceDir
    return webpackConfig
  },
}

export default config
