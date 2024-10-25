import { replacer, createReviver } from '../utils/revive.js'
import { defaultOrigin } from '../utils/constants.js'
import fetchWithTimeout from './fetchWithTimeout.js'


export default async (apiUrl = defaultApiUrl, body = {}, state, useCache) => { 
  const { controller, method, modulePath } = body
  
  const url = `${apiUrl}/${controller}/${method}`
  const args = argsIn(body.args)

  if (useCache) {
    const cached = state.apiCache.get(body)
    if (cached) return JSON.parse(cached, createReviver(state, modulePath))
  }

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    body: JSON.stringify({ ...body, args }, replacer),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  })

  const text = await res.text()
  if (useCache) state.apiCache.set(body, text)
  return JSON.parse(text, createReviver(state, modulePath))
}


const defaultApiUrl = defaultOrigin + '/api'


export const argsIn = args =>
  args.map(a => a === undefined ? '__undefined__' : a) // undefined becomes null when stringified, but controller functions may depend on undefined args and default parameters, so we convert this back to undefined server side

export const argsOut = args =>
  args.map(a => a === '__undefined__' ? undefined : a)