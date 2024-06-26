import { act } from 'react-test-renderer'
import createMatchSnapshots from './createMatchSnapshots.js'
import { reviveObject } from '../../utils/jsonReplacerReviver.js'
import ensureTrigger from './ensureTrigger.js'
import defaultConfig from './defaultConfig.js'


export default (store, renderer, dispatch, options) => {
  const matchSnapshots = createMatchSnapshots(store, renderer)
  
  return async (e, options2) => {
    const arg = reviveObject(store.events, e.arg)
    e = { ...e, arg, meta: { ...e.meta } }
    const o = { ...defaultConfig, ...options, ...options2 }

    if (o.ensureTrigger && e.index !== 0) {
      ensureTrigger(store, renderer.getInternal(), e, o)
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