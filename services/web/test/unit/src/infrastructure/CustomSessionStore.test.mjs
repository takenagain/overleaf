import { beforeEach, describe, expect, it, vi } from 'vitest'
import sinon from 'sinon'

describe('CustomSessionStore', function () {
  beforeEach(async function (ctx) {
    vi.doMock('@overleaf/settings', () => ({
      default: { cookieName: 'session' },
    }))
    vi.doMock(
      '../../../../app/src/Features/Authentication/SessionManager.mjs',
      () => ({
        default: { isUserLoggedIn: () => false },
      })
    )
    const { default: CustomSessionStore } =
      await import('../../../../app/src/infrastructure/CustomSessionStore.mjs')
    ctx.client = {
      set: sinon.stub().resolves('OK'),
      get: sinon.stub(),
      del: sinon.stub().resolves(1),
      expire: sinon.stub().resolves(1),
    }
    ctx.store = new CustomSessionStore({ client: ctx.client })
    ctx.session = { cookie: {} }
    Object.defineProperty(ctx.session, 'req', {
      value: { signedCookies: { session: 'original' } },
    })
    ctx.set = sid =>
      new Promise((resolve, reject) => {
        ctx.store.set(sid, ctx.session, err => (err ? reject(err) : resolve()))
      })
  })

  it('uses NX for a new session and XX for subsequent writes of that id', async function (ctx) {
    await ctx.set('new-id')
    await ctx.set('new-id')
    expect(ctx.client.set.firstCall.args).to.deep.equal([
      'sess:new-id',
      JSON.stringify(ctx.session),
      'EX',
      86400,
      'NX',
    ])
    expect(ctx.client.set.secondCall.args.at(-1)).to.equal('XX')
    expect(ctx.session.validationToken).to.equal('v1:w-id')
  })

  it('uses XX for an existing signed session', async function (ctx) {
    await ctx.set('original')
    expect(ctx.client.set.firstCall.args.at(-1)).to.equal('XX')
  })

  it('propagates conditional write errors to express-session', async function (ctx) {
    const error = new Error('Redis write failed')
    ctx.client.set.rejects(error)
    await expect(ctx.set('new-id')).to.be.rejectedWith(error)
  })

  it('deletes expired sessions through the conditional store', async function (ctx) {
    ctx.session.cookie.expires = new Date(Date.now() - 10000)
    await ctx.set('new-id')
    expect(ctx.client.set).not.to.have.been.called
    expect(ctx.client.del).to.have.been.calledWith(['sess:new-id'])
  })

  it('checks validation tokens after reading sessions', async function (ctx) {
    ctx.client.get.resolves(
      JSON.stringify({ validationToken: 'v1:inal', cookie: {} })
    )
    const sess = await new Promise((resolve, reject) => {
      ctx.store.get('original', (err, value) =>
        err ? reject(err) : resolve(value)
      )
    })
    expect(sess.validationToken).to.equal('v1:inal')
    ctx.client.get.resolves(
      JSON.stringify({ validationToken: 'v1:wrong', cookie: {} })
    )
    const invalid = await new Promise((resolve, reject) => {
      ctx.store.get('original', (err, value) =>
        err ? reject(err) : resolve(value)
      )
    })
    expect(invalid).to.equal(null)
  })
})
