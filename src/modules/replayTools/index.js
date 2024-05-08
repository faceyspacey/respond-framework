import error from './plugins/error.js'
import loadTests from './plugins/loadTests.js'
import restoreSession from './plugins/restoreSession.js'
import defaultPlugins from '../../store/plugins/index.js'
import storage from '../../utils/storage.js'


export { id } from './respond.js'

export { default as events } from './events.js'

export * as reducers from './reducers.js'

export const plugins = [error, loadTests, restoreSession, ...defaultPlugins]

export const ignoreChild = true

export const initialState = store => {
  const open = !!JSON.parse(storage.local.replaySettings)?.open
  const tab = storage.session.replayToolsTab || 'settings'

  if (!window.__sessionRestored) {
    const json = storage.session.replayToolsState
    
    if (json) {
      return {
        ...store.parseJsonState(json),
        open,
        tab,
      }
    }
  }

  return {
    open,
    tab,
    evsIndex: -1,
    evs: [],
    divergentIndex: undefined,
  }
}