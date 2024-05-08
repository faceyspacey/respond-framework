import * as React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import RadioButton from './RadioButton.js'
import { colors } from '../styles.js'


export default React.memo(({
  event,
  name,
  label,
  value,
  options,
  style,
  styleLabel,
  styleRadios,
  styleRadio,
  styleRadioActive,
  styleRadioText,
  styleRadioTextActive,
  styleLeft,
  styleRight,
}) =>
  <View style={[s.c, style]}>
    {label &&
      <Text style={[s.label, styleLabel]}>
        {label}:
      </Text>
    }

    <View style={[s.radios, styleRadios]}>
      {options.map((o, last) =>
        React.createElement(RadioButton, {
          ...o,
          event,
          name,
          key: o.value,
          active: o.value === value,
          style: [styleRadio, last ? [right, styleRight] : [left, styleLeft]],
          styleActive: styleRadioActive,
          styleText: styleRadioText,
          styleTextActive: styleRadioTextActive,
        })
      )}
    </View>
  </View>
)


const left = { borderTopLeftRadius: 5, borderBottomLeftRadius: 5 }
const right = { borderTopRightRadius: 5, borderBottomRightRadius: 5 }



const s = StyleSheet.create({
  c: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 9,
  },
	label: {
    fontSize: 15,
    color: colors.whiteDark,
	},
  radios: {
    flexDirection: 'row',
  },
})