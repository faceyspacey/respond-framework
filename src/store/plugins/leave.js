import { kinds } from '../../store/createEvents.js'


export default ({
  condition = defaultCondition,
  findCurr = defaultFindCurr
} = {}) => async (state, e, next) => {
  if (!condition(state, e)) return

  const event = findCurr(state).event
  const modState = event.module // callback could be in any module

  return handleLeave(modState, e, next, event)  
}


const handleLeave = async (state, e, next, event) => {
  const canLeave = await event.beforeLeave?.(state, e)

  if (canLeave === false) {
    state.respond.devtools.sendPrevented({ type: 'beforeLeave', returned: false }, e)
    return false
  }
  
  await event.leave?.(state, e)
  await next()
  await event.afterLeave?.(state, e)
}



const defaultFindCurr = state => state.curr

const defaultCondition = (state, e) => e.kind === navigation && !state.respond.isEqualNavigations(e, state.curr)

const { navigation } = kinds


// example conditions

// const leaveModule = (state, e) =>
//   e.kind === state.respond.kinds.navigation &&
//   e.event.module !== state.curr.module // note: plugins must be applied to a parent module that contains children each with different navigation events
