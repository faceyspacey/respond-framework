export default (state, e) => {  
  if (typeof e.token !== 'string') return

  const { cookies } = state.respond

  if (e.token) cookies?.set('token', e.token)
  else cookies?.remove('token') // empty string removes token
}