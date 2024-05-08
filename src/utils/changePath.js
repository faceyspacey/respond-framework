export default store => e => replace(store.fromEvent(e).pathname + location.search)

export const replace = (url, index = 1) => history.replaceState({ index }, '', url)

export const push = (url, index = 1) => history.pushState({ index }, '', url)