import { native as sessionStorage } from '../../utils/sessionStorage.js'


export default () => ({
  get(k) {
    return sessionStorage.getItem(prefix + k)
  },
  
  set(k, v) {
    return sessionStorage.setItem(prefix + k, v)
  },

  remove(k) {
    return sessionStorage.remove(prefix + k)
  }
})


const prefix = 'cookie.'