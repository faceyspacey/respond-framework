import { act } from 'react-test-renderer'
import createMatchSnapshots from './createMatchSnapshots.js'
import revive from '../../utils/revive.js'
import ensureTrigger from './ensureTrigger.js'
import defaultConfig from './defaultConfig.js'


export default (state, renderer, dispatch, options) => {
  const matchSnapshots = createMatchSnapshots(state, renderer)
  
  return async (e, options2) => {
    const arg = revive(state.respond)(e.arg)
    e = { ...e, arg, meta: { ...e.meta } }
    const o = { ...defaultConfig, ...options, ...options2 }

    if (o.ensureTrigger && e.index !== 0) {
      ensureTrigger(state, renderer.getInternal(), e, o)
    }

    const snapTrigger = !o.snapTrigger ? undefined : () => matchSnapshots(e, {  ...o, ...to })
    await dispatch(e, { snapTrigger }, true)
  
    await act(async () => {
      await jest.runAllTimersAsync()
    })

    matchSnapshots(e, o)
  }
}


const to = {
  snapState: false,
  logState: false,
  snipes: false,
  testIDs: false,
  suffix: 'trigger'
}