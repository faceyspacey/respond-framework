import { createReviver } from './jsonReplacerReviver.js'


export default events => {
  if (typeof sessionStorage === 'undefined') return

  const state = sessionStorage.getItem('sessionState')
  return state && JSON.parse(state, createReviver(events))
}
