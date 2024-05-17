import * as React from 'react'
import Pressable from '../widgets/Pressable.js'
import Gear from '../icons/Gear.js'
import Layout from './Layout.js'
import { colors } from '../styles.js'
import { isTest } from '../../../utils/bools.js'


export default (props, { toggle }, { open }, { replays }) => {
  if (isTest) return
  const { hide, position } = replays.options
  if (hide) return

  const horizontal = position?.left ? 'left' : 'right'
  const vertical = position?.top ? 'top' : 'bottom'

  const style = { position: 'absolute', [horizontal]: 10, [vertical]: 10 }
  const spin = position?.left ? !open : open

  const color = open ? colors.navy : colors.greyDark
  
  return (
    <>
      <Layout open={open} />

      <Pressable style={style} event={toggle}>
        <Gear spin={spin} color={color} />
      </Pressable>
    </>
  )
}