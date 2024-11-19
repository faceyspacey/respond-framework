import trySync from '../../utils/trySync.js'


export default ({
  condition = defaultCondition,
  findCurr = defaultFindCurr
} = {}) => (state, e, next) => {
  if (!condition(state, e)) return

  const event = findCurr(state).event
  const modState = event.module // plugin could be in any module

  const res = event.beforeLeave?.call(modState, modState, e)

  return trySync(res, r => leave(modState, e, r, next, event))
}



const leave = (state, e, canLeave, next, event) => {
  if (canLeave === false) {
    state.respond.devtools.sendPrevented({ type: 'beforeLeave', returned: false }, e)
    return false
  }
  
  const res = event.leave?.call(state, state, e)

  return trySync(res, _ => {
    if (!event.afterLeave) return
    return trySync(next(), _ => event.afterLeave(state, state, e))
  })
}




const defaultFindCurr = state => state.curr

const defaultCondition = (state, e) => !state.respond.isEqualNavigations(e, state.curr)



// example conditions

// const leaveModule = (state, e) =>
//   e.kind === state.respond.kinds.navigation &&
//   e.event.module !== state.curr.module // note: plugins must be applied to a parent module that contains children each with different navigation events
