// Playwright executes these focused production imports in Node, outside Next's asset loaders.
require.extensions['.svg'] = (module, filename) => {
  module.exports = filename
}

require.extensions['.css'] = (module) => {
  module.exports = {}
}

require.extensions['.scss'] = (module) => {
  module.exports = {}
}
