import { forwardRef, useState, createElement } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { memo } from 'respond-framework/utils'


export default memo(forwardRef(({ event, arg, children, disabled, styleHover, onPress, testKey, ...props }, ref) => {
  const callback = event
    ? () => {
        event.dispatch(arg, { trigger: true, testKey })
        onPress?.()
      }
    : onPress

  const [hover, set] = useState(false)

  const bright = disabled || native || hover
  
  const style = bright
    ? [props.style, styleHover || { opacity: 1 }]
    : [props.style, styleHover ? undefined : { opacity : .8 }]

  const Component = disabled ? View : TouchableOpacity
  
  return createElement(Component, {
    ref,
    hitSlop: 10,
    onPress: !disabled && callback,
    onMouseEnter: () => set(true),
    onMouseLeave: () => set(false),
    ...props,
    style,
    children, 
  })
}))



const native = !(typeof window !== 'undefined' && window.document.querySelector)