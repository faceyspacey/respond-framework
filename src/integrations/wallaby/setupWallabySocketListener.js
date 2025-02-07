import * as io from 'socket.io-client'
import { isDev, isNative } from '../../helpers/constants.js'


export default () => {
  if (!isDev || isNative) return
  if (typeof io !== 'function') return
  
  const socket = io()

  socket.on('wallaby', ({ test, index, delay }) => {
    console.log('respond: running test from Wallaby!', { test, index, delay })
    window.state?.events?.replayTools.testFromWallaby.dispatch({ test, index, delay })
  })
}