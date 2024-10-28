export default ({
  condition = defaultCondition,
  findCurr = defaultFindCurr
}) => async (state, e, next) => {
  if (!condition(state, e)) return

  const event = findCurr(state).event

  const modState = event.module // callback could be in any module
  const canLeave = await event.beforeLeave?.(modState, e)

  if (canLeave === false) {
    modState.respond.devtools.sendPrevented({ type: 'beforeLeave', returned: false }, e)
    return false
  }
  
  await event.leave?.(modState, e)
  await next()
  await event.afterLeave?.(modState, e)
}



const defaultFindCurr = state => state.curr

const defaultCondition = (state, e) =>
    e.kind === state.respond.kinds.navigation &&
    e.event !== state.curr.event


// example conditions

// const leaveModule = (state, e) =>
//   e.kind === state.respond.kinds.navigation &&
//   e.event.module !== state.curr.module // note: plugins must be applied to a parent module that contains children each with different navigation events