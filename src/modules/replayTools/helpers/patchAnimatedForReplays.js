import { isProd, isNative as useNativeDriver } from '../../../utils/bools.js'


export default Animated => {
  if (isProd) return

  const timing = Animated.timing
  const spring = Animated.spring

  const loop = Animated.loop

  Animated.timing = (value, config) => {
    if (window.store?.ctx.isFastReplay) {
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
    if (window.store?.ctx.isFastReplay) {
      return timing(value, {
        duration: 0,
        delay: 0,
        toValue: config.toValue,
        useNativeDriver,
      })
    }
    
    return spring(value, config)
  }

  Animated.loop = (animation, config) => {
    if (window.store?.ctx.isFastReplay) {
      return animation
    }

    return loop(animation, config)
  }
}