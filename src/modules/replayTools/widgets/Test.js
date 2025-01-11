import * as React from 'react'
import { memo, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Pressable from './Pressable.js'
import Remove from '../icons/Remove.js'
import Chevron from '../icons/Chevron.js'
import HoverButtons from './HoverButtons.js'
import { colors } from '../styles.js'


export default memo(({ id, name, event, run, open, deleteTest }) => {
  const [hover, set] = useState(false)

  const buttons = [
    { label: 'START', event, arg: { id, index: 0 } },
    { label: 'RUN', event: run, arg: { id } },
    { label: 'OPEN', event: open, arg: { id } },
    { label: 'END', event, arg: { id } }
  ]

  return (
    <View style={s.c} onMouseEnter={() => set(true)} onMouseLeave={() => set(false)}>
      {hover && 
        <Pressable style={s.removeContainer} event={deleteTest} arg={{ id }}>
          <Remove style={s.remove} />
        </Pressable>
      }

      <Pressable event={event} arg={{ id, delay: true }} style={s.textContainer}>
        <Text style={s.text} numberOfLines={1}>
          {name}
        </Text>  
      </Pressable>
      
      <Chevron />

      <HoverButtons buttons={buttons} show={hover} />
    </View>
  )
})



const s = StyleSheet.create({
  c: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.grey,
    paddingRight: 8,
    backfaceVisibility: 'hidden',
  },

  textContainer: {
    width: '96%',
    height: '100%',
    paddingLeft: 17,
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    lineHeight: 16,
    color: colors.white,
    maxWidth: 312,
  },

  chevron: {
    opacity: .6,
  },

  removeContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    justifyContent: 'center',
    paddingTop: 2,
    zIndex: 2,
  },
  remove: {
    width: 18,
    height: 18
  },
})