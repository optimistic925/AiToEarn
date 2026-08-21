require.extensions['.svg'] = (module, filename) => {
  module.exports = filename
}

require.extensions['.css'] = (module) => {
  module.exports = {}
}

require.extensions['.scss'] = (module) => {
  module.exports = {}
}
