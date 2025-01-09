import createModule from '../createModule/index.js'
import createRenderer from './helpers/createRenderer.js'
import createTriggerDefault from './helpers/createTrigger.js'
import createSnap from './helpers/createSnap.js'
import createReplayEventsToIndex from './helpers/createReplayEventsToIndex.js'
import getBranchFromTestPath from './helpers/getBranchFromTestPath.js'


export default ({ top, settings, rendererOptions, createTrigger = createTriggerDefault } = {}, config) => {
  top ??= getTopModule()
  
  const branch = getBranchFromTestPath()

  const respond = createModule(top, { settings, branch, status: 'reload' })
  const renderer = createRenderer(respond, rendererOptions)
  const trigger = createTrigger(respond, renderer)
  const snap = createSnap(respond, renderer, trigger, config)
  const replayEventsToIndex = createReplayEventsToIndex(trigger)

  return {
    get state() {
      return respond.state
    },
    respond,
    renderer,
    dispatch: trigger,
    trigger,
    snap,
    replayEventsToIndex
  }
}


const getTopModule = () => {
  const mod = jest.requireActual(process.cwd() + '/index.module.js')
  return mod.default ?? mod // can use individual exports or export default
}