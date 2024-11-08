import * as qs from 'qs'
import { parseSearch } from '../../../utils/searchQuery.js'
import { defaultOrigin } from '../../../utils/constants.js'
import { idCounterRef } from '../../../utils/objectIdDevelopment.js'


export default state => {
  const { path = '/' } = state.formRespond
  const hash = settingsToHash(state.form, replays.config, state.focusedModulePath)

  return {
    relativeUrl: path + hash,
    url: defaultOrigin + path + hash
  }
}


const settingsToHash = (settings, config, focusedModulePath) => {
  const query = {}

  Object.keys(settings).forEach(k => {
    const v = settings[k]
    const out = config[k]?.transformOut
    query[k] = out ? out(v) : v
  })

  if (focusedModulePath) query.module = focusedModulePath

  return prefix + qs.stringify(query) 
}



export const hashToSettings = () => {
  const h = typeof window !== undefined && window.location?.hash

  if (h && h.indexOf(prefix) > -1) {
    const index = h.indexOf(prefix)
    const search = h.slice(index + length)
    const { module, ...settings } = parseSearch(search) // use hash so search can still be used in userland
    
    return { settings, focusedModulePath: settings.module ?? '', idCounterRef, status: 'ready' }
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