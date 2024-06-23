const TRACK_MEMO_SYMBOL = Symbol()
const GET_ORIGINAL_SYMBOL = Symbol()

const AFFECTED_PROPERTY = 'a'
const IS_TARGET_COPIED_PROPERTY = 'f'
const PROXY_PROPERTY = 'p'
const PROXY_CACHE_PROPERTY = 'c'
const TARGET_CACHE_PROPERTY = 't'
const NEXT_OBJECT_PROPERTY = 'n'
const CHANGED_PROPERTY = 'g'
const HAS_KEY_PROPERTY = 'h'
const ALL_OWN_KEYS_PROPERTY = 'w'
const HAS_OWN_KEY_PROPERTY = 'o'
const KEYS_PROPERTY = 'k'


export const proxyStates = new WeakMap() // shared state