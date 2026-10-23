// Shows a library path the way a shell would: forward slashes, home folder as "~".
export function tildePath(path: string, home?: string): string {
  const clean = (p: string) => p.replace(/\\/g, '/').replace(/(.)\/+$/, '$1')
  const p = clean(path)
  if (!home) return p
  const h = clean(home)
  // Windows paths are case-insensitive
  return (p + '/').toLowerCase().startsWith(h.toLowerCase() + '/')
    ? '~' + p.slice(h.length)
    : p
}
