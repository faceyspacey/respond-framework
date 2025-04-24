## db

In Respond, not only is the client modular, but so is the server and database. The `db` is how you access them, eg: 

```js
db.user.findOne(id)
```

It's named `db` so you only have one thing to think about it, but it offers access to a thin server layer that wraps your database.

In client-centric apps, you don't need serve endpoints as you would in a Rails or other MVC framework because you don't have as many responsibilities on the server. 

You don't need to:

- render from api calls
- serve flash messages
- perform redirects
- and so on

`db` does however provide functionality for the following:

- permissions
- authentication
- before/after hooks

So this is why all you have to think about is `db`, and can forget actual controllers. 

> Note: you can *still* use `db` independently of your client app for things like webhook endpoints. This is trivial to do and will be covered below after its primary usage.


## Tables

In Respond, each module can have its own tables and models.

> You can also specify a `parent` table to inherit from and `mixins`.

To start, you won't use nested modules with their own table + model methods. Instead you will just define them on the root module. So this is all you will need:

```js
import { createDatabase } from 'respond-framework/db'

import * as tables from './db/index.js'
import * as models from './models/index.js'

export default createDatabase({
  tables,
  models,
})
```
> `/db.js`

The models provided are the ones that are supposed to only run on the server. 

Your tables are just objects defining methods that will be available on the table object attached to the `db` object:

```js
export default {
  updateSomething(id, data) {
    return this.updateOne(id, data)
  },
  updateSomethingElse(data) {
    return this.updateOne(data) // data has data.id
  },
}
```
> `/db/user.js`
```js
export { default as user } from './user.js'
export { default as post } from './post.js'
// etc
```
> `/db/index.js`

You can also export them as individual functions:

```js
export function updateSomething(id, data) {
  return this.updateOne(id, data)
}

export function updateSomethingElse(data) {
  return this.updateOne(data)
}
```


```js
export * as user from './user.js'
export * as post from './post.js'
// etc
```
> `/db/index.js`


Since Respond doesn't use classes, you can spread your methods out across multiple files and merge them for organizational purposes:

```js
import permissions from './permissions.js'
import mainMethods from './methods.js'
import loginMethods from './specialPurposeMethods.js'
import etcMethods from './specialPurposeMethods.js'

export default {
  ...permissions,
  ...mainMethods,
  ...loginMethods,
  ...etcMethods,
}
```
> `/db/user.js`

> Note, for models which have getters you will need to use `Object.getOwnPropertyDescriptors`. See [Models](./models.md) for more information.


## Parent Table

You can specify a parent table to inherit from via the `table` key:


```js
import { createDatabase } from 'respond-framework/db'

import table from './db/parent.js'

import * as tables from './db/index.js'
import * as models from './models/index.js'

export default createDatabase({
  table,
  tables,
  models,
})
```
> `/db.js`


By default Respond comes with a Postgres implementation that uses PG Lite on the client during development, and provides methods for the most common operations.

This `table` relies on the same bundler capabilities your code relies on to strip out `.server.js` and `.client.js` files as necessary.

Respond also offers a Mongo implementation, which uses MongoDB on the server during production, and a "mongo lite" *javascript implementation* on the client during development. You can import it and apply it like this:

```js
import table from 'respond-framework/db/mongo'

export default createDatabase({
  table,
})
```



## Extensability

You don't have to use Respond's default database implementation. You can still use PG Lite or Mongo, but within your own methods and model implementations.

Using tools like Prisma should be possible, and we welcome any recipes you'd like to share.

> If you plan to create a custom database `parent`, Respond requires models to have a `__type` property with a matching table name in order to pass them to the client.

You can also disregard Respond's model functionality on the server, and pass any `shared` models or methods to your own ORM.



## Mixin

You can also mixin methods that aren't specific to a specific database/parent implementation using the mixin key:


```js
export default createDatabase({
  mixin: {
    ...additionalMethods
  },
})
```

## Built-in Methods

Both parent table's offer the following methods:

```js
export default {
  findOne,
  findMany,
  insertOne,
  updateOne,
  upsert,
  findAll,
  findLike,
  findManyPaginated,
  search,
  searchGeo,
  joinOne,
  joinMany,
  join,
  queryPaginated, // good for admin panels
  aggregatePaginated,
  aggregate,
  count,
  totalPages,
  insertMany,
  updateMany,
  deleteMany,
  deleteOne,
  incrementOne,
  create, // generate an empty model with an id
  make, // generate an empty without an id (good for nested models + optimistic updates on the client)
  save, // alias for upsert
  insertSeed, // only used during development replays
  super, // call parent table methods
  clone, // clone, good for use on the client in forms
}
```

