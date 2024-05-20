import * as React from 'react'
import { useState, memo, useCallback } from 'react'
import { Animated, View, Text, StyleSheet } from 'react-native'
import { colors } from '../styles.js'
import Chevron from '../icons/Chevron.js'
import HoverButtons from './HoverButtons.js'
import Pressable from './Pressable.js'
import Remove from '../icons/Remove.js'
import useDragAndDrop from '../hooks/useDragAndDrop.js'


export default memo((({ event, changeIndex, skipEvent, deleteEvent, index, type, arg, dispatched, divergent, skipped, setIndex, openSlot, toggleScroll }) => {
  const [hover, set] = useState(false)
  const [longPressing, setLongPress] = useState(false)

  const dndProps = useDragAndDrop(index, height, changeIndex, setIndex, openSlot, toggleScroll, longPressing)

  let a = arg && Object.keys(arg).length > 0 && JSON.stringify(arg)
  a = a?.length === 2 ? undefined : a // remove possible undefined keys

  const color = skipped ? colors.white : divergent ? colors.pink : dispatched ? colors.money : colors.white

  const styles = [s.c, skipped && s.skipped]
  const stylesText = [s.text, { color }, a && { marginTop: -10 }]

  const stylesIcon = [s.iconContainer, a && { marginTop: -5 }]

  const buttons = [
    { label: 'JUMP', event, arg: { index, delay: true } },
    { label: skipped ? 'UNSKIP' : 'SKIP', event: skipEvent, arg: { index } },
  ]

  const top = a ? 9 : 7

  const onLongPress = useCallback(() => setLongPress(true))
  const onPressOut = useCallback(() => setLongPress(false))
  
  return (
    <Animated.View {...dndProps}>
      <View style={styles} onMouseEnter={() => set(true)} onMouseLeave={() => set(false)}>
        <Pressable style={s.press} event={event} arg={{ index }} onLongPress={onLongPress} onPressOut={onPressOut}>
          <View style={s.line1}>
            {hover
              ? <Pressable style={stylesIcon} event={deleteEvent} arg={{ index }}>
                  <Remove style={s.remove} color={color} strokeWidth={2} />
                </Pressable> 
              : <View style={stylesIcon}>
                  <Text style={{ color }}>{'>>'}</Text>
                </View>
            }
            
            <Text style={stylesText} numberOfLines={1}>{type}</Text>
          </View> 

          <Text style={s.subtext} numberOfLines={1}>
            {a}
          </Text>  
        </Pressable>
        
        <Chevron /> 

        <HoverButtons buttons={buttons} show={hover} style={{ height: 30, top }} />
      </View>
    </Animated.View>
  )
}))



const height = 50

const s = StyleSheet.create({
  c: {
    height,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.grey,
    paddingRight: 5,
  },
  skipped: {
    backgroundColor: 'rgba(108, 110, 117, .6)',
    borderBottomColor: 'rgb(130, 130, 130)'
  },
  press: {
    width: '96%',
    height: '100%',
    paddingLeft: 10,
    justifyContent: 'center',
    cursor: 'pointer',
  },
  line1: {
    height: '100%',
    justifyContent: 'center'
  },
  text: {
    fontSize: 14,
    lineHeight: 14,
    color: colors.white,
    maxWidth: 300,
    paddingLeft: 21,
  },
  subtext: {
    position: 'absolute',
    bottom: 4,
    left: 30,
    fontSize: 13,
    color: colors.tan,
    maxWidth: 302,
  },
  chevron: {
    opacity: .6,
  },

  iconContainer: {
    position: 'absolute',
    left: 0,
    top: -1,
    height: '100%',
    justifyContent: 'center',
    zIndex: 2,
  },

  remove: { width: 24, height: 24, marginTop: 2, marginLeft: -4 },
})