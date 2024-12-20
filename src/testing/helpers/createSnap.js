import { act } from 'react-test-renderer'
import createMatchSnapshots from './createMatchSnapshots.js'
import revive from '../../createModule/helpers/revive.js'
import ensureTrigger from './ensureTrigger.js'
import configDefault from '../config.tests.default.js'


export default (respond, renderer, dispatch, config) => {
  const matchSnapshots = createMatchSnapshots(respond, renderer)
  
  return async (e, config2) => {
    if (e.arg) e.arg = revive(respond)(e.arg)
    const conf = { ...configDefault, ...config, ...config2 }

    if (conf.ensureTrigger && e.index !== 0) {
      ensureTrigger(respond, renderer.getInternal(), e, conf)
    }

    const snapTrigger = !conf.snapTrigger ? undefined : () => matchSnapshots(e, {  ...conf, ...confTrigger })
    const meta = snapTrigger ? { snapTrigger } : undefined

    await dispatch(e, meta, true)
  
    await act(async () => {
      await jest.runAllTimersAsync()
    })

    matchSnapshots(e, conf)
  }
}


const confTrigger = {
  snapState: false,
  logState: false,
  snipes: false,
  testIDs: false,
  suffix: 'trigger'
}