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


export default ({ open }, events, state, { replays }) => {
  const { tab, loading } = state

  const tabs = [
    { text: 'Settings',  event: events.settings },
    { text: 'Tests',     event: events.tests },
    { text: 'Events',    event: events.events },
  ]

  const Component = components[tab]

  const x = useSlide(open, width)

  const { position } = replays.options
  
  const horizontal = position?.left ? 'left' : 'right'
  const vertical = position?.top ? 'top' : 'bottom'

  const backgroundColor = tab === 'events' ? colors.navy : undefined

  return (
    <Animated.View style={[s.c, { [horizontal]: x, [vertical]: 45, backgroundColor }]}>
      <Tabs tabs={tabs} value={tab} />
      <PersistButton />

      <Component />

      {loading && <LoadingSpinner style={s.spinner} />}
    </Animated.View>
  )
}




const width = 355

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