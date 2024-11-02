import { isTest } from './bools.js'
import timeout from './timeout.js'


export default store => {
  const { options, ctx } = store.respond
  if (ctx.isFastReplay || isTest || !options.simulatedApiLatency) return
  return timeout(options.simulatedApiLatency)
}