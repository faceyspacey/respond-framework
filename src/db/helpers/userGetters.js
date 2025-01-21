export default {
  user: {
    enumerable: false,
    get() {
      return this.findCurrentUser()
    }
  },

  userSafe: {
    enumerable: false,
    get() {
      return this.findCurrentUserSafe()
    }
  },

  findCurrentUser: {
    value() {
      if (this.__user) return this.__user
      if (!this.req) throw new Error('respond: `this.user` and `this.findCurrentUser()` can only be called on the table instance directly called by the client`')
      if (!this.identity) return null
      return this.db.user.findOne(this.identity.id).then(user => this.__user = user)
    }
  },

  findCurrentUserSafe: {
    value() {
      if (this.__userSafe) return this.__userSafe
      if (!this.req) throw new Error('respond: `this.userSafe` and `this.findCurrentUserSafe()` can only be called on the table instance directly called by the client')
      if (!this.identity) return null
      return this.db.user.findOneSafe(this.identity.id).then(user => this.__userSafe = user)
    }
  },
}