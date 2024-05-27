import { isNative } from '../../utils/bools.js'
import { cleanLocation } from '../../utils/url.js'


export const replace = (url, index = 1) => history.replaceState({ index }, '', url)

export const push = (url, index = 1) => history.pushState({ index }, '', url)

export const getUrl = () => cleanLocation(location).url

export const getIndex = () => history.state?.index

export const shouldChange = e => !(isNative || window.ignoreChangePath || e.changePath === false)