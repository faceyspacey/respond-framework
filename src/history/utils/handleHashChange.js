import { prefix as permalinkPrefix } from '../../modules/replayTools/helpers/createPermalink.js'


export default respond => {
  const url = window.location.href

  if (url.indexOf(permalinkPrefix) > -1) {
    window.location.reload() // reload page to trigger permalink change
  }
  else {
    return respond.eventFrom(url).trigger()
  }
}