import { hasSessionStorage, isNative } from './bools.js'
import sessionStorage from './sessionStorage.js'
import { isProd } from '../../dist/utils/bools.js'


export default () => {
  if (isNative) return
  if (!hasSessionStorage) return
  return sessionStorage.getItem('sessionState')
}