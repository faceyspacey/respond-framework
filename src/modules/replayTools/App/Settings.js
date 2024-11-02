import * as React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import Button from '../widgets/Button.js'
import Input from '../widgets/Input.js'
import Radio from '../widgets/Radio.js'
import Dropdown from '../widgets/Dropdown.js'
import Link from '../widgets/Link.js'
import respondConfig from '../../../replays/config.default.js'
import sliceByModulePath, { findByModulePath } from '../../../utils/sliceByModulePath.js'


export default (props, events, { topState, formRespond }) => {
  const respondSettings = createSettings(events.editRespond, respondConfig, RespondSetting, -1)

  const { replays } = sliceByModulePath(topState, formRespond.module).respond
  const settings = createSettings(events.edit, replays.config, UserSetting)

  
  return (
    <View style={s.c}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {respondSettings}
        <View style={s.divider} />
        {settings}
        <Link style={s.link} event={events.openPermalink}>share settings permalink</Link>
      </ScrollView>

      <Button text='RELOAD' event={events.reload} />
    </View>
  )
}


const createSettings = (event, config, FormComponent, z = 1) => {
  const fields = Object.keys(config)

  return fields.map((name, i) => {
    const s = config[name]

    const zIndex = -i * z // so Dropdown menus are above subsequent dropdowns

    const Component = s.boolean ? Radio : s.options ? Dropdown : Input
    const props = { ...s, event, name, label: s.label ?? name, key: name, zIndex, Component }

    return React.createElement(FormComponent, props)
  })
}


const RespondSetting = ({ Component, name, options }, events, state) => {
  const { formRespond: form } = state

  return React.createElement(Component, {
    ...props,
    value: form[name],
    options: typeof options === 'function' ? options(form, state) : options || bools
  })
}


const UserSetting = ({ Component, name, available, options }, events, state) => {
  const { form, formRespond } = state
  const mod = findByModulePath(form, formRespond.module) ?? {}

  if (available && !available(mod)) return

  return React.createElement(Component, {
    ...props,
    value: mod[name],
    options: typeof options === 'function' ? options(mod, state) : options || bools
  })
}


const bools = [{ value: true, text: 'True' }, { value: false, text: 'False' }]


const s = StyleSheet.create({
  c: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 10,
  },
  link: {
    alignItems: 'center',
    marginVertical: 10
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(149, 150, 153, .27)',
    marginHorizontal: 3,
    marginTop: 12,
    marginBottom: 4
  }
})