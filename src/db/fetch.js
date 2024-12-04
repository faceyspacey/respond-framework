import { defaultOrigin } from '../utils/constants.js'
import fetchWithTimeout from './fetchWithTimeout.js'


export default async (apiUrl = defaultApiUrl, body = {}) => { 
  const { table, method } = body
  const url = `${apiUrl}/${table}/${method}`

  const res = await fetchWithTimeout(url, {
    headers,
    method: 'POST',
    body: JSON.stringify(body)
  })

  return res.json()
}


const defaultApiUrl = defaultOrigin + '/api'

const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

export const argsIn = args =>
  args.map(a => a === undefined ? __undefined__ : a) // undefined becomes null when stringified, but table functions may depend on undefined args and default parameters, so we convert this back to undefined server side

export const argsOut = args =>
  args.map(a => a === __undefined__ ? undefined : a)


export const __undefined__ = '__undefined__'