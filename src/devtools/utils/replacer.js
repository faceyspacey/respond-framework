import orderEventKeys from './orderEventKeys.js'

function callback(state, e) {}

const symbol = Symbol.for('respondEvent')

const isEventFunction = v => v._symbol === symbol

export default function(k, v) {
  if (k === '_type') return
  if (k === '_namespace') return
  if (k === 'branch') return

  if (k === '__prefix') return

  if (typeof v !== 'function') return v
  
  if (k === 'dispatch') return

  if (isEventFunction(v)) {
    const event = orderEventKeys(v) // convert event functions to objects so nested key/vals can be displayed in devtools

    Object.keys(event).forEach(k => {
      if (k === '_symbol') {
        delete event[k]
        return
      }

      const v = event[k]

      if (typeof v === 'function' && !isEventFunction(v)) {
        event[k] = callback
      }
    })

    return event
  }

  return v
}