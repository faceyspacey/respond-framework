import { shouldChange } from './utils/helpers.js'

export default e => shouldChange(e) && history.replaceState({}, '', window.store.fromEvent(e).url)