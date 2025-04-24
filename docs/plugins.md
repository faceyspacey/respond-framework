# Plugins

Plugins in Respond are 2 argument functions just like event callbacks:

```js
export default (state, e) => {
  if (!e.event.submit) return

  const response = await e.event.submit(state, e)

  await e.event.done.dispatch(response)

  return response
}
```

This is the core functionality of the `submit` plugin, as well as the `fetch` plugin.

Plugins, unlike events, are called for every event in a module. And they can decide what events they want to handle.

Typically plugins will look for a key on an event, and if it exists, call it.

Observe the first line:

```js
if (!e.event.submit) return
```

This is the difference between a plugin and an event callback -- plugins are an abstraction to handle **multiple events**, whereas callbacks are an ad-hoc implementation of a *single event*.

If a plugin returns `false`, subsequent plugins will not be called. If it returns an object, it will be merged into the `e` passed to subsequent plugins. This is how the `validate` plugin attaches refined data to `e` before it hits reducers in the `reduce` plugin.


## Object Plugins

Plugins can also be an object. The only difference is that object form offers the ability to `load` itself **once** when the app is started:

```js
export default {
  load: async (state, e) => {
    // do something
  },
  enter: async (state, e) => {
    // same as the function form
  }
}
```


## Sync Plugins

Plugins can mark themselves as `sync` to be pushed to the front of the plugin pipeline so inputs can be edited without jumping:

```js
export default function myPlugin(state, e) => {
  // do something
}

myPlugin.sync = true
```

> Inputs jump when their values are updated asynchronously in React. Otherwise, we wouldn't need to ensure `sync` plugins come first.

Check the built-in `edit` plugin if you're not satisfied with its behavior. 


## Parameterized Plugins

You can define your plugins as a function *that returns a function* so they can be parameterized (perhaps as a 3rd party NPM library):

```js
export default options => (state, e) => {
  // do something
}
```
> `'my-plugin'` as an NPM library


Usage in a module:

```js
import { defaultPlugins, edit } from 'respond-framework/plugins'
import createMyPlugin from 'my-plugin'

export default {
  events,
  reducers,
  etc,
  plugins: [
    edit,
    createMyPlugin({ foo: 'bar' }), // <-- parameterized
    defaultPlugins.slice(1)
  ],
}
```

This isn't a feature of Respond, just the nature of functions and the convention with which they can be customized. 


When using `load`, you can share isolated variables in a closure:

```js
export default () => {
  const mem = {}

  return {
    load: (state, e) => {
      mem.foo = 'bar'
    },
    enter: (state, e) => {
      doSomething(mem.foo)
    }
  }
}
```

Of course you could just create `state.foo = bar`, but this avoids collisions with other plugins + module state.



## Advanced - `next` argument

For advanced cases, plugins receive a 3rd argument, `next`, which does allow you to `await` subsequent plugins in order to do something after:

```js
export default async (state, e, next) => {
  const startTime = new Date

  await next() // subsequent plugins all run

  console.log(new Date - startTime)
}
```

This pattern will be recognized as "middleware" in Redux Classic, `koa`, etc.

You can also pass what you want merged into `e` of the next plugin: `await next({ foo: 'bar' })`.

> This is the same as the standard flow: plugin returns merge into `e` for the next plugin (like the `validate` plugin).

### Additional Rarely Used Behavior:

- `const res = await next()` will once again be `e` with anything merged by subsequent plugins.

- If you happen to return something *after calling `next()`*, it will be discarded unless a prior plugin *also used `next`*, in which case that plugin will receive it merged into `e` as usual. In short, it offers a second time to modify `e`.

In practice, you will rarely use any of this, but this is its natural behavior. The takeway is returns keep evolving `e` through merging. 


## Optional Plugins

Respond has a number of plugins built-in to power your event callbacks. See the [Events](./events.md) section for more on how these standard plugins behave.

However, Respond also exports several other plugins for common use cases.

