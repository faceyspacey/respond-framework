import error from './plugins/error.js'
import loadTests from './plugins/loadTests.js'
import restoreSession from './plugins/restoreSession.js'
import defaultPlugins from '../../store/plugins/index.js'
import localStorage from '../../utils/localStorage.js'
import sessionStorage from '../../utils/sessionStorage.js'


export { id } from './respond.js'

export { default as events } from './events.js'

export * as reducers from './reducers.js'

export const plugins = [error, loadTests, restoreSession, ...defaultPlugins]

export const ignoreChild = true

export const initialState = async store => {
  const { open, permalink } = store.replays.settings
  const tab = (await localStorage.getItem('replayToolsTab')) || 'settings'

  if (!window.__sessionRestored && !permalink) {
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