import * as React from 'react'
import { View, StyleSheet } from 'react-native'
import Radio from '../widgets/Radio.js'
import Input from '../widgets/Input.js'
import Remove from '../icons/Remove.js'
import Pressable from '../widgets/Pressable.js'


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

    {searched &&
      <Pressable style={s.remove} event={filterTests} arg={{ value: '' }}>
        <Remove color='rgba(255, 255, 255, .65)' />
      </Pressable>
      }

    <Radio
      options={filterOptions}
      event={toggleFilter}
      name='filter'
      value={filter}
      style={s.radios}
      styleLeft={s.left}
      styleRight={s.right}
    />
  </View>





const filterOptions = [{ value: 'tests', text: 'Tests' }, { value: 'snaps', text: 'Snaps' }]




export const s = StyleSheet.create({
  c: {
    marginHorizontal: 10,
    height: 35,
    marginBottom: 2,
  },

  input: {
    marginTop: 0,
    paddingRight: 144,
  },

  remove: {
    position: 'absolute',
    top: 7,
    right: 122,
    width: 23,
    height: 23,
  },

  radios: {
    position: 'absolute', 
    right: 0,
    top: 0,
    justifyContent: 'flex-end',
    height: '100%',
    marginTop: 0,
  },

  left: { width: 56, borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
  right: { width: 60, borderTopRightRadius: 3, borderBottomRightRadius: 3 }
})