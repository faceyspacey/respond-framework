const sessionMock = new Proxy({}, {
  get(target, k) {
    return null
  },
  set(target, k, v) {
    return true
  },
  deleteProperty(target, k) {

  },
})


const sessionReal = new Proxy({}, {
  get(target, k) {
    return sessionStorage.getItem('__' + k)
  },
  set(target, k, v) {
    sessionStorage.setItem('__' + k, v)
    return true
  },
  deleteProperty(target, k) {
    sessionStorage.removeItem('__' + k)
    return true
  },
})


const localMock = new Proxy({}, {
  get(target, k) {
    return null
  },
  set(target, k, v) {
    return true
  },
  deleteProperty(target, k) {

  },
})



const localReal = new Proxy({}, {
  get(target, k) {
    return localStorage.getItem('__' + k)
  },
  set(target, k, v) {
    localStorage.setItem('__' + k, v)
    return true
  },
  deleteProperty(target, k) {
    localStorage.removeItem('__' + k)
    return true
  },
})



export const session = typeof sessionStorage === 'undefined' ? sessionMock : sessionReal

export const local = typeof localStorage === 'undefined' ? localMock : localReal

export default { session, local }