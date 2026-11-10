// Match a configured origin exactly, allowing the supported wildcard subdomain.
export default function createOriginPattern(allowedOrigin) {
  return new RegExp(
    `^${allowedOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('://\\*', '://[^.]+')}$`
  )
}
