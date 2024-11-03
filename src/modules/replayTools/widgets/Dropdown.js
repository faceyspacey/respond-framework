import * as React from 'react'
import { useState, memo, useCallback } from 'react'
import { Text, StyleSheet, ScrollView } from 'react-native'
import Pressable from './Pressable.js'
import { colors } from '../styles.js'
import Caret from '../icons/Caret.js'
import findSelectedOption from '../helpers/findSelectedOption.js'
import useClickOut from '../hooks/useClickOut.js'


export default memo(({
  event,
  name,
  value,
  options = [],
  disabled,
  createLabel = o => name + ': ' + (o?.label || o?.value || 'none'),
  selectedOption = findSelectedOption,
  transformOptions = options => options,
  zIndex = 1,
  style,
  styleLabel,
  styleMenu,
  styleOption,
  styleOptionLabel,
  styleDefaultOption,
  styleDisabled,
}) => {
  const [open, set] = useState(false)
  const toggle = useCallback(() => set(open => !open), [set])

  const opts = transformOptions(options, value)

  const selected = selectedOption(opts, value)
  const label = createLabel(selected)

  const styles = [s.c, style, disabled && s.disabled, disabled && styleDisabled, { zIndex }]
  const stylesLabel = [s.label, styleLabel, !selected && styleDefaultOption]

  const ref = useClickOut(set, open) // close menu on click out

  return (
    <Pressable onPress={toggle} style={styles} disabled={disabled} ref={ref}>
      <Text style={stylesLabel} numberOfLines={1}>{label}</Text>
      <Caret />

      {open &&
        <ScrollView style={[s.menu, styleMenu]}>
          {opts.map((o, i) => (
            <Option
              {...o}
              key={i}
              last={i === opts.length - 1}
              name={name}
              onPress={toggle}
              event={event}
              styleOption={styleOption}
              styleOptionLabel={styleOptionLabel}
            />
          ))}
        </ScrollView>
      }
    </Pressable>
  )
})




const Option = ({ name, value, label = value, onPress, event, last, styleOption, styleOptionLabel }) => {
  const styles = [s.option, styleOption, last && { borderBottomWidth: 0 }]
  const stylesLabel = [s.optionLabel, styleOptionLabel]

  const arg = { [name]: value }

  return (
    <Pressable style={styles} event={event} arg={arg} onPress={onPress} name={name}>
      <Text style={stylesLabel}>{label}</Text>
    </Pressable>
  )
}



const s = StyleSheet.create({
  c: {
    position: 'relative',
    height: 35,
    marginTop: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 5,
    backgroundColor: colors.navy,
  },

  menu: {
    position: 'absolute',
    zIndex: 1,
    top: 35,
    left: 0,
    width: '100%',
    maxHeight: 35 * 4,
    backgroundColor: colors.blackLight,
    borderColor: colors.grey,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
    borderBottomRightRadius: 5,
    borderBottomLeftRadius: 5,
    opacity: 1,
  },

  option: {
    width: '100%',
    height: 35,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 12,
    backgroundColor: colors.greyDark,
    borderColor: colors.grey,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  label: {
    fontSize: 15,
    color: colors.tan,
  },
  optionLabel: {
    fontSize: 15,
    color: colors.turqoise,
  },

  disabled: {
    backgroundColor: colors.grey,
  },
})