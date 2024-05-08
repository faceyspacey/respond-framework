export default () => {
  const cookies = {}

  return {
    get(k) {
      return cookies[k]
    },
    
    set(k, v) {
      cookies[k] = v
    },
    
    remove(k) {
      delete cookies[k]
    }
  }
}

// during development, we don't want to actually remember the token
// we want to control providing the token so we can choose to do it or not, i.e. via replays.token