You can view the source and examples for the exact signatures of these methods. We expect the community to add many more, but this should be plenty to get you started.

`updateOne` and `upsert` are overloaded to receive a number of different signatures to make the most common use cases easier:

```js
db.table.updateOne(id, doc)
db.table.updateOne(selector, doc)
db.table.updateOne(docWithId)
```

Most methods also receive a final argument for options like `project` and `sort`:

```js
db.table.findOne(selector, { project: { firstName: true } })
db.table.findMany(selector, { sort, limit, skip, project })
```


## Permissions

Permissions are role-based per method on each table:

```js
export default {
  permissions: {
    queryPaginated: ['admin'],
    findOne: [],  // public
    findMany: [], // public
    updateOne: ['user'],
    save: ['user'],
    createSomething: ['user'], // defined by developer
    updateSomething: ['user'], // defined by developer
    deleteSomething: ['user'], // defined by developer
  },
}
```
> `/db/post.js`

Public methods are specified with an empty array for roles.

Roles are assigned on the server to `user.roles` and saved to your `user` table. See the section on *Authentication* below.

If a table does not have permissions, all its methods are public.

> Don't permit a method like `findMany` that gives access to the entire database in production; instead write a custom method that only gives access to a subset of the database:

```js
export default {
  permissions: {
    findPublishedPosts: ['user'],
  },
  findPublishedPosts() {
    return this.findMany({ published: true })
  }
}
```
> `/db/post.js`



## Passthru Methods

The built-in methods are considered "passthru" methods. This facilitates excellent DX when first building your app or module.

This means you can call `db.post.updateOne` from an event callback without having to define any methods on the table:

```js
export default {
  saveForm: {
    submit: ({ db, form }) => db.post.updateOne(form)
  }
}
```
> `/events/post.js`



## Authentication

Authentication is facilitated by a JWT token. Table methods called from the client will verify the token and assign `this.identity` with the user's id and roles.

Then your permissions will be checked against the user's roles at `this.identity.roles`.

You will need to provide a `secret` by the time you get to production in the `createDatabase` call:

```js
import { createDatabase } from 'respond-framework/db'

import * as tables from './db/index.js'

export default createDatabase({
  tables,
  secret: 'my-secret-key',
})
```

All you need to do from there is generate and pass the JWT `token` at some point to the client, such as on login or signup:

```js
export default {
  async submitLoginCode({ phone, code }) {  
    const user = await db.user.findOne({ phone })

    const valid = code === user?.code
    if (!valid) return { error: 'incorrect-code', params: { code } }

    const { id, roles } = user
    this.identity = { id, roles }

    const { secret } = this.config
    const token = jwt.sign(this.identity, secret, { noTimestamp: true })
    
    return { token, user, userId: id }
  }
}
```
> `/db/user/authentication.js`

When the built-in `token` reducer sees `e.token` in an event, it will automatically save it on the client. And the built-in `auth` plugin will save it as a cookie.

Subsequent requests will automatically receive the `token` and accordingly provide `this.identity` to them.

And subsequent visits (or opens of the app) will also send requests automatically with the `token` since it is saved as a cookie.

> Native will use the built-in storage solution or one you provide like `AsyncStorage` to save the `token` on the device.

This all works seemlessly because `token` and `userId` are reserved state keys on the client in Respond. From there, the server will always have acess to it.

All you ever have to do is call `jwt.sign` at some point as part of your login flow.

Requested table methods will always have the user lazily available at `this.user`, which you must await to retreive from the database:

```js
export default {
  findPostsForFavoriteCategory(selector) {
    const user = await this.user // alias: this.findCurrentUser()
    const posts = await this.db.post.findMany({ categoryId: user.favCatId })

    return { user, posts }
  }
}
```
> `/db/post.js`

You can also retreive the user via a method `this.findCurrentUser()`. And there are safe versions at `this.userSafe` and `this.findCurrentUserSafe()`.

These are just shortcuts for `this.db.user.findOne(this.identity.id)` and `this.db.user.findOneSafe(this.identity.id)`.

The `user` in this case will be cached for the duration of the request, so you can call it repeatedly without delay. Just always remember to await it the first call.




## Safe Methods

The following "safe" methods are also available on any table:

```js
export default {
  findOneSafe,
  findManySafe,
  findAllSafe,
  findLikeSafe,
  searchSafe,
  searchGeoSafe,
  joinOneSafe,
  joinManySafe,
  joinSafe,
  aggregateSafe,
  updateOneSafe,
  insertOneSafe,
  upsertSafe,
  saveSafe,
  createSafe,
}
```

