import { useState, useRef, useEffect } from 'react'
import { Animated, Easing } from 'react-native'
import { useNativeDriver } from '../../../utils.js'

export default (show, duration = 225) => {
  const anim = useRef(new Animated.Value(show ? 1 : 0)).current
  const [state, set] = useState(show)

  useEffect(() => {
    if (state === show) return

    set(show)

    Animated.timing(anim, {
      toValue: show ? 1 : 0,
      duration,
      easing: Easing.sin,
      useNativeDriver,
    }).start()
  }, [show])

  const rotateX = anim.interpolate( {
    inputRange: [ 0, 1 ],
    outputRange: [ '270deg', '360deg' ]
  })

  const opacity = anim.interpolate({
    inputRange: [0, .1, 1],
    outputRange: [0, 1, 1]
  })

  return { rotateX, opacity }
}