import { isProd, isTest } from '../../helpers/constants.js'
import { timeout } from '../../utils.js'


export default function simulateLatency() {
  if (isProd || isTest || this.mem.isFastReplay || !this.options.simulatedApiLatency) return
  return timeout(this.options.simulatedApiLatency)
}