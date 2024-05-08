import * as React from 'react'
import { Text, StyleSheet } from 'react-native'
import Pressable from './Pressable.js'
import { colors } from '../styles.js'


export default ({ event, text, active }) => {
  const sc = active ? text === 'Events' ? s.cae : s.ca : s.c
  const a2 = active
  return (
    <Pressable style={sc} event={event} disabled={active}>
      <Text style={a2 ? s.ta : s.t} numberOfLines={1}>{text}</Text>
    </Pressable>
  )
}



const s = StyleSheet.create({
  c: {
    flex: 1,
    paddingVertical: 10,
  },
  ca: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.greyDark,
  },
  cae: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.navy,
  },

  t: {
    fontSize: 15,
    textAlign: 'center',
    color: colors.whiteDark,
  },
  ta: {
    fontSize: 15,
    textAlign: 'center',
    color: 'white',
  },
})