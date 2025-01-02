import { create, act, } from 'react-test-renderer'
import createNodeMockDefault from './createNodeMock.js'


export default (respond, opts = {}) => ({
  async render() {
    if (!this._renderer) this.create() // for performance and to match the rendering of a real Respond app, we create renderer after first trigger event
    else act(() => respond.commit())  // after, reactivity will handle subsequent renders, but we assume control for precision batching here (similar to queueNotification.js in a real app)
  },

  create() {
    act(() => {
      const app = respond.render()
      const createNodeMock = opts.createNodeMock ?? createNodeMockDefault
      this._renderer = create(app, { createNodeMock })
    })

    this.root = this._renderer.root
  },
  toJSON() {
    return this.prevJson = this._renderer.toJSON()
  },
  toPrevNextJSON() {
    const prev = this.prevJson
    const next = this.prevJson = this._renderer.toJSON()
    return { prev, next }
  }
})