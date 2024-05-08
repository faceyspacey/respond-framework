import { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'
import { useNativeDriver } from '../../../utils.js'


export default (duration = 1500) => {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {        
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver,
      })
    ).start()
  }, [])

  return anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })
}