
import { useRef, useState, useMemo }  from 'react'
import { PanResponder, Animated } from 'react-native'


export default (index, height, event, setIndex, openSlot) => {
  const y = useRef(new Animated.Value(0))
  const [dragging, set] = useState(false)

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,  // allow dragging out of bounds to the bottom
    onPanResponderMove: (e, { dy }) => {
      const delta = Math.round(dy / height)         // index delta

      const dist = Math.abs(dy % height)
      const snap = dist < 7 || (height - dist) < 7

      const bump = delta >= 0 ? 1 : 0               // bump up index for drag down, so slot is opened in row beneath
      const i = index + delta + bump                // create index for slot

      const clamp = isClamped(i, index, dist, dy)
      const next = index === 0 && clamp ? 1 : i     // openSlot on index 1 when dragging index 0 up into clampped territory

      setIndex(Math.max(0, next))                   // openSlot for index
      set(true)                                     // absolute position / dragging

      if (clamp) {
        y.current.setValue(-index * height)         // clamp to index 0
      }
      else if (snap) {
        y.current.setValue(delta * height)          // snap to indexes
      }
      else {
        y.current.setValue(dy)                      // smooth dragging
      }
    },
    onPanResponderRelease: (e, { dy }) => {
      setIndex(null)                                // remove openSlot
      set(false)                                    // remove absolute position / dragging

      const delta = Math.round(dy / height)

      if (delta === 0) {
        y.current.setValue(0)                       // put back (didn't drag far enough)
      }
      else {
        event.dispatch({ index, delta }, { trigger: true })
      }
    },
  })

  const props = useMemo(() => pan, [event, set, y]) // important: without `event` as a dep, replays will have stale events assigned, bringing along with it stale state when tapped

  const transform = [{ translateY: y.current }]

  const top = index * height                        // place element in exact same place via absolute positioning
  const h = openSlot ? height * 2 : height          // openSlot: increase height of row, and inner View will be attached to the bottom, due to flex-end

  const style = dragging ? { ...base, ...drag, transform, top, height: h } : { ...base, height: h }

  return { ...props.panHandlers, style }
}


const base = {
  width: '100%',
  justifyContent: 'flex-end'
}

const drag = {
  zIndex: 1,
  position: 'absolute',
  backgroundColor: 'rgba(100, 45, 55, .85)',
}

const isClamped = (i, index, dist, dy) =>
  i < 0 || i === 0 && dist <= 25 || index === 0 && dy <= 0 // dist <= 25 clamps due to modulo  -- (why? performant rendering in this file is achieved by not needing to know scroll position or state.evs.length)