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
  
  const prev = cache[doc.id]

  cache[doc.id] = prev ? Object.assign(prev, doc) : doc

  return cache
}

export const addToCacheDeep = (cache, doc) => {
  const prev = cache[doc.id]

  cache[doc.id] = prev ? mergeDeep(prev, doc) : doc

  return cache
}



// for seo-oriented posts

export const addToCacheSlug = (cache, doc) => {
  if (!doc) return cache
  
  const prev = cache[doc.slug]

  cache[doc.slug] = prev ? Object.assign(prev, doc) : doc
  
  return cache
}