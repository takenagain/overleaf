import { it as test } from 'vitest'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const scannerRequire = createRequire(require.resolve('i18next-scanner'))
const merge = scannerRequire('deepmerge')
const csurf = require('csurf')
const cookie = require('cookie')

const malicious = () => JSON.parse('{"__proto__":{"injected":true}}')
for (const [name, mergeValue] of [
  ['null prototype target', () => merge(Object.create(null), malicious())],
  [
    'nested null target',
    () => merge({ nested: null }, { nested: malicious() }).nested,
  ],
  ['own target key', () => merge(malicious(), {})],
  ['array element', () => merge([], [malicious()])[0]],
]) {
  test(`deepmerge blocks prototype poisoning through ${name}`, () => {
    const output = mergeValue()
    assert.equal(output.injected, undefined)
    assert.equal(Object.getPrototypeOf(output), Object.prototype)
    assert.equal(Object.prototype.injected, undefined)
  })
}
test('deepmerge retains custom array merge, nested values and inputs', () => {
  const target = { items: ['old'], nested: { left: 1 } }
  const source = { items: ['new'], nested: { right: 2 } }
  assert.deepEqual(
    merge(target, source, { arrayMerge: (_target, values) => values }),
    {
      items: ['new'],
      nested: { left: 1, right: 2 },
    }
  )
  assert.deepEqual(target, { items: ['old'], nested: { left: 1 } })
  assert.deepEqual(source, { items: ['new'], nested: { right: 2 } })
})
function run(
  middleware,
  request,
  response = {
    headers: {},
    getHeader(name) {
      return this.headers[name]
    },
    setHeader(name, value) {
      this.headers[name] = value
    },
  }
) {
  return new Promise((resolve, reject) =>
    middleware(request, response, (error) =>
      error ? reject(error) : resolve(response)
    )
  )
}
test('csurf cookie mode roundtrips cookie2 and rejects invalid or missing tokens', async () => {
  const middleware = csurf({
    cookie: { httpOnly: true, secure: true, sameSite: 'strict', path: '/' },
  })
  const request = { method: 'GET', headers: {}, cookies: {} }
  const response = await run(middleware, request)
  const header = response.getHeader('set-cookie')[0]
  assert.match(header, /HttpOnly/)
  assert.match(header, /Secure/)
  assert.match(header, /SameSite=Strict/)
  const cookies = cookie.parseCookie(header.split(';')[0])
  const valid = {
    method: 'POST',
    headers: { 'x-csrf-token': request.csrfToken() },
    cookies,
  }
  await run(middleware, valid)
  for (const headers of [{}, { 'x-csrf-token': 'forged-token' }]) {
    await assert.rejects(
      run(middleware, { method: 'POST', headers, cookies }),
      { code: 'EBADCSRFTOKEN' }
    )
  }
})
test('csurf session mode roundtrips valid tokens and rejects missing tokens', async () => {
  const middleware = csurf()
  const session = {}
  const request = { method: 'GET', headers: {}, session }
  await run(middleware, request)
  await run(middleware, {
    method: 'POST',
    headers: { 'x-csrf-token': request.csrfToken() },
    session,
  })
  await assert.rejects(
    run(middleware, { method: 'POST', headers: {}, session }),
    { code: 'EBADCSRFTOKEN' }
  )
})

const normalizeModuleOptions =
  require('babel-plugin-module-resolver/lib/normalizeOptions').default
test('module resolver retains literal and glob root directories with glob14', () => {
  assert.deepEqual(
    normalizeModuleOptions(import.meta.filename, { root: ['.'] }).root,
    [process.cwd()]
  )
  const roots = normalizeModuleOptions(import.meta.filename, {
    root: ['./frontend/*'],
  }).root
  assert.ok(roots.includes(`${process.cwd()}/frontend/js`))
})
