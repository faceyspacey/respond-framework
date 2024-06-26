import { hasSessionStorage } from './bools.js'
import sessionStorage from './sessionStorage.js'
import { createReviver } from './jsonReplacerReviver.js'
import { isProd } from '../../dist/utils/bools.js'


export default events => {
  if (!hasSessionStorage) return

  const state = sessionStorage.getItem('sessionState')
  if (!state) return

  if (!isProd) console.log('respond: state restored from SessionStorage - ReplayTools disabled; set `enablePopsInDevelopment` to `false` or open your app in another browser tab to regain use of ReplayTools')

  return JSON.parse(state, createReviver(events))
}