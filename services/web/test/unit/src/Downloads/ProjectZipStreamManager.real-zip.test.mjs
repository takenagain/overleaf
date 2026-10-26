import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Readable } from 'node:stream'
import yauzl from 'yauzl'

async function readZip(buffer) {
  const zip = await new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, (error, zip) =>
      error ? reject(error) : resolve(zip)
    )
  })
  return new Promise((resolve, reject) => {
    const entries = []
    zip.on('error', reject)
    zip.on('entry', entry => {
      entries.push(
        new Promise((resolve, reject) => {
          zip.openReadStream(entry, async (error, stream) => {
            if (error) return reject(error)
            try {
              const chunks = []
              for await (const chunk of stream) chunks.push(chunk)
              resolve([entry.fileName, Buffer.concat(chunks)])
            } catch (error) {
              reject(error)
            }
          })
        })
      )
    })
    zip.on('end', () =>
      Promise.all(entries).then(
        values => resolve(Object.fromEntries(values)),
        reject
      )
    )
  })
}

async function collect(stream) {
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

describe('ProjectZipStreamManager with real archiver', () => {
  let manager
  beforeEach(async () => {
    vi.doUnmock('archiver')
    vi.doMock(
      '../../../../app/src/Features/Project/ProjectEntityHandler.mjs',
      () => ({
        default: {
          getAllDocs: (_id, callback) =>
            callback(null, {
              '/main.tex': { lines: ['first line', 'second line'] },
            }),
          getAllFiles: (_id, callback) =>
            callback(null, { '/figures/plot.bin': { hash: 'blob-hash' } }),
        },
      })
    )
    vi.doMock('../../../../app/src/Features/Project/ProjectGetter.mjs', () => ({
      default: {
        getProject: (id, _fields, callback) =>
          callback(null, { name: id, overleaf: { history: { id } } }),
      },
    }))
    vi.doMock(
      '../../../../app/src/Features/History/HistoryManager.mjs',
      () => ({
        default: {
          requestBlobWithProjectId: (_id, _hash, callback) =>
            callback(null, {
              stream: Readable.from([Buffer.from([0, 1, 127, 255])]),
            }),
        },
      })
    )
    manager = (
      await import('../../../../app/src/Features/Downloads/ProjectZipStreamManager.mjs')
    ).default
  })

  it('writes document text and streamed binary files into a readable ZIP', async () => {
    const stream = await new Promise((resolve, reject) => {
      manager.createZipStreamForProject(
        'project',
        false,
        null,
        (error, stream) => (error ? reject(error) : resolve(stream))
      )
    })
    const files = await readZip(await collect(stream))
    expect(Object.keys(files).sort()).to.deep.equal([
      'figures/plot.bin',
      'main.tex',
    ])
    expect(files['main.tex'].toString()).to.equal('first line\nsecond line')
    expect(files['figures/plot.bin']).to.deep.equal(
      Buffer.from([0, 1, 127, 255])
    )
  })

  it('finalizes nested project ZIPs before completing the outer archive', async () => {
    const stream = await new Promise((resolve, reject) => {
      manager.createZipStreamForMultipleProjects(
        ['alpha', 'beta'],
        false,
        (error, stream) => (error ? reject(error) : resolve(stream))
      )
    })
    const projects = await readZip(await collect(stream))
    expect(Object.keys(projects).sort()).to.deep.equal([
      'alpha.zip',
      'beta.zip',
    ])
    for (const buffer of Object.values(projects)) {
      const files = await readZip(buffer)
      expect(files['main.tex'].toString()).to.equal('first line\nsecond line')
      expect(files['figures/plot.bin']).to.deep.equal(
        Buffer.from([0, 1, 127, 255])
      )
    }
  })
})
