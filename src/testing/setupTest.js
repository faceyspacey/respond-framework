import createRenderer from './utils/createRenderer.js'
import createDispatch from './utils/createDispatch.js'
import createSnap from './utils/createSnap.js'
import createReplayEventsToIndex from './utils/createReplayEventsToIndex.js'
import createState from '../store/createState.js'


export default async ({ top, config, settings, initialState, rendererOptions } = {}) => {
  const mod = { ...top, initialState: { ...top.initialState, ...initialState } }
  const store = await createState(mod, { settings })
  const renderer = createRenderer(store, rendererOptions)
  const dispatch = createDispatch(store)
  const snap = createSnap(store, renderer, dispatch, config)
  const replayEventsToIndex = createReplayEventsToIndex(dispatch)

  return {
    store,
    renderer,
    dispatch,
    snap,
    replayEventsToIndex
  }
}