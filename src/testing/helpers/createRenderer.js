import { create, act, } from 'react-test-renderer'
import createNodeMockDefault from './createNodeMock.js'


export default (state, options = {}) => {
  const {
    createNodeMock = createNodeMockDefault,
  } = options

  let rendererInternal
  let prevJson = {}

  const getInternal = () => {
    if (rendererInternal) return rendererInternal
    
    act(() => {
      const app = state.render()
      rendererInternal = create(app, { createNodeMock })
    })

    return rendererInternal
  }

  return {
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