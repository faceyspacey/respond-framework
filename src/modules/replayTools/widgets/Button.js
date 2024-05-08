import * as React from 'react'
import { Text, StyleSheet } from 'react-native'
import Pressable from './Pressable.js'
import { colors } from '../styles.js'


export default React.memo(({ event, arg, style, styleText, text, children }) =>
  <Pressable style={[s.c, style]} event={event} arg={arg}>
    <Text style={[s.text, styleText]}>
      {text || children}
    </Text>
  </Pressable>
)


const s = StyleSheet.create({
  c: {
    height: 40,
    padding: 10,
    borderRadius: 5,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
  },
  text: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
  },
})