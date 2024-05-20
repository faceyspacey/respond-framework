import * as React from 'react'
import { createElement, useEffect, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useStore } from '../respond.js'
import { colors } from '../styles.js'
import Radio from '../widgets/Radio.js'
import Test from '../widgets/Test.js'
import SearchInputForm from '../components/SearchInputForm.js'
import createModuleOptions from '../helpers/createModuleOptions.js'
import { isNative } from '../../../utils/bools.js'


export default (props, events, state) => {
  const { testsList, sort, includeChildren } = state

  const { replays } = useStore()
  const modulePath = replays.settings.module || ''

  const ref = useRef()

  useEffect(() => {
    if (isNative) return
    ref.current.focus()
  }, [])

  return (
    <View style={s.c}>
      <View style={s.row}>
        <Radio
          options={useMemo(() => createModuleOptions(modulePath), [])}
          event={events.includeChildModuleTests}
          name='includeChildren'
          value={includeChildren}
          styleRadio={s.radio}
        />

        <Radio
          options={sortOptions}
          event={events.sortTests}
          name='sort'
          value={sort}
          styleRadio={s.radio}
        />
      </View>

      <SearchInputForm ref={ref} />

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {testsList.map(id => createElement(Test, {
          event: events.test,
          run: events.runTestInTerminal,
          id,
          key: id,
          modulePath,
          deleteTest: events.deleteTest,
        }))}

        {testsList.length === 0 && !state.loading && <Text style={s.none}>no tests found</Text>}
      </ScrollView>
    </View>
  )
}


const sortOptions = [{ value: 'az', text: 'A-Z' }, { value: 'recent', text: 'Recent' }]


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
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 7,
    marginBottom: 8
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