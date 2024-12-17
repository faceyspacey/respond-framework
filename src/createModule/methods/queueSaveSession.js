import { setSessionState } from '../helpers/getSessionState.js'
import { isProd, isTest } from '../../helpers/constants.js'


export default function() {
  if (isProd || isTest) return
  if (this.mem.saveQueued || this.branches.replayTools?.playing) return
  if (window.state !== this.topState) return // ensure replayEvents saves new state instead of old state when recreating state for replays

  this.mem.saveQueued = true

  setTimeout(() => {
    const snap = this.snapshot(this.topState)
    setSessionState(snap, this.lastTriggerEvent)
    this.mem.saveQueued = false
  }, 1000)
}