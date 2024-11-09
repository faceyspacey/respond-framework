import { isTest } from './bools.js'
import timeout from './timeout.js'


export default state => {
  const { options, ctx } = state.respond
  if (ctx.isFastReplay || isTest || !options.simulatedApiLatency) return
  return timeout(options.simulatedApiLatency)
}