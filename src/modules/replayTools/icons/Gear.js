import * as React from 'react'
import { StyleSheet, Animated } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import useSpin from '../hooks/useSpin.js'
import { colors } from '../styles.js'


export default ({ spin, style, color = colors.greyDark }) => {
  const rotateZ = useSpin(spin)
  const transform = [{ rotateZ }]
  
  return (
    <Animated.View style={[s.c, style, { transform }]}>
      <Svg viewBox='0 0 32 32' fill='none'>
        <Path
          transform='scale(1.7) translate(-4, -4)'
          fill={color}
          strokeWidth={.5}
          stroke={colors.white}
          d='M21.014,13.5a2.316,2.316,0,0,1,1.486-2.16,9.177,9.177,0,0,0-1.111-2.676,4.293,4.293,0,0,1-2.578-.473,2.317,2.317,0,0,1-.478-2.577A9.155,9.155,0,0,0,15.661,4.5a2.314,2.314,0,0,1-4.322,0A9.183,9.183,0,0,0,8.663,5.611a2.31,2.31,0,0,1-.478,2.577,4.253,4.253,0,0,1-2.578.473A9.38,9.38,0,0,0,4.5,11.342a2.315,2.315,0,0,1,0,4.321,9.177,9.177,0,0,0,1.111,2.676,4.285,4.285,0,0,1,2.573.478,2.317,2.317,0,0,1,.478,2.573A9.236,9.236,0,0,0,11.344,22.5a2.31,2.31,0,0,1,4.313,0,9.182,9.182,0,0,0,2.677-1.111,2.319,2.319,0,0,1,.478-2.573,4.285,4.285,0,0,1,2.573-.478A9.231,9.231,0,0,0,22.5,15.663,2.327,2.327,0,0,1,21.014,13.5Zm-7.472,3.744a3.749,3.749,0,1,1,3.75-3.749A3.748,3.748,0,0,1,13.542,17.242Z'
        />
      </Svg>
    </Animated.View>
  )
}



const s = StyleSheet.create({
  c: {
    width: 30,
    height: 30,
  },
})