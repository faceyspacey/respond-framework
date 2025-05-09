import * as React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import Button from '../widgets/Button.js'
import Input from '../widgets/Input.js'
import Radio from '../widgets/Radio.js'
import Dropdown from '../widgets/Dropdown.js'
import Link from '../widgets/Link.js'
import respondConfig from '../config.default.js'
import ErrorField from '../widgets/ErrorField.js'



export default (props, { events, focusedBranch, configs }) => {
  const urlInput = createSettings({ url: respondConfig.url }, RespondSettingForm)

  const config = configs[focusedBranch]
  const settings = createSettings(config, UserSettingForm, events.edit)
  
  return (
    <View style={s.c}>
      <View style={s.config}>
        <ModuleDropdown />
        {urlInput}
      </View>
      
      <View style={s.divider} />

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {settings}
        <Link style={s.link} event={events.openPermalink}>share settings permalink</Link>
      </ScrollView>

      <Button text='RELOAD' event={events.reload} />
    </View>
  )
}




const createSettings = (config = {}, FormComponent, event) => {
  const fields = Object.keys(config)

  return fields.map((name, i) => {
    const c = config[name]

    const zIndex = fields.length - i // so Dropdown menus are above subsequent dropdowns

    const Component = c.boolean ? Radio : c.options ? Dropdown : Input
    const props = { ...c, event, name, label: c.label ?? name, key: name, zIndex, Component }

    return React.createElement(FormComponent, props)
  })
}


export const ModuleDropdown = ({ style }, { events, focusedBranch, respond }) =>
  React.createElement(Dropdown, {
    name: 'focusedBranch',
    event: events.changeBranch,
    value: focusedBranch,
    options: respond.branchNames.map(v => ({ value: v, label: v || 'top' })),
    createLabel: o => 'module: ' + (o?.value || 'top'),
    style
  })



const RespondSettingForm = ({ Component, name, options, ...props }, state) => {
  const { errors, events, config } = state

  if (errors[name]) {
    const props = { event: events.removeError, name, message: errors[name] }
    return React.createElement(ErrorField, props)
  }

  return React.createElement(Component, {
    ...props,
    name,
    event: events.editConfig,
    value: config[name],
    options: typeof options === 'function' ? options(config, state) : options || bools,
    zIndex: props.zIndex + 1000,
  })
}



const UserSettingForm = ({ Component, name, available, options, ...props }, { settings, focusedBranch }) => {
  const modSettings = settings[focusedBranch]

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
  config: {
    zIndex: 1000,
    marginHorizontal: 10,
  },

  scroll: {
    flex: 1,
    paddingHorizontal: 10,
    marginTop: -10
  },
  link: {
    alignItems: 'center',
    marginVertical: 10
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(149, 150, 153, .27)',
    marginHorizontal: 3,
    marginTop: 9,
    marginBottom: 10,
    marginHorizontal: 11,
  }
})