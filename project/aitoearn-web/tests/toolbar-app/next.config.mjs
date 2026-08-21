import path from 'node:path'

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
