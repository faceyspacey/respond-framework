import { isNative, isTest, isDev } from 'respond-framework/utils'
import sessionStorage from 'respond-framework/utils/sessionStorage.js'
import bs from '../browserState.js'
import { createTrap, removeTrap } from '../createTrap.js'
import { addPopListener, removePopListener } from './popListener.js'


export const back = async () => {
  removeTrap()

  return new Promise(res => {
    const listener = () => {
      removePopListener(listener)
      createTrap()
      res()
    }

    addPopListener(listener)
    history.back()
  })
}


export const forward = async () => {
  removeTrap()

  await new Promise(res => {
    const listener = () => {
      removePopListener(listener)
      createTrap()
      res()
    }

    addPopListener(listener)
    history.forward()
  })
}


export const go = async delta => {
  removeTrap()

  return new Promise(res => {
    const listener = () => {
      removePopListener(listener)
      createTrap()
      res()
    }

    addPopListener(listener)
    history.go(delta)
  })
}


export const hydrateFromSessionStorage = () => {
  const state = JSON.parse(sessionStorage.getItem('browserState'))
  Object.assign(bs, state)
}


export const isPopDisabled = store => {
  if (isTest || isNative || window.isReplay) return true
  if (isDev && !store.options.enablePopsInDevelopment) return true
  return !store.events.pop
}