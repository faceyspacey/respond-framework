// default plugins

// event.transform (built-in to events)
export { default as trigger } from './trigger.js'
export { default as edit } from './edit/index.js'
export { markPop } from './history.js'
export { markCached } from './fetch.js'
export { default as before } from './before.js'
export { default as validate } from './validate.js'
export { default as reduce } from './reduce.js'
// event.mutate (built-in to reduce)
// event.mutateAfter (built-in to reduce)
export { default as changePath } from './changePath.js'
export { default as custom } from './custom.js'
export { default as optimistic } from './optimistic.js'
export { default as fetch } from './fetch.js'
// event.cache (built-in to fetch)
export { default as tap } from './tap.js'
export { default as submit } from './submit.js'
export { default as redirect } from './redirect.js'
export { default as end } from './end.js'
export { default as after } from './after.js'
export { default as auth } from './auth.js'


// additional common plugins

export { default as initialData } from './initialData.js'
export { default as parallel } from './parallel.js'
export { requireCondition, requireUser, requireAdmin } from './require.js'
export { default as leave } from './leave.js'
// event.beforeLeave (built-in to leave)
// event.afterLeave (built-in to leave)