export default () => ({
  cookies: {},
  
  get(k) {
    return this.cookies[k]
  },
  
  set(k, v) {
    this.cookies[k] = v
  },
  
  remove(k) {
    delete this.cookies[k]
  }
})

// during development, we don't want to actually remember the token
// we want to control providing the token so we can choose to do it or not, i.e. via replays.token