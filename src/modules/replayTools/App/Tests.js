import * as React from 'react'
import { createElement, useEffect, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { colors } from '../styles.js'
import Radio from '../widgets/Radio.js'
import Test from '../widgets/Test.js'
import SearchInputForm, { s as rs } from '../components/SearchInputForm.js'
import { isNative } from '../../../helpers/constants.js'
import { ModuleDropdown } from './Settings.js'


export default (props, state) => {
  const { events, testsList, sort, branch } = state
  const ref = useRef()

  useEffect(() => {
    if (isNative) return
    ref.current.focus()
  }, [])

  return (
    <View style={s.c}>
      <View style={s.row}>
        <ModuleDropdown style={{ width: '65.8%', marginHorizontal: 0, marginTop: 0, zIndex: 0 }} />

        <Radio
          options={sortOptions}
          event={events.sortTests}
          name='sort'
          value={sort}
          style={rs.radios}
          styleLeft={rs.left}
          styleRight={rs.right}
        />
      </View>

      <SearchInputForm ref={ref} />

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {testsList.map(id => createElement(Test, {
          event: events.test,
          run: events.runTestInTerminal,
          id,
          key: id,
          deleteTest: events.deleteTest,
          name: stripBranchDir(branch, id),
        }))}

        {testsList.length === 0 && !state.loading && <Text style={s.none}>no tests found</Text>}
      </ScrollView>
    </View>
  )
}


const sortOptions = [{ value: 'az', text: 'A-Z' }, { value: 'recent', text: 'Recent' }]


const stripBranchDir = (a, b) =>
  a ? b.replace(new RegExp(`^${a.replace(/\./, '/')}\/?`), '') : b




const s = StyleSheet.create({
  c: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    marginBottom: -1,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 10,
    marginTop: 9,
    marginBottom: 8,
    zIndex: 1,
  },
  radio: {
    height: 26,
  },


  spinner: {
    top: '40%',
    left: '50%',
  },

  none: {
    fontSize: 16,
    lineHeight: 16,
    color: colors.white,
    alignSelf: 'center',
    marginTop: 180,
  },
})