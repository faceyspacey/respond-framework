import { forwardRef, useState, createElement } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { isNative } from '../../../utils/bools.js'
import { memo } from '../../../utils/isEqual.js'


export default memo(forwardRef(({ event, arg, children, disabled, styleHover, onPress, testKey, name, ...props }, ref) => {
  const callback = event
    ? () => {
        event.trigger(arg, { testKey, name })
        onPress?.()
      }
    : onPress

  const [hover, set] = useState(false)

  const bright = disabled || isNative || hover
  
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