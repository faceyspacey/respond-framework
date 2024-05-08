import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import Pressable from '../widgets/Pressable.js'


export default (props, { togglePersist }, { persist }) =>
  <Pressable style={s.c} event={togglePersist}>
    <View style={persist ? s.enabled : s.disabled} />
  </Pressable>



const s = StyleSheet.create({
  c: {
    position: 'absolute',
    top: 13,
    right: 10,
    width: 16,
    height: 16,
    backgroundColor: 'rgb(72, 72, 72)',
    borderRadius: 8,

    alignItems: 'center',
    justifyContent: 'center',
  },
  enabled: {
    width: 10,
    height: 10,
    backgroundColor: 'rgb(190, 78, 238)',
    borderRadius: 5,
  },
  disabled: {
    width: 10,
    height: 10,
    backgroundColor: 'rgb(123, 123, 123)',
    borderRadius: 5,
  },
})