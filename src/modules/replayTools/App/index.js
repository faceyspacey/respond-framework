import * as React from 'react'
import Pressable from '../widgets/Pressable.js'
import Gear from '../icons/Gear.js'
import Layout from './Layout.js'
import { colors } from '../styles.js'


const ReplayTools = (props, { toggle }, { open }, { replays }) => {
  const { hide, position } = replays.options
  if (process.env.NODE_ENV !== 'development' || hide) return

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


export default process.env.NODE_ENV !== 'development' ? function() {} : ReplayTools