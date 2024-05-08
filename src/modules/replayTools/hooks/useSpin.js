import { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'
import { useNativeDriver } from '../../../utils.js'


export default (bool, duration = 120, deg = '90deg') => {
  const spin = useRef(new Animated.Value(0)).current

  useEffect(() => {        
    Animated.timing(spin, {
      toValue: bool ? 1 : 0,
      duration,
      easing: Easing.linear,
      useNativeDriver,
    }).start()
  }, [bool])

  return spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', deg],
  })
}