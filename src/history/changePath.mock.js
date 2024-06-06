import { shouldChange } from './utils/state.js'

export default e => shouldChange(e) && history.replaceState({}, '', window.store.fromEvent(e).url)