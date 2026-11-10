import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'vitest'
import createOriginPattern from '../../../app/js/OriginPattern.js'

const require = createRequire(import.meta.url)
const Socket = require('socket.io/lib/socket')
const settingsFile = fileURLToPath(
  new URL('../../../../../server-ce/config/settings.js', import.meta.url)
)

function allowedCorsOrigins(siteUrl, explicitOrigins) {
  const env = { ...process.env }
  delete env.OVERLEAF_SITE_URL
  delete env.REAL_TIME_ALLOWED_CORS_ORIGINS
  if (siteUrl) env.OVERLEAF_SITE_URL = siteUrl
  if (explicitOrigins) env.REAL_TIME_ALLOWED_CORS_ORIGINS = explicitOrigins
  const output = execFileSync(
    process.execPath,
    [
      '-e',
      'process.stdout.write(JSON.stringify({ origins: require(process.argv[1]).allowedCorsOrigins }))',
      settingsFile,
    ],
    { env, encoding: 'utf8' }
  )
  return JSON.parse(output).origins
}

describe('shipped Socket.IO dependency security', function () {
  it('defaults CE CORS to the public site origin, including subpath deployments', function () {
    assert.equal(
      allowedCorsOrigins('https://overleaf.example:443/overleaf'),
      'https://overleaf.example'
    )
    assert.equal(allowedCorsOrigins(), 'http://localhost')
    assert.equal(
      allowedCorsOrigins('http://[::1]:3000/overleaf'),
      'http://[::1]:3000'
    )
  })

  it('preserves explicitly configured wildcard origins', function () {
    assert.equal(
      allowedCorsOrigins('https://overleaf.example', 'https://*.example'),
      'https://*.example'
    )
  })

  it('rejects different HTTP ports, protocols and host suffixes', function () {
    const pattern = createOriginPattern('http://localhost')
    assert.equal(pattern.test('http://localhost'), true)
    for (const origin of [
      'http://localhost:443',
      'https://localhost',
      'http://localhost.attacker.test',
    ]) {
      assert.equal(pattern.test(URL.parse(origin).origin), false, origin)
    }
  })

  it('matches IPv6 and normalized default HTTPS ports literally', function () {
    assert.equal(
      createOriginPattern('http://[::1]:3000').test('http://[::1]:3000'),
      true
    )
    assert.equal(
      createOriginPattern('http://[::1]:3000').test('http://[::2]:3000'),
      false
    )
    assert.equal(
      createOriginPattern('https://overleaf.example').test(
        URL.parse('https://overleaf.example:443').origin
      ),
      true
    )
  })

  it('preserves a single wildcard subdomain without treating other text as regex', function () {
    const pattern = createOriginPattern('https://*.overleaf.example')
    assert.equal(pattern.test('https://team.overleaf.example'), true)
    assert.equal(pattern.test('https://teamXoverleaf.example'), false)
    assert.equal(pattern.test('https://nested.team.overleaf.example'), false)
    assert.equal(
      pattern.test('https://team.overleaf.example.attacker.test'),
      false
    )
  })

  it('has the fork default error listener before application listeners attach', function () {
    const socket = new Socket({ store: { client: () => ({}) } }, 'test-id', {})
    assert.ok(socket.listenerCount('error') > 0)
    assert.doesNotThrow(() =>
      EventEmitter.prototype.emit.call(
        socket,
        'error',
        new Error('invalid packet')
      )
    )
  })
})
