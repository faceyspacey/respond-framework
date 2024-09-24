import { createReviverWithModels } from '../utils/jsonReplacerReviver.js'
import fetchWithTimeout from './fetchWithTimeout.js'


export default async (context, apiUrl = defaultApiUrl, models) => {
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
  return JSON.parse(text, createReviverWithModels(models))
}


const defaultApiUrl = window.location?.href
  ? window.location.href.slice(0, window.location.href.lastIndexOf('/')) + '/api'
  : 'http://localhost:3000/api'