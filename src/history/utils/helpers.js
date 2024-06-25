import { isNative } from '../../utils.js'

export const getIndex = () => history.state?.index

export const shouldChange = e => !(isNative || window.ignoreChangePath || e?.changePath === false)