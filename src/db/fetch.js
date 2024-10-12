import { replacer, createReviver } from '../utils/revive.js'
import fetchWithTimeout from './fetchWithTimeout.js'


export default async (context = {}, apiUrl = defaultApiUrl, state, models, useCache) => { 
  const { controller, method, modulePath } = context
  const args = argsIn(context.args)

  const url = `${apiUrl}/${controller}/${method}`
  const body = JSON.stringify({ ...context, args }, replacer)

  if (useCache) {
    const cached = state.apiCache.get(context)
    if (cached) return JSON.parse(cached, createReviver(state, modulePath))
  }

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    body,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  })

  const text = await res.text()

  const shouldCache = useCache ?? models[controller]?.prototype?.shouldCache ?? method.indexOf('find') === 0
  if (shouldCache) state.apiCache.set(context, text)

  return JSON.parse(text, createReviver(state, modulePath))
}


const defaultApiUrl = typeof window !== 'undefined' && window.location?.href
  ? window.location.href.slice(0, window.location.href.lastIndexOf('/')) + '/api'
  : 'http://localhost:3000/api'


export const argsIn = args =>
  args.map(a => a === undefined ? '__undefined__' : a) // undefined becomes null when stringified, but controller functions may depend on undefined args and default parameters, so we convert this back to undefined server side

export const argsOut = args =>
  args.map(a => a === '__undefined__' ? undefined : a)