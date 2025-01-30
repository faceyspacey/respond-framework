import { defaultOrigin } from './constants.js'
import fetchWithTimeout from './fetchWithTimeout.js'


export default async function fetch(apiUrl = defaultApiUrl, body, respond) { 
  const { table, method } = body
  const url = `${apiUrl}/${table}/${method}`

  const max = respond.options?.fetchTimeout ?? 12000
  const start = new Date

  try {
    const res = await fetchWithTimeout(url, {
      headers,
      method: 'POST',
      body: JSON.stringify(body)
    }, max)

    if (respond.state._serverDown) {
      respond.state._serverDown = false
      respond.options.onServerUp?.(respond.state)
    }

    return res.json()
  }
  catch { // timeout exceeded
    const elapsed = new Date - start
    if (elapsed < max) await timeout(max - elapsed) // instant throw happens when webserver is down
    
    respond.state._serverDown = true
    respond.options.onServerDown?.(respond.state, body)
    
    return fetch(apiUrl, body, respond) // retry every 12 seconds -- see fetchWithTimeout.js (throws after 12 seconds of hanging)
  }
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


const timeout = ms => new Promise(res => setTimeout(res, ms))