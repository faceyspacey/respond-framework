import edit from './edit/index.js'
import before from './before.js'
import validate from './validate.js'
import reduce from './reduce.js'
import changePath from './changePath.js'
import optimistic from './optimistic.js'
import fetch from './fetch.js'
import tap from './tap.js'
import submit from './submit.js'
import redirect from './redirect.js'
import end from './end.js'
import after from './after.js'
import auth from './auth.js'


// default plugins

export default [
  edit,
  before,
  validate,
  reduce,
  changePath,
  optimistic,
  fetch,
  tap,
  submit,
  redirect,
  end,
  after,
  auth(),
]