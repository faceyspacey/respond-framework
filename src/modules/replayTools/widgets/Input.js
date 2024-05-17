import * as React from 'react'
import { useCallback, memo, forwardRef } from 'react'
import { TextInput, StyleSheet } from 'react-native'
import { colors } from '../styles.js'


export default memo(forwardRef(({
  event,
  name,
  value: v,
  formatIn = v => v,
  format = v => v,
  formatOut = format,
  style,
  placeholder,
  placeholderStyle,
  disabled,
  returnKeyType = 'done',
}, ref) => {
  const value = String(formatIn(v) || '')

  const onChangeText = v => {
    if (disabled) return

    const next = formatOut(v)
    if (next === value) return

    event.dispatch({ [name]: next }, { input: true, trigger: true })
  }

  return React.createElement(TextInput, {
    ref,
    style: [s.input, style, !value && s.placeholder, !value && placeholderStyle, disabled && s.disabled],
    placeholder: placeholder || name,
    placeholderTextColor: placeholderStyle?.color || s.placeholder.color,
    value,
    onChangeText: useCallback(onChangeText, [event, name, value, disabled]),
    returnKeyType,
    editable: !disabled,
  })
}))





const s = StyleSheet.create({
  input: {
    fontSize: 15,
    height: 35,
    paddingLeft: 12,
    color: colors.tan,
    backgroundColor: colors.navy,
    borderRadius: 3,
    marginTop: 9,
  },
  placeholder: {
    color: colors.greyLight
  },
  disabled: {
    backgroundColor: 'rgb(238, 238, 238)',
  },
})