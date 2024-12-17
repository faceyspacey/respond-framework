import { traverseModuleChildren } from '../../utils/sliceBranch.js'


export default function changeBasename(basename) {
  const e = this.eventFrom(window.location.href)
  const { state, branch } = this

  const prevBasename = state.basename
  const prevBasenameFull = state.basenameFull
  
  state.basename = this.basenames[branch] = basename
  state.basenameFull = prevBasenameFull.replace(new RegExp(prevBasename + '$'), basename)

  traverseModuleChildren(state, (state, parent) => {
    state.basenameFull = parent.basenameFull + state.basename
  })

  const next = {}

  Object.keys(this.eventsByPattern).forEach(prevPattern => {
    const event = this.eventsByPattern[prevPattern]
    const pattern = event.module.basenameFull + event.pattern
    next[pattern] = event
    delete this.eventsByPattern[prevPattern]
  })

  Object.assign(this.eventsByPattern, next)

  this.history.changePath(e)
  this.queueSaveSession()
}