import * as qs from 'qs'
import { parseSearch } from '../../../utils/searchQuery.js'
import { defaultOrigin } from '../../../utils/constants.js'



export default (state, replays) => {
  const { path = '/', ...settings } = state.form
  const hash = settingsToHash(settings, replays.config)

  return {
    relativeUrl: path + hash,
    url: defaultOrigin + path + hash
  }
}


const settingsToHash = (settings, config) => {
  const query = {}

  Object.keys(settings).forEach(k => {
    const v = settings[k]
    const out = config[k]?.transformOut
    query[k] = out ? out(v) : v
  })

  return prefix + qs.stringify(query) 
}



export const hashToSettings = () => {
  const h = typeof window !== undefined && window.location?.hash

  if (h?.indexOf(prefix) > -1) {
    const index = h.indexOf(prefix)
    const search = h.slice(index + length)
    return parseSearch(search) // use hash so search can still be used in userland
  }
}


export const prefix = '#respond:'
const length = prefix.length


export const stripPermalinkPrefix = h => {
  h = h[0] === '#' ? h.substr(1) : h
  const index = h.indexOf(prefix)
  return index === -1 ? h : h.slice(0, index)
}