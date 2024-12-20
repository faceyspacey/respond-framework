import { create, act, } from 'react-test-renderer'
import createNodeMockDefault from './createNodeMock.js'


export default (respond, options = {}) => {
  const {
    createNodeMock = createNodeMockDefault,
  } = options

  let rendererInternal
  let prevJson = {}

  const getInternal = () => rendererInternal

  const createOnce = async () => {
    if (rendererInternal) return
    
    await act(async () => {
      const app = respond.render()
      rendererInternal = create(app, { createNodeMock })
    })
  }

  return {
    createOnce,
    getInternal,
    toJSON: () => getInternal().toJSON(),
    toNextJSON: () => prevJson = getInternal().toJSON(),
    toPrevNextJSON: () => {
      const prev = prevJson
      const next = prevJson = getInternal().toJSON()
      return { prev, next }
    }
  }
}