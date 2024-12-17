import mergeDeep from './mergeDeep.js'


export default (cache, docs, doc, opts) => {
  if (!docs && !doc) return cache

  const { deep, slug } = opts ?? {}
  const func = deep ? addOneToCacheDeep : slug ? addOneToCacheSlug : addOneToCache

  const models = docs && doc
    ? [...docs, doc]
    : doc ? [doc] : docs

  return models.reduce(func, cache)
}


const addOneToCache = (cache, doc) => {
  if (!doc) return cache
  const prev = cache[doc.id]
  cache[doc.id] = prev ? Object.assign(prev, doc) : doc
  return cache
}


const addOneToCacheDeep = (cache, doc) => {
  if (!doc) return cache
  const prev = cache[doc.id]
  cache[doc.id] = prev ? mergeDeep(prev, doc) : doc
  return cache
}


const addOneToCacheSlug = (cache, doc) => { // for seo posts
  if (!doc) return cache
  const prev = cache[doc.slug]
  cache[doc.slug] = prev ? Object.assign(prev, doc) : doc
  return cache
}