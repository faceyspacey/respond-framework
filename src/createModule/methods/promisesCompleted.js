export default async function(e) {
  await Promise.all(this.promises)

  this.promises.length = 0
  this.lastTriggerEvent = e // seed will only be saved if not an event from replayTools
  this.queueSaveSession()
}