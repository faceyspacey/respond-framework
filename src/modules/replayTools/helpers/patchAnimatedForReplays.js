import { isNative as useNativeDriver } from '../../../utils.js'


export default Animated => {
  if (process.env.NODE_ENV === 'production') return

  const timing = Animated.timing
  const spring = Animated.spring

  Animated.timing = (value, config) => {
    if (window.isFastReplay) {
      return timing(value, {
        duration: 0,
        delay: 0,
        toValue: config.toValue,
        useNativeDriver,
      })
    }
    
    return timing(value, config)
  }


  Animated.spring = (value, config) => {
    if (window.isFastReplay) {
      return timing(value, {
        duration: 0,
        delay: 0,
        toValue: config.toValue,
        useNativeDriver,
      })
    }
    
    return spring(value, config)
  }
}