import createRenderer from './utils/createRenderer.js'
import createDispatch from './utils/createDispatch.js'
import createSnap from './utils/createSnap.js'
import createReplayEventsToIndex from './utils/createReplayEventsToIndex.js'
import createStore from '../store/createStore.js'


export default async ({ top, config, settings, initialState, rendererOptions } = {}) => {
  const topModule = { ...top, initialState: { ...top.initialState, ...initialState } }
  const store = await createStore(topModule, settings)
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