import { compile } from 'path-to-regexp'


const cache = {}

export default getStore => e => {
  const { path } = e.event || {}
  if (!path) return null

  const toPath = cache[path] = cache[path] || compile(path)
  const { basename = '' } = getStore().state

  let url

  if (e.event.toUrl) {
    const pathSearchHash = e.event.toUrl?.(getStore(), e)
    url = `${basename}${pathSearchHash}`
  }

  try {
    const pathname = toPath(e.arg, { encode: x => x })
    url = `${basename}${pathname}`
  }
  catch (error) {
    throw new Error(`event.path "${path}" for event "${e.type}" received incompatible e.arg.`)
  }

  return urlToLocation(url)
}


const urlToLocation = url => {
  const { pathname, search, hash } = new URL(url, 'http://site.com')

  return {
    url,
    pathname,
    search: search.substring(1),
    hash: hash.substring(1)
  }
}