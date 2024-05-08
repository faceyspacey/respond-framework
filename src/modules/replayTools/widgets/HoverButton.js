import * as React from 'react'
import { Text, StyleSheet } from 'react-native'
import Pressable from './Pressable.js'
import { colors } from '../styles.js'


export default React.memo(({ label, first, last, ...props }) =>
  <Pressable {...props} styleHover={s.hover} style={[s.c, first && s.l, last && s.r]}>
    <Text style={s.label}>{label}</Text>
  </Pressable>
)



const s = StyleSheet.create({
  c: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: colors.blackLight,
    borderColor: colors.greyLight,
    paddingHorizontal: 8,
  },
  
  l: { borderTopLeftRadius: 5, borderBottomLeftRadius: 5 },
  r: { borderTopRightRadius: 5, borderBottomRightRadius: 5 },

  hover: {
    backgroundColor: colors.grey
  },

  label: {
    fontSize: 12,
    lineHeight: 12,
	  color: colors.white,
    textAlign: 'center',
  },
})