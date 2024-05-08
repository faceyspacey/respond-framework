import * as React from 'react'
import { Animated, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import useInfiniteSpin from '../hooks/useInfiniteSpin.js'
import { colors } from '../styles.js'


export default ({ color = colors.white, style}) => {
  const rotate = useInfiniteSpin()    

  const transform = [{ rotate }]
  const styles = [s.c, { transform }, style]

  return (
    <Animated.View style={styles}>
      <Svg viewBox='0 0 32 32'>
        <Circle
          cx={16}
          cy={16}
          r={11}
          stroke={color}
          fill='none'
          strokeWidth={8}
          strokeDasharray={Math.PI * 1 * (11 - 10)}
          strokeLinecap='butt'
        />
      </Svg>
    </Animated.View>
  )
}




const s = StyleSheet.create({
  c: {
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  }
})
