import * as React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../styles.js'
import Pressable from './Pressable.js'


export default ({ event, name, message }) =>
  <View style={s.c}>
    <Text style={s.error} numberOfLines={1}>{message}</Text>

    <Pressable event={event} arg={{ name }}>
      <Text style={s.hide}>hide</Text>
    </Pressable>
  </View>




const s = StyleSheet.create({
  c: {
    height: 35,
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 10,
    paddingRight: 8,
    color: colors.tan,
    backgroundColor: colors.redLight,
    borderRadius: 3,
  },
  error: {
    fontSize: 15,
    color: colors.white
  },
  hide: {
    fontSize: 15,
    color: colors.white,
    textDecorationLine: 'underline'
  },
})