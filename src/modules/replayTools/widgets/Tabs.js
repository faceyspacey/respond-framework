import * as React from 'react'
import { View, StyleSheet } from 'react-native'
import { memo } from '../../../utils/isEqual.js'
import Tab from './Tab.js'
import { colors } from '../styles.js'


const tab = ({ tabs, value }) =>
  <View style={s.c}>
    {tabs.map(t =>
      <Tab {...t} key={t.text} active={t.event.name === value} />
    )}
  </View>


export default memo(tab, 'tabs')


const s = StyleSheet.create({
  c: {
    width: '100%',
    height: 38,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    position: 'relative',
    flexWrap: 'wrap',
    backgroundColor: colors.blackLight,
  },
})