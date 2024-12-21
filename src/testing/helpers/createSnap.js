import matchSnapshots from './matchSnapshots.js'
import revive from '../../createModule/helpers/revive.js'
import ensureTrigger from './ensureTrigger.js'
import configDefault from '../config.tests.default.js'


export default (respond, renderer, trigger, config) => async (e, config2) => {
  if (e.arg) e.arg = revive(respond)(e.arg)
  const conf = { ...configDefault, ...config, ...config2 }
  if (e.index !== 0) ensureTrigger(respond, renderer, e, conf)
  await trigger(e, undefined, conf, true)
  matchSnapshots(respond, renderer, e, conf)
}