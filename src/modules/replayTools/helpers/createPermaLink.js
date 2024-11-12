import { parseSearch, stringifyQuery } from '../../../utils/searchQuery.js'
import { idCounterRef } from '../../../utils/objectIdDevelopment.js'


export default function settingsToHash({ ...query }, focusedModulePath) {
  if (focusedModulePath) query.mod = focusedModulePath
  return prefix + stringifyQuery(query) 
}



export const hashToSettings = () => {
  const h = typeof window !== undefined && window.location?.hash

  if (h && h.indexOf(prefix) > -1) {
    const index = h.indexOf(prefix)
    const search = h.slice(index + length)
    const { module, ...settings } = parseSearch(search) // use hash so search can still be used in userland
    
    const focusedModulePath = settings.mod ?? ''
    const status = 'ready'

    return { settings, focusedModulePath, idCounterRef, status }
  }
}


export const prefix = '#!'
const length = prefix.length


export const stripPermalinkPrefix = h => {
  if (h) {
    const index = h.indexOf(prefix)
    if (index > -1) h = h.slice(0, index)
  }

  return h[0] === '#' ? h.substr(1) : h // could be a second hash provided by user, even if we stripped prefix
}