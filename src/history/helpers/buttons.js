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