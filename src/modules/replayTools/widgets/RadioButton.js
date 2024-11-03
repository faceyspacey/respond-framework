import * as React from 'react'
import { Text, StyleSheet } from 'react-native'
import Pressable from './Pressable.js'
import { colors } from '../styles.js'


export default ({ event, name, value, text, active, style, styleActive, styleText, styleTextActive }) =>
  <Pressable
    event={event}
    arg={{ [name]: value }}
    name={name}
    disabled={active}
    style={[s.c, style, active && s.active, active && styleActive]}
  >
    <Text style={[s.text, styleText, active && styleTextActive]}>
      {text}
    </Text>
  </Pressable>



const s = StyleSheet.create({
  c: {
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: colors.blackLight,
    borderColor: colors.greyLight,
    paddingHorizontal: 10,
  },

  active: {
    backgroundColor: colors.grey,
  },
  
  text: {
    fontSize: 14,
    lineHeight: 14,
	  color: colors.white,
    textAlign: 'center',
  },
})