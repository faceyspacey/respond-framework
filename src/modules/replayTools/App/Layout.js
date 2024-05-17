import * as React from 'react'
import { StyleSheet, Animated } from 'react-native'
import Tabs from '../widgets/Tabs.js'
import LoadingSpinner from '../widgets/LoadingSpinner.js'
import Settings from './Settings.js'
import Tests from './Tests.js'
import Events from './Events.js'
import PersistButton from '../components/PersistButton.js'
import { colors } from '../styles.js'
import useSlide from '../hooks/useSlide.js'


export default ({ open }, events, { tab, loading }, { replays }) => {
  const p = replays.options.position

  const x = p?.left ? 'left' : 'right'
  const y = p?.top ? 'top' : 'bottom'
  
  const d = useSlide(open, width + margin)
  const translateX = p?.left ? d : Animated.multiply(d, -1)

  const backgroundColor = tab === 'events' ? colors.navy : colors.greyDark
  const style = { backgroundColor, [y]: 45, [x]: -width, transform: [{ translateX }] }

  const tabs = [
    { text: 'Settings',  event: events.settings },
    { text: 'Tests',     event: events.tests },
    { text: 'Events',    event: events.events },
  ]

  const Component = components[tab]

  return (
    <Animated.View style={[s.c, style]}>
      <Tabs tabs={tabs} value={tab} />
      <PersistButton />

      <Component />

      {loading && <LoadingSpinner style={s.spinner} />}
    </Animated.View>
  )
}




const width = 355
const margin = 10

const components = {
  settings: Settings,
  tests: Tests,
  events: Events
}


const s = StyleSheet.create({
  c: {
    position: 'absolute',
    width: width,
    height: 600,
    backgroundColor: colors.greyDark,
    borderRadius: 5,
    overflow: 'hidden',
    opacity: .985
  },

  spinner: {
    position: 'absolute',
    top: '40%',
    left: width / 2 - 17,
    width: 34,
    height: 34,
  },
})