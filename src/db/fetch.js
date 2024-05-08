import { createReviver } from '../utils/jsonReplacerReviver.js'
import fetchWithTimeout from './fetchWithTimeout.js'


export default async (context, apiUrl = 'http://localhost:3000/api') => {
  const url = `${apiUrl}/${context.controller}/${context.method}`

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    body: JSON.stringify(context),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  })

  const text = await res.text()
  return JSON.parse(text, createReviver())
}