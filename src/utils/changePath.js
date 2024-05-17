import { isNative } from './bools.js'


export default isNative
  ? store => e => undefined
  : store => e => {
    if (window.ignoreChangePath) return
    replace(store.fromEvent(e).url)
  }

export const replace = (url, index = 1) => history.replaceState({ index }, '', url)

export const push = (url, index = 1) => history.pushState({ index }, '', url)