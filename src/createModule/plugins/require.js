import { navigation } from '../kinds.js'


export const requireCondition = ({ cond, redirect, name = 'Condition' }) => async (state, e) => {
  if (!cond?.(state, e)) return

  state.respond.devtools.sendPluginNotification({ type: name + 'Required' }, e)

  return redirect?.(state, e)?.dispatch().then(_ => false) ?? false
}



export const requireUser = ({ cond, redirect }) => async (state, e) => {
  if (state.userId || e.userId) return
  if (e.kind !== navigation) return

  if (cond && !cond(state, e)) return
  if (!cond && !e.event.requireUser) return // specific events can be marked as requiring a user

  state.respond.devtools.sendPluginNotification({ type: 'userRequired' }, e)

  return redirect?.(state, e)?.dispatch().then(_ => false) ?? false
}



export const requireAdmin = ({ cond, redirect, masquerade = true }) => async (state, e) => {
  if (state.adminUserId) return
  if (e.kind !== navigation) return

  if (cond && !cond(state, e)) return
  // requireAdmin -- unlike requireUser -- is a plugin that's expected to be used for an ENTIRE MODULE

  const top = state.respond.topState

  const curr = e.user ?? top.user
  const user = curr?.roles?.includes('admin') ? curr : await state.db.user?.findCurrentUser()

  if (user?.roles?.includes('admin')) {
    if (!masquerade) return
    top.adminUser = user // store for masquerading (so admin user continues to be used for calls with the admin permission/role, while other calls are masqueraded using state.userId, which must be altered in userland)
    top.adminUserId = user.id
    return
  }

  state.respond.devtools.sendPluginNotification({ type: 'adminRequired', returned: 'user is not an admin', user }, e)

  return redirect?.(state, e)?.dispatch().then(_ => false) ?? false
}