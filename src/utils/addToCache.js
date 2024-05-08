import mergeDeep from './mergeDeep.js'


export const addToCache = (cache, docs, doc, useSlug) => {
  if (!docs && !doc) return cache

  const models = docs && doc
    ? [...docs, doc]
    : doc ? [doc] : docs

  const func = useSlug ? addToCacheSlug : addOneToCache

  return models.reduce(func, cache)
}


export const addOneToCache = (cache, doc) => {
  if (!doc) return cache
  
  const prev = cache[doc.id] || {}
  const next = Object.assign(prev, doc)

  cache[doc.id] = next
  return cache
}

export const addToCacheDeep = (cache, doc) => {
  const prev = cache[doc.id] || {}
  const next = mergeDeep(prev, doc)

  cache[doc.id] = next
  return cache
}



// for seo-oriented posts

export const addToCacheSlug = (cache, doc) => {
  if (!doc) return cache
  
  const prev = cache[doc.slug] || {}
  const next = Object.assign(prev, doc)

  cache[doc.slug] = next
  return cache
}