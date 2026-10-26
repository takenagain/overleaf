// TypeScript 7 provides the native compiler; ESLint still needs the TypeScript 6 API.
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const compiler = join(
  dirname(require.resolve('@typescript/native/package.json')),
  'lib/tsc.js'
)
await import(pathToFileURL(compiler).href)