The difference is they don't let `roles` be re-assigned, and any fields in `this.privateFields` are excluded.

You specify `privateFields` for each table:

```js
export default {
  privateFields: ['password', 'email', 'phone'],
}
```
> `/db/user.js`



## Accessing other Tables

You can access other tables by importing the given module's `db` object:

```js
import db from '../db.js'

export default {
  findMyPosts(selector) {
    const userId = this.identity.id
    return this.db.post.findMany({ userId })
  }
}
```
> `/db/user.js`

You can also access `db` on `this`:

```js
export default {
  findMyPosts(selector) {
    const userId = this.identity.id
    return this.db.post.findMany({ userId })
  }
}
```



## Request Instance & Context

When methods are called from the client, there's a `this` instance for the given *table*. 

This does not exist when calling methods on other tables. 

For example the **`this.identity.id` will only exist on *client-requested table***. 

The same is true for `this.user`, `this.userSafe` and `this.findCurrentUser()`.

> These methods by the way are available on any table, so long as it's the client-requested table. 

The following properties are also available on the `this` instance:

- `this.req` which is the Express request object
- `this.body` which is a short for `this.req.body`
- `this.identity` which is the user identity (id + roles) from the JWT token
- `this.context` which is an optional context object passed to the `createApi` function when you create the Express server that serves Respond endpoints. You can do things like attach socket.io at `this.context.io`. **Just keep in mind, it will only be available on the initially requested table!**


## `createApi`

On the server, you must call `createApi` with your `db` module tree to kick things off.

```js
import express from 'express'
import http from 'http'
import { createApi } from 'respond-framework/server'

import db from '../db.js' // ie: createDatabase(config)


const app = express()
const server = http.createServer(app)

app.post('/api/:table/:method', createApi({ db }))

server.listen(3000)
```
> `./server/index.dev.js` (simplified)

You pass in the `db` created via `createDatabase` and follow the standard flow for an express server.

You can customize by passing in a `context` object, which can contain anything you want your table methods to have access to such as way to access sockets. And there's also a `log` option which u can set to `false`:

```js
import { Server } from 'socket.io'

const server = http.createServer(app)

const context = {
  io: new Server(server)
}

createApi({ db, context, log: false })
```

> By now, you may be wondering how how the same `db` api runs on both the client and server -- essentially most of the `db` code also runs on the client during development (besides `createApi`). The `db` interface uses proxies so you can call any table and method on it. Then during production, it will try methods on the server of the same name, without having to know whether they exist.





## `super`

Even though Respond doesn't use classes, you can call parent methods using `db.table.super.findOne(selector)`, and so on.

This is the recommended way of hooking into common methods like `save`. 

It also exists on models:

```js
export default {
  async save() {
    if (this.published) await this.doSomethingAdditional()
    return this.super.save()
  }
}
```

```js
const model = db.table.create({ firstName: 'James' })
model.save()
```

## Filtering

Like "controllers" in a typically MVC, any db method call can be filtered by assigning the following methods to a table or parent table:

- `beforeRequest(body)`
- `afterRequest(body, res)`

If either return something, that will be returned in place of the original response. If `beforeRequest` returns something, the table method won't be called.


## Overriding Core Request Handling

Requests are handled via methods on each table. You can override them on each table or via the `mixin`. Here are the methods you can override:

- `makeRequest(req, context)`
- `callMethod(method, args)`
- `permitted(perms, method, identity)`
- `getIdentity(config, body, perms)`

Search the codebase for `makeRequest` to see the default implementation.


## Masquerading

Respond has built-in support for masquerading. Any user with the `admin` role can masquerade as any other user.

All you need to do is set `state.adminUserId` to the id of the `admin` and a different user's id to `state.userId`.

Then request from the client methods *that don't have the `admin` role*.

Respond will automatically infer that you're masquerading.

If you go back to requesting admin-only methods, Respond will still allow it, knowing these requests aren't masqueraded.

> To authenticate this behavior, the JWT token must produce an identity/user with the `admin` role.



## Models

Models can be defined as an array to allow for "shared" and "server" groupings:

```js
import { createDatabase } from 'respond-framework/db'

import * as tables from './db/index.js'

import * as shared from './models/shared/index.js'
import * as server from './models/server/index.js'


export default createDatabase({
  tables,
  models: [shared, server],
})
```
> `/db.js`

Shared models are models you will also assign to the `models` key on your client module.

Models behave the same as they do on the client. See [Models](./models.md) for more information.



