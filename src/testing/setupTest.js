import createRenderer from './helpers/createRenderer.js'
import createDispatch from './helpers/createDispatch.js'
import createSnap from './helpers/createSnap.js'
import createReplayEventsToIndex from './helpers/createReplayEventsToIndex.js'
import createModule from '../createModule/index.js'


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