import { hasSessionStorage } from './bools.js'
import sessionStorage from './sessionStorage.js'
import { createReviver } from './jsonReplacerReviver.js'
import { isProd } from '../../dist/utils/bools.js'


export default state => {
  if (!hasSessionStorage) return
  if (!isProd && !state.options?.enablePopsInDevelopment) return

  const session = sessionStorage.getItem('sessionState')
  if (!session) return

  if (!isProd) console.log('respond: state restored from SessionStorage - ReplayTools disabled; set `enablePopsInDevelopment` to `false` or open your app in another browser tab to regain use of ReplayTools')

  return JSON.parse(session, createReviver(state.events, state.models))
}


const mergeDeep = (state = {}, session = {}) => {
  state.moduleKeys.forEach(k => {
    mergeDeep(state[k], session[k])
  })

  Object.assign(state, session)
}