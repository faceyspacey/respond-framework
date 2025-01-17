import mergeDeep from '../../utils/mergeDeep.js'


export default (cache, doc, docs, opts) => {
  if (!doc && !docs) return cache

  const { deep, slug } = opts ?? {}
  const func = deep ? addToCacheDeep : slug ? addToCacheSlug : addToCache

  const models = []

  if (doc) {
    if (Array.isArray(doc)) models.push(...doc)    // allow passing array first
    else models.push(doc)
  }

  if (docs) {
    if (Array.isArray(docs)) models.push(...docs)
    else models.push(docs)                         // allow passing single doc second
  }

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