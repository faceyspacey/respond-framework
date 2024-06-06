import { isNative } from 'respond-framework/utils'
import { cleanLocation } from 'respond-framework/utils/url.js'

export const getUrl = () => cleanLocation(location, () => window.store).url

export const getIndex = () => history.state?.index

export const shouldChange = e => !(isNative || window.ignoreChangePath || e?.changePath === false)