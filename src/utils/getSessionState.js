import { hasSessionStorage } from './bools.js'
import sessionStorage from './sessionStorage.js'
import { createReviver } from './jsonReplacerReviver.js'


export default events => {
  if (!hasSessionStorage) return

  const state = sessionStorage.getItem('sessionState')
  return state && JSON.parse(state, createReviver(events))
}