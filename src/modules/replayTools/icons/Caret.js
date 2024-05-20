import * as React from 'react'
import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'


export default ({ color = 'rgb(172, 172, 172)', style, size = 14 }) =>
  <View style={[{ width: size, height: size, marginTop: 6 }, style]}>
    <Svg fill='none' viewBox='0 0 12 7'>
      <Path
        d='M1 1L5.29289 5.29289C5.68342 5.68342 6.31658 5.68342 6.70711 5.29289L11 1'
        stroke={color}
        strokeWidth={1}
      />
    </Svg>
  </View>