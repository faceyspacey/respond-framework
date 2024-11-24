export default async function findCurrentUser(safe = true) {
  if (!this.req) throw new Error('respond: `findCurrentUser` can only be called in table methods when directly called by the client, or via other methods accesed within the same context via `this`')
  if (!this.user) return null

  if (safe) {
    if (this._currUserSafe) return this._currUserSafe // cache for request
    return this._currUserSafe = await this.db.user.findOneSafe(this.user.id)
  }

  if (this._currUser) return this._currUser // cache for request
  return this._currUser = await this.db.user.findOne(this.user.id)
}