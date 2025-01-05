import { _parent } from '../reserved.js'

export default function token() {
  return this[_parent].token
}

export function userId() {
  return this[_parent].userId
}

export function adminUserId() {
  return this[_parent].adminUserId
}

export function adminUser() {
  return this[_parent].adminUser
}