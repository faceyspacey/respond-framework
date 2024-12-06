import * as React from 'react'
import { createElement, useState } from 'react'
import { ScrollView, View, StyleSheet } from 'react-native'
import { colors } from '../styles.js'
import Event from '../widgets/Event.js'
import Button from '../widgets/Button.js'


export default (props, { events, evs, evsIndex, divergentIndex, playing }) => {
  const [scrollEnabled, toggleScroll] = useState(true)
  const [potentialNewIndex, setIndex] = useState(null)

  const rows = evs.map((e, i) => createElement(Event, {
    event: events.replayEventsToIndex,
    changeIndex: events.changeIndex,
    skipEvent: events.skipEvent,
    deleteEvent: events.deleteEvent,
    setIndex,
    index: i,
    type: e.event.type,
    arg: e.arg,
    dispatched: i <= evsIndex,
    divergent: i >= divergentIndex && i <= evsIndex,
    openSlot: potentialNewIndex === i,
    skipped: e.meta?.skipped,
    toggleScroll,
    key: i + '_' + (e.dragId ?? ''),
  }))
  
  return (
    <View style={s.c}>
      <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={scrollEnabled}>
        {rows}
      </ScrollView>

      {playing
        ? <Button text='STOP REPLAY' event={events.stopReplay} style={{ backgroundColor: colors.red }} />
        : <Button text='SAVE TEST' event={events.saveTest} style={{ backgroundColor: colors.greenBright }} />
      }
    </View>
  )
}



const s = StyleSheet.create({
  c: {
    flex: 1,
  },
})