import { describe, expect, it, vi } from 'vitest'
import OAuth2Strategy from 'passport-oauth2'

function request(query, body, locked) {
  const req = { headers: { host: 'localhost' }, url: '/callback', query, body }
  if (locked) {
    req[Symbol.for('overleaf.lockdown.installed')] = true
    for (const [field, value] of Object.entries({ query, body })) {
      req[
        Symbol.for(
          `overleaf.lockdown.raw${field === 'query' ? 'Query' : 'Body'}`
        )
      ] = value
      Object.defineProperty(req, field, {
        get() {
          throw new Error(`Forbidden raw ${field}`)
        },
      })
    }
  }
  return req
}

for (const locked of [false, true]) {
  describe(`OAuth protocol compatibility with request lockdown ${locked ? 'on' : 'off'}`, () => {
    for (const flow of ['redirect', 'query callback', 'body callback']) {
      it(`handles ${flow}`, async () => {
        const strategy = new OAuth2Strategy(
          {
            authorizationURL: 'https://provider.example/authorize',
            tokenURL: 'https://provider.example/token',
            clientID: 'test-client',
            clientSecret: 'test-secret',
            callbackURL: 'http://localhost/callback',
            skipUserProfile: true,
          },
          (access, refresh, profile, done) => done(null, { id: 'test-user' })
        )
        // Substitute only the external token provider, keeping the actual strategy code.
        strategy._oauth2.getOAuthAccessToken = vi.fn((code, options, done) => {
          expect(code).toBe('test-code')
          done(null, 'test-access', 'test-refresh', {})
        })
        const query = flow === 'query callback' ? { code: 'test-code' } : {}
        const body = flow === 'body callback' ? { code: 'test-code' } : {}
        const outcome = await new Promise((resolve, reject) => {
          strategy.redirect = (url) => resolve({ redirect: url })
          strategy.success = (user) => resolve({ user })
          strategy.fail = (reason) => reject(new Error(JSON.stringify(reason)))
          strategy.error = reject
          strategy.authenticate(request(query, body, locked))
        })
        if (flow === 'redirect') {
          const url = new URL(outcome.redirect)
          expect(url.origin).toBe('https://provider.example')
          expect(url.searchParams.get('client_id')).toBe('test-client')
        } else {
          expect(outcome.user).toEqual({ id: 'test-user' })
          expect(strategy._oauth2.getOAuthAccessToken).toHaveBeenCalledOnce()
        }
      })
    }
  })
}
