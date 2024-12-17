import { isTest } from '../../helpers/constants.js'
import { timeout } from '../../utils.js'


export default function simulateLatency() {
  if (isTest || this.mem.isFastReplay || !this.options.simulatedApiLatency) return
  return timeout(this.options.simulatedApiLatency)
}