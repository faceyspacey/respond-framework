import error from './plugins/error.js'
import loadTests from './plugins/loadTests.js'
import defaultPlugins from '../../store/plugins/index.js'


export { id } from './respond.js'

export { default as events } from './events.js'

export * as reducers from './reducers.js'

export const plugins = [error, loadTests, ...defaultPlugins]

export const ignoreParents = true

export const initialState = state => ({
  form: state.replays.settings,
  evsIndex: -1,
  evs: [],
  divergentIndex: undefined,
})