module.exports = {
  compact: false,
  presets: [
    [
      '@babel/env',
      {
        exclude: [
          // Exclude objectSpread polyfill, as it's not needed and affects performance
          '@babel/plugin-transform-object-rest-spread',
          // Exclude _defineProperty polyfill, as it causes a bug without the objectSpread polyfill
          '@babel/plugin-transform-computed-properties',
          // Use native async functions, for performance
          '@babel/plugin-transform-async-to-generator',
          // Use native generators, for performance
          '@babel/plugin-transform-regenerator',
          // Use native async generators, for performance
          '@babel/plugin-transform-async-generator-functions',
          // Use native for-of loops, for performance
          '@babel/plugin-transform-for-of',
        ],
      },
    ],
    ['@babel/typescript', { onlyRemoveTypeImports: false }],
  ],
  plugins: [
    'macros',
    [
      'polyfill-corejs3',
      { method: 'usage-global', version: '3.51', exclude: ['es.array.push'] },
    ],
  ],
  overrides: [
    {
      test: /\.(?:jsx?|tsx)$/,
      presets: [['@babel/react', { runtime: 'automatic' }]],
    },
    // treat .cjs files (e.g. libraries symlinked into node_modules) as commonjs
    { test: /\.cjs$/, sourceType: 'script' },
    {
      // Use [\\/] for cross-platform path separator compatibility
      test: /[\\/]libraries[\\/]overleaf-editor-core[\\/].*\.js$/,
      sourceType: 'script',
    },
  ],
}
