import { create, act, } from 'react-test-renderer'
import createNodeMockDefault from './createNodeMock.js'


export default (respond, opts = {}) => ({
  async createOnce() {
    if (this._renderer) return // for performance and to match the rendering of a real app, we create renderer after first trigger event

    await act(async () => {
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