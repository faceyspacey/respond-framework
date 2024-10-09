import { hasSessionStorage, isNative } from './bools.js'
import sessionStorage from './sessionStorage.js'


export default () => {
  if (isNative) return
  if (!hasSessionStorage) return
  return sessionStorage.getItem('sessionState')
}