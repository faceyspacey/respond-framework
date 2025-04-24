# Modules

Modules in Respond are defined as objects containing everything your app needs.

```js
import { defaultPlugins } from 'respond-framework/plugins'

export default {
  id,
  events,
  reducers,
  selectors,
  db,
  plugins: [initialData, wizard, ...defaultPlugins],
  models: [shared, client],
  components: {
    App,
  }
}
```
> `/index.js`

The minimum required to be considered a module is the `id` and `plugins` properties.

To apply your module tree, call `createModule` with the root module object in your *entry* file:

```js
import { createModule } from 'respond-framework'
import mod from '../index.module.js' // root module

const { eventFrom, reduce, App } = createModule(mod)
const state = await reduce(eventFrom('/'))

App({}, state)
```
> `/client/index.web.dev.js`


The module itself becomes the `state` object available throughout the given module's event, reducer, selector and plugin functions.

In most cases, you define things exactly where they end up, such as `events`.

In some cases, you define things like `reducers` which get moved to where they will live on the `state` object.

> There's a shortcut format to define reducers, events and selectors *directly on the module*, which will be covered below. When you do that, your module definition has identical shape to the resulting `state` object.

The idea is that rather than pass a config to a function like `createState(config)`, your "module" is in fact your `state`. Which means less to think about.

In general, you will find yourself calling the few api functions like `respond.eventFrom` even more rarely than using React's api functions: `useState`, `useEffect`, etc.

> With Respond, you don't have to learn an "API". You just create your state. **You are creating your own in-house "API"**.

By that token, Respond in many ways is an "API-less" framework. It's a pattern that results in *your own objects and functions being called*, much like the "model view update" pattern of "The Elm Architecture".

If you simply define a few objects and functions *within your module*, particularly plugin functions, the rest happens automatically and naturally as part of an **async unidirectional reduction**.


## Module Props

Modules can have child modules. If the child module is correctly defined, Respond will determine it's a module automatically.

```js
import childModule from './modules/childModule/index.js'

export default {
  id,
  events,
  reducers,
  selectors,
  db,
  plugins: [initialData, wizard, ...defaultPlugins],
  models: [shared, client],
  components: {
    App,
  },
  childModule // <-- child module
}
```
> `/index.js`

Child modules can be assigned to any key in a parent module and Respond will automatically infer that it's a module.

The parent module can pass `props` to overwrite reducers, events, selectors, plugins, default state, and even `db` tables and models:

```js
import childModule from './modules/childModule/index.js'

export default {
  id,
  plugins,
  childModule: {
    ...childModule,
    props: { // <-- module props
      reducers,
      events,
      plugins,
      selectors: {
        you() {
          return this.user
        }
      },
    }
  }
}
```
> `/index.js`

    
When these functions are passed as `props`, they will in actuality run in the context of the parent, while being accessible in the child:

```js
state.user // parent
state.you  // child (accessing state.user of parent)
```

They imbue the child with access to some of its parent's capabilities.

Parents can access their child state too:

```js 
state.childModule.you
```

**Parents know of everything about their children, but the inverse is only as true as the parent allows via "module props".**


## Shortcut Form

You can specify selectors, events, reducers and default state in shortcut form on modules as well as module props:

```js
export default {
  reducers,
  selectors,
  // selector
  get you() {
    return this.users[this.userId]
  },

  // event
  updateEvent: {
    tap: ({ db, userId }, e) => db.user.updateOne(userId, e.arg)
  },

  // reducer
  coolReducer: (foo, e) => ...,

  // default state 
  foo: 'bar',

  child: {
    props: {
      // shorcut form in module props
      get u2() {
        return this.you
      },

      // etc
    }
  }
}
```

Selectors and default state can be specified as is, but reducers and events must be suffixed with `Reducer` and `Event` respectively:

They will appear as their unsuffixed name in `state`:

```js
state.you
state.update.trigger(arg) // state.events.update will also exist in this case
state.cool
state.foo

state.child.u2
```

> Default state is any value assigned to a module which doesn't use *reserved* keywords. It will be the default state passed to reducers, or, if there is no matching reducer, will simply be available for use. Perhaps you never change it or perhaps you mutate it directly without a reducer.

