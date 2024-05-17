import Clipboard from '@react-native-clipboard/clipboard'
import { isNative } from './bools.js'

export default text => isNative
  ? Clipboard.setString(text)
  : navigator.clipboard.writeText(text)