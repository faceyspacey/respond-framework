import * as React from 'react'
import { View, StyleSheet } from 'react-native'
import Radio from '../widgets/Radio.js'
import Input from '../widgets/Input.js'


export default (props, { filterTests, toggleFilter }, { searched, filter }, _, ref) =>
  <View style={s.c}>
    <Input
      event={filterTests}
      name='searched'
      value={searched}
      style={s.input}
      placeholder={filter === 'tests' ? 'search tests' : 'search snaps /regex/'}
      ref={ref}
    />

    <Radio
      options={filterOptions}
      event={toggleFilter}
      name='filter'
      value={filter}
      label={null}
      style={s.radios}
      styleLeft={s.left}
      styleRight={s.right}
    />
  </View>





const filterOptions = [{ value: 'tests', text: 'Tests' }, { value: 'snaps', text: 'Snaps' }]




const s = StyleSheet.create({
  c: {
    marginHorizontal: 12,
    height: 35,
    marginBottom: 2,
  },

  input: {
    marginTop: 0,
  },

  radios: {
    position: 'absolute', 
    right: 0,
    top: 0,
    justifyContent: 'flex-end',
    width: 1,
    height: '100%',
    marginTop: 0,
  },

  left: { borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
  right: { borderTopRightRadius: 3, borderBottomRightRadius: 3 }
})