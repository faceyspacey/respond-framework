import * as React from 'react'
import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { colors } from '../styles.js'


export default ({ color = colors.white, style, size = 14 }) => 
  <View style={[{ width: size, height: size }, style]}>
    <Svg fill='none' viewBox='0 0 9 12'>
      <Path
        d='M1.15387 11L5.15368 7.13352C5.56032 6.74043 5.56032 6.08862 5.15368 5.69554L1.15387 1.82906'
        stroke={color}
        strokeWidth={1}
      />
    </Svg>
  </View>