> Note: hydration state in production is something different, and can be passed to `createModule({ hydration })`. It will overwrite default state, becoming the basis of reducers when they exist.


## Default Props

Like components, modules can have "default props." Default props are simply pre-existing aspects with the same name that a parent overwrites via module props.

They serve a very important purpose: **Respond's Replay Tools allow you to "focus" a given module, and run it as if it's the root the module.**

This allows for developing + testing child modules **in isolation**.

For example:

- in production a child module naturally receives its `you` selector from its parent
- but when the child is focused during development, you need a way to "mock" `you` 

During production, the parent passes `state.users[state.userId]` to its child as a module prop. However that won't exist when focusing a child module in development.

To solve for this, you can provide a default user as a *reducer*:

```js
export default {
  you: (you, e, { db }) => {
    return you ?? db.user.create({ name: 'Satoshi Nakamoto' })
  }
}
```
> `/modules/child/reducers.js`

But we can do one better -- you can create the default user based on a `userId` selected in the Replay Tools.

> In the **Replay Tools** doc, you will learn how to create "replay settings", which will be available before the first event is triggered, and which can be used to seed the database as well.


```js
export default {
  you: (you, e, { db, replays }) => {
    if (you) return you

    const { userId } = replays.settings
    const seedUser = replays.db.user[userId]

    return db.user.create(seedUser)
  }
}
```

This will work well because the assumption is that the child module has no facilities to ever change the user, and only operates in a context where there is a user, userId, etc.

This of course will never be called in production where you have all modules available. It's only for replays when you focus this child module.

> Reusable modules and 3rd party NPM packages can also make use of default props. They might do so in the traditional way where they *actually are used in production* for the case that users/developers don't supply them.


## Precedence

Props take precedence over default props.

A reducer prop can overwrite a default selector, and a selector prop can overwrite a default reducer. In other words, props and default props don't have to be the same type, as we saw above with the `you` selector prop overriding the `you` default reducer.

If there's default state on the module, the props will take precedence and overwrite those as well.

> Default state set on the module is intended as the default state that the *default reducer* will start out with. In the case of a matching reducer or selector *prop*, that default state is now considered invalid.

Overall props should overwrite default props naturally, and you shouldn't have to think about it.

Unrelated to module props, in the case that there is both a selector and reducer *of the same name **within a module***, the selector will take precedence.


## Focusing a Module in the Replay Tools

You can focus a module in the Replay Tools, so you can work on a given module in isolation.

Just select your module from the Replay Tools "module" dropdown, and tap **RELOAD**.

When you do this, the default props will be applied, acting as a mock to focus only on the functionality of the given module.

Because it's convenient to not have to redefine the `db` and `models`, they will be available in the child if it doesn't specify its own.

The `db` and `models` will be taken from the closest ancestor that has them.

You can however re-specify them along with ones specific to the child module, and there won't be any conflict. 

When you're just starting out, you'll most likely just keep your `db` and `models` at the top level, as is customary with most client-side apps.

However, as your project grows, eventually will come a time where one team wants to isolate their `db` and `models`. In which case, they too can be specified as props. The only difference is you will specify them on the `db` object you pass to `createDatabase`, so it can be run independently on the server. This will be covered in a subsequent section.

> 3rd party modules can be bundled as NPM packages with their own `db` and `models` definitions that point to their own servers, and then imported into other apps. This can enable microservices, and for companies like Stripe to provide full stack widgets in the form of modules.


## Selector Props

Selector props are the easiest way to pass state from a parent to a child.

If you already have the necesary state in the parent, there's no reason to create a reducer prop. Just pass a selector as a prop, and since it runs in the parent, it will have everything the parent has:

```js
export default {
  reducers: {
    you: (you, e) => you,
  },
  selectors,
  etc,
  child: {
    props: {
      selectors: {
        you() {
          return this.you
        }
      }
    }
  }
}
```

or:


```js
export default {
  reducers: {
    you: (you, e) => you,
  },
  selectors,
  etc,
  child: {
    props: {
      get you() {
        return this.you
      }
    }
  }
}
```
> "shortcut form"


## Reducer Props

Reducer props are only useful when a parent doesn't already have the necessary reducer and the child desires to access either parent events or parent state:

