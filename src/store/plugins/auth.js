const standard = ({ onLogin, onLogout }) => async (store, e) => {
  const { state, prevState } = store

  if (state.token !== prevState.token) {
    if (state.token) await onLogin(store, e)
    else await onLogout(store, e)
  }
}


const custom = ({ getToken, onLogin, onLogout }) => async (store, e) => {
  const token = getToken(store.state)
  const prevToken = getToken(store.prevState)

  if (token !== prevToken) {
    if (token) await onLogin(store, e)
    else await onLogout(store, e)
  }
}


export default options => {
  const opts = {
    onLogout: ({ cookies }) => cookies?.remove('token'),
    onLogin: ({ cookies, state }) => cookies?.set('token', state.token),
    ...options
  }

  return opts.getToken ? custom(opts) : standard(opts)
}