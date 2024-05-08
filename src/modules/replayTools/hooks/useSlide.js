import { useEffect, useRef, useState } from 'react'
import { Animated, Easing } from 'react-native'
import { useNativeDriver } from '../../../utils.js'


export default (open, width) => {
  const [state, set] = useState(open)
  const distance = useRef(new Animated.Value(open ? 10 : -width)).current

  useEffect(() => {   
    if (open === state) return  

    Animated.timing(distance, {
      toValue: open ? 10 : -width,
      duration: 120,
      easing: Easing.sin,
      useNativeDriver,
    }).start(() => set(open))
  }, [open])

  return distance
}