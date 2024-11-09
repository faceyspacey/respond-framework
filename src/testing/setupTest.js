import createRenderer from './utils/createRenderer.js'
import createDispatch from './utils/createDispatch.js'
import createSnap from './utils/createSnap.js'
import createReplayEventsToIndex from './utils/createReplayEventsToIndex.js'
import createModule from '../store/createState.js'


export default async ({ top, config, settings, rendererOptions } = {}) => {
  const state = createModule(top, { settings })
  const renderer = createRenderer(state, rendererOptions)
  const dispatch = createDispatch(state)
  const snap = createSnap(state, renderer, dispatch, config)
  const replayEventsToIndex = createReplayEventsToIndex(dispatch)

  return {
    state,
    renderer,
    dispatch,
    snap,
    replayEventsToIndex
  }
}