import AsyncStorage from '@react-native-async-storage/async-storage'
import { isNative } from '../helpers/constants.js'

const key = '__respond_session.'

const mock = {
  getItem(k) {
    return this[key + k]
  },
  setItem(k, v) {
    this[key + k] = v
  },
  removeItem(k) {
    delete this[key + k]
  },
}

const web = {
  getItem(k) {
    return sessionStorage.getItem(key + k)
  },
  setItem(k, v) {
    return sessionStorage.setItem(key + k, v)
  },
  removeItem(k) {
    return sessionStorage.removeItem(key + k)
  },
}


const native = {
  getItem(k) {
    return AsyncStorage.getItem(key + k)
  },
  setItem(k, v) {
    return AsyncStorage.setItem(key + k, v)
  },
  removeItem(k) {
    return AsyncStorage.removeItem(key + k)
  },
}

export default isNative
  ? native
  : typeof sessionStorage === 'undefined' ? mock : web