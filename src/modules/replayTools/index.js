import error from './plugins/error.js'
import loadTests from './plugins/loadTests.js'
import restoreSession from './plugins/restoreSession.js'
import defaultPlugins from '../../store/plugins/index.js'
import localStorage from '../../utils/localStorage.js'
import sessionStorage from '../../utils/sessionStorage.js'
import getSessionState from '../../utils/getSessionState.js'


export const module = true

export { id } from './respond.js'

export { default as events } from './events.js'

export * as reducers from './reducers.js'

export const plugins = [error, loadTests, restoreSession, ...defaultPlugins]

export const ignoreChild = true

export const initialState = async store => {
  const { open, permalink } = store.replays.settings
  const tab = (await localStorage.getItem('replayToolsTab')) || 'settings'

  if (!window.__sessionRestored && !permalink && !getSessionState()) { // call only on initial browser refresh (not replays) | nor for permalinks | and don't apply replayToolsState if returning after linking out (await not required as it only occurs in the browser)
    const json = await sessionStorage.getItem('replayToolsState')

    if (json) { 
      const state = store.parseJsonState(json)

      return {
        ...state,
        open,
        tab,
      }
    }
  }

  return {
    form: store.replays.settings,
    open,
    tab,
    evsIndex: -1,
    evs: [],
    divergentIndex: undefined,
  }
}