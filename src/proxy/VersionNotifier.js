import queueNotification from './helpers/queueNotification.js'


export class VersionNotifier {
  version = highestVersion
  parents = new Set

  constructor(obj) {
    this.obj = obj
    this.notify = this.notify.bind(this) // needs unique ref with `this` context to be passed as callback to children
  }

  notify(version = ++highestVersion, branch = this.branch) {
    if (this.version === version) return // can happen if proxy exists in multiple places, in which case the version notification has already been sent to the top by the first reference
    this.version = version
    this.parents.forEach(notify => notify(version, branch))
  }
}




export class VNModule extends VersionNotifier {
  constructor(obj) {
    super(obj)
    this.branch = obj.respond.branch // only modules have branches -- therefore the changed branched will "stick" and be passed to the top during upward notify recursion
  }
}





export class VNTop extends VersionNotifier {
  constructor(obj) {
    super(obj)
    this.branch = obj.respond.branch
    this.respond = obj.respond
  }

  notify(version = ++highestVersion, branch = this.branch) {
    this.version = version
    queueNotification(branch, this.respond)
  }
}



let highestVersion = 0