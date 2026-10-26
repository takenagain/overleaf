const { expect } = require('chai')
const sinon = require('sinon')
const { createSessionStoreClient } = require('../../../index.js')

describe('session store Redis client adapter', function () {
  it('translates session expiration and conditional writes to ioredis arguments', async function () {
    const client = { set: sinon.stub().resolves('OK') }
    const adapter = createSessionStoreClient(client)
    await adapter.set('sess:id', '{}', {
      expiration: { type: 'EX', value: 60 },
      condition: 'NX',
    })
    expect(
      client.set.calledOnceWithExactly('sess:id', '{}', 'EX', 60, 'NX')
    ).to.equal(true)
  })

  it('passes through unconditional writes and reads', async function () {
    const client = {
      set: sinon.stub().resolves('OK'),
      get: sinon.stub().resolves('{}'),
      mget: sinon.stub().resolves(['{}']),
      del: sinon.stub().resolves(1),
      expire: sinon.stub().resolves(1),
    }
    const adapter = createSessionStoreClient(client)
    await adapter.set('sess:id', '{}')
    expect(await adapter.get('sess:id')).to.equal('{}')
    expect(await adapter.mGet(['sess:id'])).to.deep.equal(['{}'])
    await adapter.del(['sess:id'])
    await adapter.expire('sess:id', 60)
    expect(client.set.calledOnceWithExactly('sess:id', '{}')).to.equal(true)
    expect(client.mget.calledOnceWithExactly(['sess:id'])).to.equal(true)
    expect(client.del.calledOnceWithExactly(['sess:id'])).to.equal(true)
    expect(client.expire.calledOnceWithExactly('sess:id', 60)).to.equal(true)
  })

  it('scans batches until the cursor returns to zero', async function () {
    const client = { scan: sinon.stub() }
    client.scan.onFirstCall().resolves(['12', ['sess:a']])
    client.scan.onSecondCall().resolves(['0', ['sess:b']])
    const batches = []
    for await (const keys of createSessionStoreClient(client).scanIterator({
      MATCH: 'sess:*',
      COUNT: 100,
    })) {
      batches.push(keys)
    }
    expect(batches).to.deep.equal([['sess:a'], ['sess:b']])
    expect(client.scan.firstCall.args).to.deep.equal([
      '0',
      'MATCH',
      'sess:*',
      'COUNT',
      100,
    ])
    expect(client.scan.secondCall.args[0]).to.equal('12')
  })

  it('scans each cluster master without routing SCAN to a random node', async function () {
    const masters = [
      { scan: sinon.stub().resolves(['0', ['sess:a']]) },
      { scan: sinon.stub().resolves(['0', ['sess:b']]) },
    ]
    const client = { nodes: sinon.stub().withArgs('master').returns(masters) }
    const batches = []
    for await (const keys of createSessionStoreClient(client).scanIterator({
      MATCH: 'sess:*',
      COUNT: 100,
    })) {
      batches.push(keys)
    }
    expect(batches).to.deep.equal([['sess:a'], ['sess:b']])
  })
})
