
import { findAllByProps} from './finders.js'
import { isEqualDeepPartial } from '../../utils/isEqual.js'


export default (state, renderer, e, tc) => {
  if (e.meta.ignoreEnsure) return
  if (tc.ignored.events?.find(name => name === e.type)) return

  const { testKey, testProps } = e.meta

  const els = findTriggerElements(renderer, e, testKey, testProps, state)
  
  expect(els.length).toBeGreaterThan(0)
}



const findTriggerElements = (renderer, e, testKey, testProps, state) => {
  const event = state.respond.eventsByType[e.type]

  if (testKey === false) {
    if (!testProps) throw new Error('testProps required when testKey === false')
    return findAllByProps(renderer, testProps) // search only by user-defined props, ignore event
  }

  const k = testKey || 'event'

  let els = renderer.root.findAll(el => el.props[k] === event) // first gather elements with event as prop
  els = filterByProps(e, els, testProps)

  if (els.length === 0) {
    els = renderer.root.findAll(({ props }) => !!Object.keys(props).find(k => props[k] === event)) // fallback: search all props of all elements for event
    els = filterByProps(e, els, testProps)

    if (els.length > 0) {
      console.warn(`a search of all props of all elements for event "${e.type}" was needed to ensure trigger elements were found before dispatch. Consider using "meta.testKey" and "meta.testProps" for faster searches.`)
    }
  }

  return els
}



const filterByProps = (e, els, testProps) => {
  if (testProps === false) return els // do nothing, only event match is desired

  if (testProps !== undefined) {
    return els.filter(el => matchesProps(el.props, testProps)) // user-defined props identifying mocked component
  }

  if (!e.arg) return els // only event match is needed

  const { id, ...arg } = e.arg
  const kv = isSingleKeyVal(arg) // eg: { value: 4 }

  if (kv) {
    const [k, v] = kv

    if (!id) { // eg: { value: 4, id: 'abc123' }
      return els.filter(el => matchesKV(el.props, k, v))
    }
    else {
      return els.filter(el => matchesKV(el.props, k, v) && matchesID(el.props, id))
    }
  }
  else if (id && Object.keys(arg).length === 0) { // eg: { id: 'abc123' }
    return els.filter(el => matchesID(el.props, id))
  }

  const filtered = els.filter(el => isEqual(el.props.arg, arg)) // eg: <Pressable arg={arg} />

  return filtered.length > 0 ? filtered : els.filter(el => matchesProps(el.props, arg)) // fallback: arg as props to mocked component
}



const matchesKV = (props, k, v) =>
  props[k] === v || props.name === k || props.arg?.[k] === v

const matchesID = (props, id) =>
  props.id === id || props.arg?.id === id

const matchesProps = (props, testProps) =>
  Object.keys(testProps).every(k => isEqual(props[k], testProps[k])) 

const isEqual = (props, testProps) => isEqualDeepPartial(testProps, props) // switch args for consistency of file

const isSingleKeyVal = ({ id, ...arg }) => {
  const keys = Object.keys(arg)

  if (keys.length !== 1) return

  const k = keys[0]
  const v = arg[k]

  return (typeof v !== 'object' || v === null) && [k, v]
}