import { afterEach, describe, expect, it } from 'vitest'
import express from 'express'
import { createServer, type Server } from 'node:http'
import { gzipSync } from 'node:zlib'
import { mkdtempSync, writeFileSync, unlinkSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseReq, z, getRawReqInput } from '../../../index'

const servers: Server[] = []

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()))
          server.closeAllConnections()
        })
    )
  )
})

describe('Express 5 request-input protection', () => {
  it('returns a client error for malformed compressed input without resetting the connection', async () => {
    const app = express()
    app.use(express.json())
    app.post('/', (req, res) => res.json({ ok: true }))
    app.use((error: any, req: any, res: any, next: any) => {
      res.status(error.status || 500).json({ error: error.type })
    })
    const server = createServer(app)
    servers.push(server)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string')
      throw new Error('Missing server address')
    const response = await fetch(`http://127.0.0.1:${address.port}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
      },
      body: 'invalid gzip',
    })
    expect(response.status).toBe(400)
  })

  it('returns 404 when a static file disappears between stat and streaming', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'overleaf-send-'))
    writeFileSync(join(directory, 'asset.txt'), 'temporary asset')
    const app = express()
    app.use(
      express.static(directory, { setHeaders: (res, path) => unlinkSync(path) })
    )
    const server = createServer(app)
    servers.push(server)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string')
      throw new Error('Missing server address')
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/asset.txt`)
      expect(response.status).toBe(404)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('validates parsed compressed input and nested router params while blocking raw reads', async () => {
    const lockdown = await import('express/lib/lockdown.js')
    lockdown.setModeForTests('throw')
    const app = express()
    app.set('query parser', 'extended')
    app.use(express.json())
    const router = express.Router({ mergeParams: true })
    router.post('/items/:item', (req, res) => {
      expect(() => req.body).toThrow('raw request input is forbidden')
      expect(() => req.query).toThrow('raw request input is forbidden')
      expect(() => req.params).toThrow('raw request input is forbidden')
      const parsed = parseReq(
        req,
        z.object({
          params: z.object({ project: z.string(), item: z.string() }),
          query: z.object({ filter: z.object({ name: z.string() }) }),
          body: z.object({ value: z.number() }),
        })
      )
      expect(getRawReqInput(req).body).toEqual({ value: 42 })
      res.json(parsed)
    })
    app.use('/projects/:project', router)
    const server = createServer(app)
    servers.push(server)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string')
      throw new Error('Missing server address')
    try {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/projects/project-1/items/item-2?filter[name]=example`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Encoding': 'gzip',
          },
          body: gzipSync(JSON.stringify({ value: 42 })),
        }
      )
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({
        params: { project: 'project-1', item: 'item-2' },
        query: { filter: { name: 'example' } },
        body: { value: 42 },
      })
    } finally {
      lockdown.setModeForTests(null)
    }
  })
})
