import { isTest } from './bools.js'
import timeout from './timeout.js'


export default (state, no) => {
  const { options, ctx } = state.respond
  if (no || ctx.isFastReplay || isTest || !options.simulatedApiLatency) return
  return timeout(options.simulatedApiLatency)
}