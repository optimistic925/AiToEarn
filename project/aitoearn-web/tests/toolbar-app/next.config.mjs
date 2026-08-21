import path from 'node:path'

// Keep the fixture isolated while resolving the real application source tree.
const config = {
  experimental: {
    externalDir: true,
  },
  webpack(webpackConfig) {
    webpackConfig.resolve.alias['@'] = path.resolve(process.cwd(), '../../src')
    return webpackConfig
  },
}

export default config
