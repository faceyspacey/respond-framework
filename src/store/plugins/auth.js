export default (state, e) => {  
  if (e.token !== state.token) { // token is yet to be set in state -- relies on auth plugin coming before `reduce` plugin

    const { cookies } = state.respond
    if (!cookies) return

    if (e.token) cookies.set('token', e.token)
    else cookies.remove('token')
  }
}