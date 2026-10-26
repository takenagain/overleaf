import { describe, expect, it } from 'vitest'
import { generateKeyPairSync } from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})
const signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
const canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#'
const transforms = [
  'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
  canonicalizationAlgorithm,
]
const digestAlgorithm = 'http://www.w3.org/2001/04/xmlenc#sha256'

describe('SAML XML parser compatibility', () => {
  it('loads the complete protocol implementation with the current XML parser', () => {
    expect(require('samlp').auth).toBeTypeOf('function')
  })

  for (const legacy of [false, true]) {
    it(`verifies authentic signatures and rejects tampering with ${legacy ? 'the protocol dependency' : 'the current XML crypto API'}`, () => {
      // Exercise both the current API and the version required internally by SAML.
      const load = legacy ? createRequire(require.resolve('samlp')) : require
      const { SignedXml } = load('xml-crypto')
      const signer = legacy
        ? new SignedXml()
        : new SignedXml({
            privateKey,
            signatureAlgorithm,
            canonicalizationAlgorithm,
          })
      if (legacy) {
        signer.signingKey = privateKey
        signer.signatureAlgorithm = signatureAlgorithm
        signer.addReference(
          "//*[local-name(.)='data']",
          transforms,
          digestAlgorithm
        )
      } else {
        signer.addReference({
          xpath: "//*[local-name(.)='data']",
          transforms,
          digestAlgorithm,
        })
      }
      signer.computeSignature('<data>trusted</data>')
      const signed = signer.getSignedXml()
      const verify = (xml) => {
        const verifier = legacy
          ? new SignedXml()
          : new SignedXml({
              publicCert: publicKey,
              getCertFromKeyInfo: () => null,
            })
        if (legacy) verifier.keyInfoProvider = { getKey: () => publicKey }
        verifier.loadSignature(signer.getSignatureXml())
        return verifier.checkSignature(xml)
      }
      expect(verify(signed)).toBe(true)
      expect(verify(signed.replace('trusted', 'tampered'))).toBe(false)
    })
  }
})
