import { _parent } from '../reserved.js'

export default function () {
  return this[_parent].token
}