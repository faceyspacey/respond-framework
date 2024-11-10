const standard = ({ onLogin, onLogout }) => (state, e) => {  
  if (state.token !== state.prevState.token) {
    state.prevState.token = state.token // prevent being called again in redirects, as prevState is constant for a single trigger

    if (state.token) return onLogin(state, e)
    else return onLogout(state, e)
  }
}


const custom = ({ getToken, onLogin, onLogout }) => (state, e) => {
  const token = getToken(state)
  const prevToken = getToken(state.prevState)

  if (token !== prevToken) {
    state.prevState.token = token

    if (token) return onLogin(state, e)
    else return onLogout(state, e)
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