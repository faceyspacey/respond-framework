import * as React from 'react'
import { createElement, useState, useEffect, useRef } from 'react'
import { ScrollView, View, StyleSheet } from 'react-native'
import { colors } from '../styles.js'
import Event from '../widgets/Event.js'
import Button from '../widgets/Button.js'


export default (props, { events, evs, evsIndex, divergentIndex, playing, selectedTestId }) => {
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
    divergent: selectedTestId && i >= divergentIndex && i <= evsIndex,
    openSlot: potentialNewIndex === i,
    skipped: e.meta?.skipped,
    toggleScroll,
    key: i + '_' + (e.dragId ?? ''),
  }))

  const ref = useRef()

  useEffect(() => {
    if (evsIndex === 0)                   ref?.current?.scrollTo({ y: 0, animated: false })
    else if (evsIndex === evs.length - 1) ref?.current?.scrollTo({ y: 100000000, animated: false }) // scrolls to bottom after each new event, so you can see it
  }, [evsIndex, evs.length])
  
  return (
    <View style={s.c}>
      <ScrollView ref={ref} showsVerticalScrollIndicator={false} scrollEnabled={scrollEnabled}>
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