import AsyncStorage from '@react-native-async-storage/async-storage' // todo: replace with fast sync storage: https://github.com/mrousavy/react-native-mmkv
import { isNative, isProd } from '../helpers/constants.js'

const prefix = '__respond_session.'

const mock = {
  getItem(k) {
    return this[k]
  },
  setItem(k, v) {
    this[k] = v
  },
  removeItem(k) {
    delete this[k]
  },
  clear() {
    Object.keys(this).forEach(k => delete this[k])
  }
}

const web = {
  getItem(k) {
    return sessionStorage.getItem(prefix + k)
  },
  setItem(k, v) {
    return sessionStorage.setItem(prefix + k, v)
  },
  removeItem(k) {
    return sessionStorage.removeItem(prefix + k)
  },
  clear() {
    sessionStorage.clear()
  }
}


export const native = {
  getItem(k) {
    return this[k]
  },
  removeItem(k) {
    delete this[k]
    AsyncStorage.removeItem(prefix + k).catch(swallowed => swallowed)
  },
  setItem(k, v) {
    this[k] = v

    // mimic browser sessionStorage behavior
    if (v === null) v = 'null'
    if (v === undefined) v = 'undefined'

    AsyncStorage.setItem(prefix + k, v).catch(swallowed => swallowed)
  },
  clear() {
    Object.keys(native).forEach(k => delete native[k])
    return AsyncStorage.clear()
  },
  async populate() { // until sync storage is available as a dep on native, await sessionStorage.populate() must be called on app start
    try {
      const keys = await AsyncStorage.getAllKeys()
      const appKeys = keys.filter(k => k.startsWith(prefix))
  
      const values = await AsyncStorage.multiGet(appKeys)
  
      values.forEach(([k, v]) => {
        const key = k.slice(prefix.length)
        this[key] = v
      })
    } catch(e) {
      console.log('populate.error', e)
    }
  }
}


export default isNative
  ? native
  : typeof sessionStorage === 'undefined' ? mock : web