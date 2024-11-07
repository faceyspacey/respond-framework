import * as React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import Button from '../widgets/Button.js'
import Input from '../widgets/Input.js'
import Radio from '../widgets/Radio.js'
import Dropdown from '../widgets/Dropdown.js'
import Link from '../widgets/Link.js'
import respondConfig from '../../../replays/config.default.js'
import ErrorField from '../widgets/ErrorField.js'
import sliceByModulePath from '../../../utils/sliceByModulePath.js'


export default (props, events, { focusedModulePath, respond }) => {
  const respondSettings = createSettings(respondConfig, RespondSettingForm)

  const config = respond.replayConfigsByPaths[focusedModulePath]
  const settings = createSettings(config, UserSettingForm, events.edit, 1)
  
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




const createSettings = (config = {}, FormComponent, event, z = -1) => {
  const fields = Object.keys(config)

  return fields.map((name, i) => {
    const s = config[name]

    const zIndex = -i * z // so Dropdown menus are above subsequent dropdowns

    const Component = s.boolean ? Radio : s.options ? Dropdown : Input
    const props = { ...s, event, name, label: s.label ?? name, key: name, zIndex, Component }

    return React.createElement(FormComponent, props)
  })
}



const RespondSettingForm = ({ Component, name, options, ...props }, events, state) => {
  const { errors } = state

  if (errors[name]) {
    const props = { event: events.removeError, name, message: errors[name] }
    return React.createElement(ErrorField, props)
  }

  return React.createElement(Component, {
    ...props,
    name,
    event: name === 'focusedModulePath' ? events.changeModulePath : events.editRespond,
    value: name === 'focusedModulePath' ? state.focusedModulePath : state.formRespond[name],
    options: typeof options === 'function' ? options(state.formRespond, state) : options || bools
  })
}



const UserSettingForm = ({ Component, name, available, options, ...props }, events, { form, focusedModulePath }) => {
  const modSettings = sliceByModulePath(form, focusedModulePath)

  if (available && !available(modSettings)) return

  return React.createElement(Component, {
    ...props,
    name,
    value: modSettings[name],
    options: typeof options === 'function' ? options(modSettings) : options || bools
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