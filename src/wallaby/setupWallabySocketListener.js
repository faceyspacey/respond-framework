import * as io from 'socket.io-client'
import isNative from '../utils/isNative.js'


export default () => {
  if (process.env.NODE_ENV !== 'development' || isNative) return

  const socket = io()

  socket.on('wallaby', ({ test, index, delay }) => {
    console.log('respond: running test from Wallaby', { test, index, delay })
    window.store?.events.replayTools.testFromWallaby.dispatch({ test, index, delay })
  })
}