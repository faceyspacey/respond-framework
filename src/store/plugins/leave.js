export default (
  condition = defaultCondition,
  findCurr = defaultFindCurr
) => async (state, e, next) => {
  if (!condition(state, e)) return

  const curr = findCurr(state)
  const canLeave = await curr.beforeLeave?.(state, e)

  if (canLeave === false) {
    state.respond.devtools.sendPrevented({ type: 'beforeLeave', returned: false }, e)
    return false
  }
  
  await curr.leave?.(state, e)
  await next()
  await curr.afterLeave?.(state, e)
}



const defaultFindCurr = state => state.curr

const defaultCondition = (state, e) =>
    e.kind === state.respond.kinds.navigation &&
    e.event !== state.curr.event


// example conditions

// const leaveModule = (state, e) =>
//   e.kind === state.respond.kinds.navigation &&
//   e.event.module !== state.curr.module // note: plugins must be applied to a parent module that contains children each with different navigation events