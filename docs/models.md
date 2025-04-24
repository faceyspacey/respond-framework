# Models

Models in Respond provide rows from your database with methods and getters you can use on both the client and server.

Getters are especially useful within components, where you can use them to compute derived state from anything within the model object. They are essentially selectors attached to model objects, and therefore automatically available wherever you have a model:

```js
const User = (props, { user }) =>
  Container(
    Name(user.fullname), // getter
    Avatar({ src: user.avatarUrl }) // getter
  )
```

```js
export default {
  get fullname() {
    return this.firstName + ' ' + this.lastName
  },
  get avatarUrl() {
    return config.assetsUrl + '/' + this.avatarUrl
  }
}
```
> models/shared/user.js


Models are defined by including them in your module:

```js
import * as models from './models.js'

export default {
  reducers,
  selectors,
  models,
  etc
}
```

They can be specified as an array when you have both shared + client-only models:

```js

import * as shared from './models/shared/index.js'
import * as client from './models/server/index.js'

export default {
  models: [shared, client],
}
```
> models/index.js


On the server -- which runs on the client during development -- you pass them to your call to `createDatabase` on the server:

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

Models are automatically applied when a model is transfered from the server to the client. You never have to worry about them once initially provided.

Models of course can contain methods too:

```js
export default {
  async prefetchAvatarUrl(url) {
    const url = config.assetsUrl + '/' + url
    await prefetchImage(url) 
  }
}
```

Models like your database tables are defined as objects containing methods, getters and properties. Respond tries to limit how many different language features you need, so therefore doesn't uses classes.

This allows you to merge your methods from multiple files:

```js
import getters from './getters.js'
import methods from './methods.js'

export default Object.defineProperties({},
  Object.getOwnPropertyDescriptors(getters), 
  Object.getOwnPropertyDescriptors(methods)
)
```
> models/shared/user.js

Because `getters` would otherwise be called via `{ ...methods, ...getters }`, you must use `defineProperties` and `getOwnPropertyDescriptors` to merge them.



## Virtual Models

Virtual models are a way to define a model that is not backed by a database table.

They are defined just like other models, but lack a matching database `table`. That allows you to nest these models within other models:

```js
const game = db.games.create({ players: [] })
game.players.push(db.player.make({ name: 'James' }))

await game.save()
```

In this case `player` is a virtual model, and we use the `make` method instead of `create` as it doesn't create an `id` on `player`.

```js
game.id   // '123etc'
player.id // undefined
```

## Optimistic ID's

Using `model.create()`, id's are created optimistically on the client, so you can use them even before they are saved to the database.

This enables various patterns like optimistically placing a new model at the top of a list before actually saved.

Then if the user edits that model, no more work needs to be done to save or upsert changes. In fact, you don't even have to listen for a response from the server if you're sure it will succeed.


## Model Methods Can Call `db`

In events, models can save themselves:

```js
export default {
  save: {
    tap: ({ user }) => user.save()
  }
}
```

This is equivalent to the following:

```js
export default {
  updateOne: {
    tap: ({ db, user }) => db.user.updateOne(user)
  }
}
```

The only built-in model methods that can do this are `save`, `saveSafe` and `remove`. But you can make your own:

```js
export default {
  async makeFriend(userId) {
    await this.db.user.addFriend(this.id, userId)
  }
}
```
> `./models/shared/user.js`



```js
export default {
  makeFriend: {
    tap: ({ user }, e) => user.makeFriend(e.id)
  }
}
```

Make sure to set permissions for `addFriend` on the `user` table, not `makeFriend`, the model method.

The built-in `save` and `remove` methods have table methods of the same name, so in that case you set the same names for permissions.

To learn more about permissions and the `db` singleton, check out the [Db](./database.md) section.


## `state.form` as a Model

`state.form` doesn't have to be just a plain object. It can be a model so you can call its methods on `state.form` before you have even saved the model to the database.

```js
export default (form, e, { events, db, users }) => {
  if (e.event === events.edit) return Object.assign(form, e.arg) // receive edits
    
  switch (e.event) {
    case events.create:
      return db.user.create() // setup model for editing

    case events.update.done: {
      const model = users[e.meta.from.id]
      return model.clone() // setup *existing* model for editing
    }
  }

  return form ?? db.user.create()
}
```
> reducers/form.js


> Note: `events.update` is a `navigation` event, not a `submission` event. The `form` reducer doesn't need to concern itself with submission -- only setting it up, and applying edits.


```js
const UserSettings = (props, { form, events }) => {
  const { firstName, lastName } = form
  const event = events.edit // update `form` on keypress

  return Container(
    Title(`Welcome, ${user.fullname}`), // getter
    Input({ event, value: firstName }),
    Input({ event, value: lastName }),
    SubmitButton({ event: events.save })
  )
}
```

Notice `model.clone()` is called when navigating to the `events.update` for pre-existing models. After the model is fetched we `clone` it in `.done`.

```js
export default {
  update: {
    pattern: '/user/:id',
    fetch: ({ db }, e) => db.user.findOne(e.id), // model will be captured by state.users[e.id] in update.done
  }
}

```

This is a key piece of understanding -- because we don't want to change the model, which may be displayed elsewhere, until the user decides to save it. Instead we create some temporary state that we will *swap* on the submission event after the user approves the edits.

In the `UserSettings`, `user.fullname` will not change until submitted, whereas `user.firstName` and `user.lastName` will change since they use pending "swap state".

The `clone` technique is how you maintain 2 different versions of the same model for just this purpose.

Lastly, in the `events.create` case things behave as you would expect by creating an empty `form`. The only difference is it's a model from the beginning.

Keep in mind that even tho we are calling methods on `db` such as `db.user.create`, we aren't in fact *creating* the model on the server. We are just creating a model that will be saved to the database when the user submits the form.

To bring things full circle, we finalize the submission with the `model.save` method you're already familiar with:

```js
export default {
  save: {
    optimistic: ({ events }) => events.dashboard(),
    tap: ({ form }) => form.save() // <-- model.save()
  }
}
```

In this case, we call `form.save()` instead of `user.save()`. And we optimistically return to the dashboard.

If we wanted to also display a new user at the top of a user list, say, in an admin panel, we already have what we need optimistically.

We can `unshift` the `id` created by `db.user.create()` optimistically on to the top of the list before waiting for a response from the server:

```js
export default (list, e, { events, form }) => {
  switch (e.event) {
    case events.save: {
      list.unshift(form.id)
      break
    }
  }

  return list
}
```

And also add the model to `cache`:

```js
import { addToCache } from 'respond-framework/utils'


export default (users, e, { events, form }) => {
  addToCache(users, e.user, e.users) // standard automatic saving of received models

  switch (e.event) {
    case events.save: {
      addToCache(users, form.clone()) // clone to prevent unapproved edits
      break
    }
  }

  return users
}
```