```js
export default {
  reducers: {},
  selectors,
  events: {
    foo: {}
  },
  child: {
    props: {
      reducers: {
        bar: (bar, e, { events }) => {
          switch (e.event) {
            case events.foo: // <-- events.foo would otherwise not be accessible in the child
              return 'foo'

            default:
              return bar
          }
        }
      }
    }
  }
}
```


If you pass a pre-existing reducer reference that exists in the parent, under the hood a selector will be made for you.

This is the same:

```js
const reducerReferenceFromParent = (slice, e) => ...

export default {
  reducers: {
    reducerReference
  },
  props: {
    reducers: {
      // must be same reference, but can be different name
      reducerReferenceFromParent: reducerReference
    }
  }
}
```

as this:

```js
export default {
  reducers: {
    reducerReference
  },
  props: {
    selectors: {
      reducerReferenceFromParent() {
        return this.reducerReference
      }
    }
  }
}
```

With this approach, you 2 birds with one stone:

- you optimize so multiple reducers doing the same thing aren't unnecessarily created
- you better express your intent and save a few lines of code



### Module Reduction Behavior

Reducer + selector props are only necessary so a child can gain access to its parent state. If, instead, the parent wants to listen to the child's state it has an even more natural way to do so:

**Parent reducers receive all the events of their children, grand children, and so on.**

At first this might seem like a performance bottleneck, but it's actually the opposite: *sibling branches will not reduce.*

Therefore, you can use thoughtful module branching to achieve near O(1) performance where only the necessary reducers listen to an event.

For example you can architect your module tree like this:

* root
    * users
    * posts
    * videos
    * xyz

In this design, the `root` module will have the small number of reducers necessary to manage the children. ***Then child reducers will not run when events are triggered by a sibling branch.***

This was a concern of Redux Classic. Respond puts this concern to rest: **by using modules to isolate state, you get better performance for free**.



## Event Props

Like reducer props, event props can either be passed as a fresh event or a reference from the parent.

References allow parents to continue to reduce an event as if it was called within the parent -- *even if they were given different names in the child*:


```js
const submit = {
  submit: (state, e) => ...
}


export default {
  events: {
    submit
  },
  reducers,
  selectors,
  etc,
  child: {
    props: {
      events: {
        anotherName: submit // same reference as parent
      }
    }
  }
}
```

Their purpose is simply to make the given ancestor event available to the child.

You can use them to trigger transitions from one area of the app to another.

Imagine the following module branches:

* root
    * dashboard
    * admin

The `root` module can provide a way to navigate between the dashboard and admin modules:

```js
const events = {
  dashboard: {
    path: '/dashboard'
  },
  admin: {
    path: '/admin'
  }
}

export default {
  events,
  reducers,
  selectors,
  etc,
  dashboard: {
    props: {
      events: {
        admin: events.admin
      }
    }
  },
  admin: {
    props: {
      events: {
        dashboard: events.dashboard
      }
    }
  }
}
```

So within `dashboard`, the navigation can be made via `events.admin` and within `admin`, it can be made via `events.dashboard`.


## Plugin Props

Plugin props are a very powerful capability that give parents the ability to listen to every event dispatched within a child.

```js
export default {
  child: {
    props: {
      plugins: [foo, bar]
    }
  },
}
```

Once a plugin is passed as a prop, the expectation is that it will run for **all posterity**, similar to reducers.

They will run *before* the child's plugins. Grand parents and further ancestors will run after the immediate parent's plugins, ending with the plugins of the current module.

Immediate parents run first because, as in real life, parents are the first to know about their children.

This gives all ancestors a say and a chance to possibly `return false`, short-circuiting the plugin pipeline before getting to the child.

Plugin props empower you with a natural *escape hatch* to manage complex transitions between deeply nested modules.


## Db + Model Props

Since the `db` is created on the server in production, `createDatabase` is where you specify database-related `props`:

```js
import { createDatabase } from 'respond-framework/db'

import * as tables from './db/index.js'

import * as shared from './models/shared/index.js'
import * as server from './models/server/index.js'

import childModule from './modules/childModule/db.js'


export default createDatabase({
  tables,
  models: [shared, server],
  childModule: {
    ...childModule,
    props: {
      tables,
      models,
    }
  }
})
```

New tables will be added, and existing ones merged.

The api is identical to client modules. 