You can check the `/src/plugins` for how they're implemented, if you're needs aren't meet.

They receive parameters to customize them, and are typically less than 20 lines. A concrete one (conforming to your precise needs) is even simpler.

### `initialData`

Fetch data on initial app load, no matter the initial event:

```js
import { initialData } from 'respond-framework/plugins'

plugins: [
  initialData({
    getData: (state, e) => state.db.user.fetchInitialData(e)

    // optional:
    before: (state, e) => ..., // called before, return false to short-circuit
    after: (state, e) => ..., // called after, return false to short-circuit, but with data assigned to e
    modular = false, // by default runs in the root module, even when specified in a child module for convenience
    parallel = false, // run in parallel with initial event
  })
]
```



### `parallel`

Render an adjacent view simultaneously by automatically dispatching a parallel event:

```js
parallel({
  createEvent: (state, e) => {
    return e.id ? e.event.namespace.list() : e.event.namespace.create(),
  }
})
```

The `parallel` plugin is the generalized solution to "nested routes."

Parallel layouts don't always take the form of a nested path (eg: `/posts/:id` and `/posts/:id/comments`).

This plugin gives you the tools to intelligently dispatch a simultaneous event, usually for the purpose of rendering a "nested" or adjacent view.


### `wizard`

Create an `xstate`-like state machine for things like signup wizards, using "steps":

```js
wizard({
  namespace = 'wizard',
  stepKey = 'step',
  currKey = 'curr',
  before,
  after
})
```

The `wizard` plugin is intended to be used with a reducer such as `step`, where instead of reducing an incrementing integer as a user *steps* through a form, the state is the next `event` itself:

```js
export default (step, e, { events, user }) => { 
  switch (e.event) {
    case events.logout:
    case events.login:              return events.login     // step 1

    case events.submitPhone:        return events.loginCode // step 2

    case events.submitCode.done: {
      return !state.user.profileComplete ? events.signup    // step 3
                                         : events.complete  // step 4
    }

    case events.submitProfile:      return events.complete  // step 4
  }
  
  return step ?? events.login
}
```

This `event` doubles as the `event` dispatched from this plugin and as the basis for a `Switch` component selecting and displaying the correct component:


```js
const SignupWizardSwitch = (props, { step }) => {
  const Component = screens[step.name]
  return <Component />
}

const screens = {
  login: LoginScreen,
  loginCode: LoginCodeScreen,
  signup: SignupScreen,
  // complete: redirects to dashboard
}
```



### `leave`

Occasionally, you want to do something when a user leaves a given event, namespace or module.

It takes a little bit more work to infer this interaction, which is why it's not built-in and running for every dispatch, but here it is if you need it:


```js
leave({
  cond = ({ respond }, e) => !respond.isEqualNavigations(e, state.curr),
  findCurr: state => state.curr,
})
```

This is the default behavior, which will call `event.beforeLeave`, `event.leave` and `event.afterLeave` if the condition is met on the navigation event being left.

`findCurr` defaults to using the built-in `state.curr` selector to discern the current navigation event.

Use cases:

- blocking/preventing leaving
- confirming leaving
- redirecting


### `requireCondition`

Perform a redirect in response to a condition:

```js
requireCondition({
  cond = (state, e) => !state.userId,
  redirect: (state, e) => state.login(),
  name = 'condition'
})
```


### `requireUser`

Same as `requireCondition`, but with condition checking for user presence in `state.userId` or `e.userId`:

```js
requireUser({
  redirect: (state, e) => state.login(),
})
```

You can also provide a `cond` function for further customization.


### `requireAdmin`


Same as `requireCondition`, but with condition checking for `state.adminUserId`.

```js
requireAdmin({
  redirect: (state, e) => state.login(),
  masquerade = true,
})
```

By default the `masquerade` option will assign `topState.adminUser = user` and `topState.adminUserId = user.id` for you.

`cond` option is also available.