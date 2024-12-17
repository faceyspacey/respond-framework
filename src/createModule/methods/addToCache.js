import mergeDeep from '../../utils/mergeDeep.js'


export default (cache, docs, doc, opts) => {
  if (!docs && !doc) return cache

  const { deep, slug } = opts ?? {}
  const func = deep ? addToCacheDeep : slug ? addToCacheSlug : addToCache

  const models = docs && doc
    ? [...docs, doc]
    : doc ? [doc] : docs

  return models.reduce(func, cache)
}


const addToCache = (cache, doc) => {
  if (!doc) return cache
  const prev = cache[doc.id]
  cache[doc.id] = prev ? Object.assign(prev, doc) : doc
  return cache
}


const addToCacheDeep = (cache, doc) => {
  if (!doc) return cache
  const prev = cache[doc.id]
  cache[doc.id] = prev ? mergeDeep(prev, doc) : doc
  return cache
}


const addToCacheSlug = (cache, doc) => { // for seo posts
  if (!doc) return cache
  const prev = cache[doc.slug]
  cache[doc.slug] = prev ? Object.assign(prev, doc) : doc
  return cache
}