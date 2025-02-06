import { setSessionState } from '../helpers/getSessionState.js'
import { isTest } from '../../helpers/constants.js'


export default isTest ? function() {} : function() {
  if (this.branches.replayTools?.playing) return
  if (this.topState !== window.state) return // ensure replayEvents saves new state instead of old state when recreating state for replays
  if (!this.rememberSession) return

  if (timeout) clearTimeout(timeout)

  timeout = setTimeout(() => {
    timeout = null
    const snap = this.snapshot(this.topState)
    setSessionState(snap, this.ctx.lastTriggerEvent)
  }, 1000)
}


let timeout