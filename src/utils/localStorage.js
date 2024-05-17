import AsyncStorage from '@react-native-async-storage/async-storage'
import { isNative } from './bools.js'

const key = '__respond.'

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
    return localStorage.getItem(key + k)
  },
  setItem(k, v) {
    return localStorage.setItem(key + k, v)
  },
  removeItem(k) {
    return removeItem.removeItem(key + k)
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
  : typeof localStorage === 'undefined' ? mock : web