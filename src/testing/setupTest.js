import createModule from '../createModule/index.js'
import createRenderer from './helpers/createRenderer.js'
import createDispatch from './helpers/createDispatch.js'
import createSnap from './helpers/createSnap.js'
import createReplayEventsToIndex from './helpers/createReplayEventsToIndex.js'
import getBranchFromTestPath from './helpers/getBranchFromTestPath.js'


export default ({ config, settings, rendererOptions, top } = {}) => {
  top ??= jest.requireActual(process.cwd() + '/index.module.js')

  const branch = getBranchFromTestPath

  const respond = createModule(top, { settings, branch })
  const renderer = createRenderer(respond, rendererOptions)
  const dispatch = createDispatch(respond)
  const snap = createSnap(respond, renderer, dispatch, config)
  const replayEventsToIndex = createReplayEventsToIndex(dispatch)

  respond.proxify()

  return {
    state: respond.state,
    respond,
    renderer,
    dispatch,
    snap,
    replayEventsToIndex
  }
}