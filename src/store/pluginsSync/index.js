import before from './before.js'
import reduce from '../plugins/reduce.js'
import debounce from './debounce.js'
import end from '../plugins/end.js'


// default plugins

export default [
  before,     // must be sync
  reduce,     // must be sync, so react inputs work
  debounce,   // can be async now..
  end
]