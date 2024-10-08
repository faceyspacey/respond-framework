import { createReviver } from './revive.js'

export default (obj, store) => obj && JSON.parse(JSON.stringify(obj), createReviver(store))