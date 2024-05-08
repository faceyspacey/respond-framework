import * as React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useStore } from '../respond.js'
import Button from '../widgets/Button.js'
import Input from '../widgets/Input.js'
import Radio from '../widgets/Radio.js'
import Dropdown from '../widgets/Dropdown.js'
import Link from '../widgets/Link.js'
import configDefault from '../../../replays/config.default.js'
import createOptions from '../helpers/createOptions.js'


export default (props, events) => {
  const { replays } = useStore()
  const settings = createSettings(events.edit, replays.config)

  return (
    <View style={s.c}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {settings}
        <Link style={s.link} event={events.openPermaLink}>share settings permalink</Link>
      </ScrollView>

      <Button text='RELOAD!!!!' event={events.reload} />
    </View>
  )
}


const createSettings = (event, config) => {
  const fields = orderSettings(config)

  return fields.map((name, i) => {
    const s = config[name]

    const zIndex = fields.length - i // so Dropdown menus are above subsequent dropdowns

    const Component = s.boolean ? Radio : s.options ? Dropdown : Input
    const props = { ...s, event, name, label: name, key: name, zIndex, Component }

    return React.createElement(FormComponent, props)
  })
}


const FormComponent = (props, events, { form }, store) => {
  if (props.available && !props.available(form)) return
  
  const value = form[props.name]
  const options = createOptions(props.name, props.options, form, store)
  
  return React.createElement(props.Component, { ...props, value, options })
}



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
})





// helpers

const orderSettings = config => {
  const builtIns = Object.keys(configDefault)
  const keys = Object.keys(config).filter(k => !builtIns.includes(k))

  const radios = keys.filter(k => config[k].boolean)
  const radiosBuiltin = builtIns.filter(k => config[k].boolean)

  const dropdowns = keys.filter(k => config[k].options)
  const dropdownsBuiltin = builtIns.filter(k => config[k].options)

  const inputs = keys.filter(k => !config[k].boolean && !config[k].options)
  const inputsBuiltin = builtIns.filter(k => !config[k].boolean && !config[k].options)

  return [...radios, ...radiosBuiltin, ...dropdownsBuiltin, ...dropdowns, ...inputs, ...inputsBuiltin]
}