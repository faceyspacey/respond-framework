import * as React from 'react'
import { Animated, StyleSheet } from 'react-native'
import HoverButton from './HoverButton.js'
import useFlip from '../hooks/useFlip.js'


export default ({ buttons, show, style }) => {
  const { opacity, rotateX } = useFlip(show)
  const styles = [s.c, style, { opacity, transform: [{ rotateX  }] }]

  const last = buttons.length - 1

  const btns = buttons.map((b, i) =>
    React.createElement(HoverButton, {
      ...b,
      key: i,
      first: i === 0,
      last: i === last,
    })
  )

  return <Animated.View style={styles}>{btns}</Animated.View>
}


const s = StyleSheet.create({
  c: {
    position: 'absolute',
    top: 4,
    right: 5,
    height: 24,
    flexDirection: 'row',
    gap: -1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    willChange: 'transform'
  },
})