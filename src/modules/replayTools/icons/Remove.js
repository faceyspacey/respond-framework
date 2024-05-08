import * as React from 'react'
import { View } from 'react-native'
import Svg, { Line, Path } from 'react-native-svg'
import { colors } from '../styles.js'


export default ({ style, color = 'white', strokeWidth = 1 }) => 
  <View style={style}>
    <Svg viewBox='0 0 19 19' fill='none'>
      <Path
        stroke={color}
        strokeWidth={strokeWidth}
        d='M5.41421 5L14 13.5858'
      />
      <Path
        d='M14 5l-8.5 8.5'
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  </View>