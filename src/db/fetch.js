import { createReviverWithModels } from '../utils/jsonReplacerReviver.js'
import fetchWithTimeout from './fetchWithTimeout.js'


export default async (context = {}, apiUrl = defaultApiUrl, models) => {
  const url = `${apiUrl}/${context.controller}/${context.method}`

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    body: JSON.stringify({
      ...context,
      args: prepareArgs(context.args)
    }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  })

  const text = await res.text()
  return JSON.parse(text, createReviverWithModels(models))
}


const defaultApiUrl = typeof window !== 'undefined' && window.location?.href
  ? window.location.href.slice(0, window.location.href.lastIndexOf('/')) + '/api'
  : 'http://localhost:3000/api'


export const argsIn = args =>
  args.map(a => a === undefined ? '__undefined__' : a) // undefined becomes null when stringified, but controller functions may depend on undefined args and default parameters, so we convert this back to undefined server side

export const argsOut = args =>
  args.map(a => a === '__undefined__' ? undefined : a)