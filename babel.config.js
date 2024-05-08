module.exports = function(api) {
  api.cache(true)
  api.assertVersion('^7.21')

  return {
    presets: [
      ['@babel/preset-env', {
        targets: 'last 2 Chrome versions'
      }],
      '@babel/preset-react',
    ],
    plugins: [
      // '@babel/plugin-proposal-export-default-from',
      '@babel/plugin-transform-export-namespace-from',
      ['@babel/plugin-transform-modules-commonjs', {
        importInterop: 'none'
      }],
      'transform-export-default-name',
      ['./src/babel/babel-plugin-respond.js', {
        directories: ['App', 'components', 'pages'],
        package: 'respond-framework'
      }],
    ]
  }
}
