const standard = ({ onLogin, onLogout }) => async (state, e) => {  
  if (state.token !== state.prevState.token) {
    state.prevState.token = state.token // prevent being called again in redirects, as prevState is constant for a single trigger

    if (state.token) await onLogin(state, e)
    else await onLogout(state, e)
  }
}


const custom = ({ getToken, onLogin, onLogout }) => async (state, e) => {
  const token = getToken(state)
  const prevToken = getToken(state.prevState)

  if (token !== prevToken) {
    state.prevState.token = token

    if (token) await onLogin(state, e)
    else await onLogout(state, e)
  }
}


export default options => {
  const opts = {
    onLogout: ({ respond }) => respond.cookies?.remove('token'),
    onLogin: ({ respond, token }) => respond.cookies?.set('token', token),
    ...options
  }

  return opts.getToken ? custom(opts) : standard(opts)
}