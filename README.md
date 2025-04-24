# Respond Framework - The Dream

The dream of application development is to deterministically render from *user-triggered* events.

```js
App(reduce(...events))
```

And to do so while building your app out of mini apps, so that you always maintain the same level of enjoyment as when first starting out.


## Respond in 5 Minutes

Respond is the first ever **fully declarative** fullstack **Deterministic**-***first*** modular framework.

Postgrest (PG Lite) *runs in the browser*, and resets and replays all events/fx instantly on replays, hmr, rewinds, *as well as tests* that run in the browser as part of your daily development workflow at every stage, after every tap, click and keypress.

With Respond, you have a built-in UI to replay any of the previous events, instantly in milliseconds ("Replay Tools"). It's built in React Native Web, so the Replay Tools work out-of-the-box in React Native too. 

When you refresh the page, by default, every event is remembered, and you're right where you left off.

You're always in control of where you want to be, and never have to waste time reproducing steps to get to what you want to work on.

You can save all user interactions as a test directly to your project repo, and replay them later, or run them as an actual Jest test.

Tests are snapshots after each event. They are fully automatic, and you don't have to write any test code.

If you heard bad things about snapshot testing, it's because you're not working within a framework with tools to do them correctly. More on snapshot testing in the [Testing](./testing.md) section.

So with Respond you don't have to "write" tests. You simply use your app as part of your standard development flow. Then save your usage recording, which you can also edit, re-order, delete, skip, and splice new events.


### Composability & Modularity

React is composable only at the *component level*. To be fully deterministic and declarative, requires a **holistic** approach and conception to apps.

When React has you doing things like `setUserId` via `seState`, it's still living in the *imperative* world.

Using `useEffect` are component level "implementation details" that play a far smaller part in Respond.

From the perspective of Respond, React is the equivalent of *Jquery* in terms of how many implemenation details you still must manage. Code is far simpler and easier to reason about; it benefits from separation of concerns, which AI loves; you're *at least* one order of magnitude more productive.

Events triggered should only ever signal user-intent, such as `events.profile`, `events.submitProfile`, `events.logout`. Any subsequent activities should happen in a *reduction manner* in relation to a ***single*** **user-triggered** event. Including async fx.

And because the *user-triggered* event might come from anywhere within the component tree, requiring *work* to be *near* the trigger component doesn't make sense and quickly becomes cumbersome (re: "prop drilling").

To maintain composability, Respond offers user-defined module boundaries at a higher level.

"Respond Modules" are large groups of components and functionality that can be composed together, and made modular via "module props".

> Small dynamic modules are also supported, as it's up to the user to define the boundaries of their modules. That means a single component could be a module if you want.

The mechanism for composability isn't component function calls, which are limiting, but rather an outside tree of branches with names, **paired to your component tree**. Each component is paired to a branch.

> Pairing is performed via a babel/swc plugin. Its inferred, so you don't have to do any extra work (unless you specify another module via the `useModule` hook).

Here's what module `state` looks like in Respond components:

```js
const MyComponent = (props, state) => {
  const { id } = props
  const event = state.events.profile

  return Pressable({ event, arg: { id } }) // component functions
}
```

All `Respond` components receive a second `state` argument, which is the current module's state.

Additionaly, Respond sunsets JSX as well as `createElement` in favor of **direct component function calls** (handled by the babel/swc plugin). Your app will feel like **pure functions from top to bottom**.

> Pure function all the way down, ie "turtles all the way down."

Events are defined outside the component tree:

```js
export default {
  profile: {
    pattern: '/user/:id',
    fetch: (state, e) => state.db.user.findOne(e.id),
  },
  saveProfile: {
    submit: ({ db, form }) => db.user.updateOne(form),
  }
}
```
> `/events.js`

Events have callbacks like `fetch` and `submit` which are powered by Respond's super simple plugin API.

Plugins are just functions of the same 2 argument signature `(state, e)`, except they operate on *all events within a given module*.

Reduction is central to proper Respond usage. Like plugins, reducers listen to all events in a given module (and its children). 

Respond reducers also receive the module's `state` as an additional argument:

```js
export default (showDrawer = false, e, state) => { // <-- `state` as 3rd arg
  const { events } = state

  switch (e.event) {
    case events.profile:
      return true

    case events.saveProfile.done:
      return false
  }

  return showDrawer
}
```
> `/reducers/showDrawer.js`

As you can see, module `state` is always within reach.

To group events, reducers and components together, you specify them as a module:

```js
export default {
  id, // unique id of the module
  plugins,
  events,
  reducers,
  components,
  selectors,
  etc
}
```
> `/index.js` for root module, or:   `/modules/foo/index.js`


### Who's it For?

Respond is for the beginner and expert building serious apps alike.

Respond makes it possible for the beginner to single-handedly build bespoke high-end highly interactive apps.

It teaches both the beginner + expert *the science that's been missing for app development*: **"App Science"**.

It does so by abstracting out raw business logic from the "implementation details" of components.

You will learn to solve the logical problems of UI *standalone* as if the UI doesn't exist. It can be considered "headless." Instead, your reducers are describing *abstractly* what such a UI *might look like*. Aka "declaratively." 

UIs are just "views" or "dumb templates", as if your favorite server-side MVC framework is **"rebuilding the world fresh"** for each request.

It's focused on React Native and React Native Web, but can be used in plain React.

You will do 95% of your work in the browser, even when developing for React Native, thereby giving you the benefits of the best-in-class Chrome debugger experience. And since, during development, the server runs in the client, you will benefit immensely from a single unified fully traceable debugging experience.

It's geared for developers that want to go farther than building "web pages" and "web sites", but it shines there too.

Since it's fully declarative -- comprised of simpler *usually pure function calls* -- beginners too will be in a far better place to start.

They will be dealing with "raw business logic" rather than the implementation details of components, which from Respond's perspective is the equivalent of "UI assembly language."

If you want to learn application development form first principles, or correct your understanding, Respond is for you.

React has been called the "Operating System of the Web", but that hasn't been true until now. For it to be true, a truly new and more productive paradigm must emerge on top of it, like going from Assembly to C.

Reactlandia took a wrong turn a while back and, via Respond, you will find your way back to a world where "separation of concerns" simplifies, separates and centralizes unique business logic.

Respond teaches you proper reduction principles and approaches. **You will become a better developer by using Respond.** Respond finally distills app development to a science, which it has struggled to become until now.

The constraints imposed by Respond results in less "correct" ways to do things. 

> Hence the "science" part.

Whereas with React and other component-centric libraries, there's infinite ways to do things. It's hardly a science. And the resulting code is typically cyclical spaghetti, and impossible to reason about as apps become large.

You will find that Respond achieves the deterministic declarative dream of:

```js
App = f(state)
```

or in expanded form:

```js
App(await reduce(...events))
```

Read this whole doc through to fully understand why this is a superior approach and the *science* apps have been missing. The secret lies in knowing how to reduce correctly, which hasn't been taught until now.



## User-Triggered Events

The deceptively simple realization at the core of Respond Framework is that to achieve **determinism** you must make a **distinction** between:

- **user-triggered events**

vs 

- **response events** ***called by user-triggered events***


And you must in fact only trigger them from user interactions, not hooks like `useEffect` where you "fetch while you render", or you lose determinism.

![image](./images/react-respond-simple.png)

Respond is able to differentiate between the two because in components, you use `event.trigger()` in response to actual user interactions, and everywhere else you must use `event.dispatch()`.

> Plugins and event callbacks use `event.dispatch`

Event callbacks however handles most of the calls to `dispatch` for you by "auto-dispatching" callback returns.

Only in a complex callback or if you write your own plugins will need to use `event.dispatch()`. Visit the [Plugins](./plugins.md) section when you're ready. 

Additionally, you almost never will call `event.trigger()` either, as you will use built-in components like `Pressable` or `Input` that do this for you (or if you create your own):

```js
const Pressable = ({ event, arg }) => {
  const onPress = () => event.trigger(arg)
  return TouchableOpacity({ onPress })
}
```

```js
const MyComponent = (props, state) => {
  const { id } = props
  const event = state.events.profile

  return Pressable({ event, arg: { id } }) // component functions
}
```
> Respond recommends "component functions" instead of JSX. They are automatally memoized. More on that soon.

Because events are defined statically at the top level of your application -- rather than within components -- they maintain a consistent reference, preventing the need for `useCallback` to optimize renders.

Everywhere in your App, you will simply pass the reference as we did with the call to `Pressable` above. 

> `arg` is a special prop name corresponding to the argument passed to events; it's also memoized.


## Double Arg Components

In Respond, components receive a second argument for `state`.

```js
const MyComponent = (props, state) => ...
```

You don't need to call a hook to retreive it, and it's **modularized**, which we'll cover shortly.

> Isolated `state` will be available wherever you go within a "Respond Module". It even has its own `props` api: "Module Props".

Component `state` is powered by a babel or swc plugin so that you don't have use any other framework than the React that you know and love.

That way you can still use React Native, which Respond is tailored toward. Respond's Replay Tools and Inspection Tools are in fact built using **React Native Web**. **Respond is a "React Native"-first framework.**

> And yes, you can use Respond without React Native. The Replay + Inspection tools, built in React Native Web, will be stripped out during production.


## Component Functions (not "Functional Components")

Respond sunsets JSX in favor of its "box-model" package for styling and component calls, inspired by Van JS. 

It also makes use of a babel/swc plugin.

The result is you can call components like this:

```js
Pressable({ event })
```

instead of this:

```js
React.createElement(Pressable, { event })
```

or this:

```js
<Pressable event={event} />
```

In essence, you no longer have to pass your `Component` to `createElement`, and instead can treat the component directly as the function that it is. TypeScript loves this by the way!

> Another name for this is "render-optimized component functions" or "render-aware component functions" or "component functions" for short.

JSX is still supported, and Respond intends to maintain both pairs of plugins. It's not a big deal which you choose. But try to come with us on the "component function" journey.

You can use both in a single project, and bring along legacy functional components.


## Modularized State ("Respond Modules")

The next key pillar of Respond is the concept of "Respond Modules".

A Respond Module is a collection of events, reducers, and other things that are related to a particular domain or area of your app:

```js
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
}
```
> `/index.js`

For example, you might have a `profile` module, which might have an `edit` event, and a `updateOne` reducer.

And you might have a `post` module, which might have an `create` event, and a `createOne` reducer.

Or you might have a `drawer` module, or a `modal` module, or a `toast` module.

You can break up modules by feature, domain (ie database table), area (eg Admin Panel), screen, or whatever makes sense to you.

To include a child module, just import and assign it and Respond will automatically understand that it *is a module*:

```js
import admin from './modules/admin.js' // child module

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
  admin: { // simply assign it
    ...admin,
    props: {
      get you() {
        return this.users[this.userId] // runs in context of parent
      }
    }
  }
}
```
> `/index.js`

Here you can see an example of an `admin` module assigned, with a `you` *selector* prop, which will run in the context of the parent module, while being accessible within the child module.

Events, reducers, selectors, as well as the entire isomorphic database (tables + models) can receive props.

> **A "Respond Module" is fullstack**, which means you could create a 3rd party NPM package, whose `db` runs on another server. Stripe for example could provide a more full featured payment module in Respond that never has go through your server.

When run in production, server-oriented code will be stripped out. During development, it all runs in the browser with complete stack traces in a single debugger (eg Chrome). 

> **Respond with Console Ninja is a dream come true!**

Generally you will start out simply with a single top level *static* module, and you will make a ton of features in that one module, and then break em up later.

*Dynamic modules* for features as small as a single `Input` are also possible and can be code-split.

Respond offers "namespacing" for `events` and "grouping" for `reducers`, so what you do is gain as much mileage out of those as you can within a single module, and then graduate to multiple modules when the time comes.

> Tip: when building your first Respond app, just create everything in a single module.

## `state` Wherever You Go

The `state` object seen in the double arg component is within arms reach wherever you go:


#### Components:
```js
const MyComponent = (props, state) => {
  const { id } = props
  const event = state.events.profile

  return Pressable({ event, arg: { id } }) // component functions
}
```

#### Reducers:
```js
export default (userId = '', e, state) => {
  const { events } = state

  switch (e.event) {
    case events.drawer.logout:
    case events.join.home:
      return ''
  }

  return e.userId ?? userId
}
```
> `/reducers/userId.js`


#### Events:
```js
export default {
  profile: {
    pattern: '/profile/:id',
    fetch: (state, e) => state.db.user.findOne(e.id),
  },
  updateOne: {
    submit: ({ db, form }) => db.user.updateOne(form),
  }
}
```
> `/events/index.js`



State is automatically reactive, and is provided via a rewritten & customized version of [Valtio](https://github.com/pmndrs/valtio) to which Respond owes its creator, Dai-Shi, immense credit.

Visit the Valtio docs to quickly grasp the reactivity model, and make sure to give Dai-Shi a hi-five!

Respond's state management facilities can be considered Valtio wrapped in a reducer.


## Models

Respond has traditional MVC style models, but they are isomorphic, working on both the server and the client similar to Meteor.

You can define server-only models, client-only models, and shared models:

```js
export default {
  get fullname() {
    return this.firstName + ' ' + this.lastName
  },
  async save() {
    if (this.pro) await this.doSomethingPro()
    return this.super.save()
  }
}
```
> models/shared/user.js

Shared models are available on both the server and the client. You can *await* `model.save()` client-side and it will be saved to the server.

Models are automatically applied when a model is transfered from the server to the client.




## "Sticky Reducers"

Redux wasn't used correctly by most developers. The reason goes back to the distinction between "user-triggered" events and "response" events. The latter are **called in response to a single user-triggered event**.

More generally, developers did not *fully* put to use or did not properly understand that reducers were meant to be used as "subscribers" in the "PubSub" Pattern:

![image](./images/event-bus.png)

Rather than fire multiple events back to back, correct usage revolves around listening to a **single user-triggered** event from *multiple reducers*.

But also async work and other fx must also be "reduced" in such a ***one-to-many*** way.

In the case of async fx like "response" events, you need a deterministic way to reliably *await* them.

> You also need an understanding of reduction/subscription patterns to keep the number of response events to the minimum. 

> The goal is none or just one; and only more -- which we call "pivot events" -- in rare circumstances.

Correct reduction revolves around inferring state based on the least amount of information/dispatches possible.

You shouldn't do this:

```js
events.logout.trigger()
events.unsetUserId.trigger()
events.home.trigger()
```

Instead do just this:

```js
events.logout.trigger()
```
or this:

```js
Pressable({ event: events.logout })
```
> And infer/reduce the rest.


Correct reduction involves *sticking* to certain bits of state while ignoring irrelevant events.

Just like an `array.reduce` function, you must know when to make things "sticky" by ignoring unrelated events:

```js
const sum = array.reduce((acc, item) => {
  if (!item.num) return acc // ignored

  acc += item.num // "sticky"
  return acc
}, 0)
```

### Sticky Reducer Examples:
```js
export default (screen, e, { kinds }) => e.kind === kinds.navigation ? e : screen
```
> `/reducers/screen.js` ("switch reducer")

```js
export default (userId = '', e) => e.userId ?? userId
```
> `/reducers/userId.js` ("sticky id reducer")


```js
export default (state = false, e, { events }) => {
  switch (e.event) {
    case events.drawer.account:
    case events.drawer.settings:
    case events.drawer.editProfile:
      return true

    case events.login:
    case events.main.view:
      return false
  }

  return state
}
```
> `/reducers/showDrawer.js` ("flag reducer")

```js
export default (state = false, e, { events, kinds }) => {
  if (e.kind === kinds.navigation) {
    switch (e.event.namespace) {
      case events.drawer:
      case events.drawer.userProfile: // nested module in drawer
        return true
    }
    
    return false
  }
  else if (e.kind === kinds.submission) {
    switch (e.event) {
      case events.drawer.logout:
      case events.admin.dashboard:
        return false
    }
  }
  
  return state
}
```
> `/reducers/showDrawer.js` (flag reducer distinguishing between event "kinds" + "namespaces")


## Events

Events *themselves* are the `types` that you switch ever. They are stable references. They also are the "creator" functions of the concrete `e` objects passed to reducers and event callbacks:

```js
const e = events.drawer.profile({ id: user.id })
```

This means there's no boilerplate. It's all "collapsed."

Events can be namespaced:

```js
export default {
  drawer: { // drawer namespace
    profile: {
      pattern: '/user/:id',
      fetch: ({ db }, e) => db.user.findOne(e.id),
    }
    logout: ...
  },
  join: { // join namespace
    login: ...,
    signup: ...,
  }
}
```
> `/events.js`

Namespace nesting can be as deep as you like.

Via namespaces, you can create an event at a "path" like `events.drawer.profile`, and that's what you will use everywhere.

Both `events` such as (`events.drawer.profile`) and `e` are referred to just as "events", where `e` will contain data dispatched with it, eg `{ id: user.id }`.

> There's minimal jargon to learn, and experienced Respond developers will know what you mean by the context of the conversation.

> Everything is basically just "events" in Respond. Everything revolves around events. If you understand Respond's evented model, you understand Respond.

Here's the concrete `e` object created above:

```js
const arg = { id: user.id }
events.drawer.userProfile.trigger(arg)


// shape of `e`:

e === {
  event: events.drawer.userProfile,
  kind: kinds.navigation,
  arg: { id: user.id },                  // standard
  payload: { id: user.id, foo: 'bar' },  // transformed (optional)
  id: user.id,                           // convenience
  foo: 'bar',
}
```

An event starts out as a "configuration" object:

```js
export default {
  dasbhoard: {
    pattern: '/dashboard',
    transform: (state, arg) => ({ ...arg, foo: 'bar' }), // optional
    before: ({ events }) => events.users()
  },
  users: {
    pattern: '/dashboard/users',
    fetch: ({ db, query }) => db.user.queryPaginated(query)
  },
  saveUser: {
    submit: ({ db, form }) => db.user.updateOne(form)
  }
}
```
> `/modules/admin/events.js`

If they have a `pattern`, Respond considers the `kind` to be a `navigation` event, and otherwise it's a `submission` event. This allows for very productive switching and logic within reducers.

> The distinction between `navigation` and `submission` events is almost as important as the distinction between *user-triggered* and *response* events. It is key to understanding the nature and science of UI-driven apps.

`before`, `fetch` and `submit` are powered by built-in plugins. You can create your own that imbue "events" with different callbacks and functionality.

Events happen between renders in Respond:

![image](./images/react-respond.png)

All sorts of asyncrony can happen in *"response"* to events *triggered* by components. As long as its awaited, **determinism** is maintained.

Respond has a Plugin API. They operate on *all events* within a given module. Here are examples of more built-in plugins:


```js
export default {
  login: {
    pattern: '/login', // step 1
  },
  submitPhone: {
    validate: ({ form }) => validatePhone(form.phone),
    tap: ({ db, form }) => db.user.submitPhone(form),
  },
  

  loginCode: {
    pattern: '/login/code', // step 2
  },
  submitCode: {
    submit: ({ db, form }) => db.user.submitCode(form),
  },


  signup: {
    pattern: '/signup', // step 3
  },
  submitProfile: {
    validate: state => validateProfile(state),
    submit: ({ db }, e) => db.user.submitProfile(e.user),
  },

  complete: { // step 4
    before: async ({ events, userId }) => {
      await connectToRealtimeSockets(userId)
      return events.dashboard.view() 
    }
  }
}
```
> `./events/join.js`

Without any plugins, almost nothing happens.

Every key you see here (`before`, `validate`, `submit`, `tap` and `pattern`) is powered by a plugin. The methods are known as "event callbacks" or "event handlers".

They are pretty much all async. The plugin pipeline is an async pipeline. **When the plugine pipeline is complete, Respond's Replay Tools move to the next event.**

This is why you can't just trigger events without constraints. **Respond must know the first event**, and any "response" events must be awaited within the plugin pipeline or event callbacks.

Parallel and optimistic events are supported.

In regard to "boilerplate", the **event configuration objects become functions**:

```js
const e = events.join.submitPhone()
await e.trigger()
```


You can also call `trigger` directly on the original event function:

```js
events.join.submitPhone.trigger()
```



However, most often you will simply pass the event reference to a component that will do it for you:


```js
Pressable({ event: events.join.submitPhone })
```

These **stable references** can be switched over in reducers like types:

```js
export default (step = 1, e, { events, user }) => { 
  const { join } = events
  
  switch (e.event) {
    case join.logout:
    case join.login:                return 1

    case join.submitPhone:          return 2

    case join.submitCode.done: {
      return !state.user.profileComplete ? 3
                                         : 4
    }

    case join.submitProfile:        return 4
  }
  
  return step ?? 1
}
```
> `/reducers/step.js`


## Plugins

Plugins are defined just like event callback functions, receiving both a `state` and `e` arg.

Except they run for ***all events in a module***:

```js
export default (state, e) => {
  if (!e.event.submit) return

  const response = await e.event.submit(state, e) // could be any event

  await e.event.done.dispatch(response) // built-in nested event along w/ .error + .data

  return response
}
```
> `/plugins/submit.js`

This is the core functionality of the `submit` plugin, as well as the `fetch` plugin.

> Observe the `.done` nested event, which is automatically created for you for the purpose of differentiating between the initial *"trigger"* event and the *"response"* event in your reducers.

Continuing with the `step` reducer from the previous section, we can write a plugin that dispatches the steps:

```js
export default ({ events, step, curr }, e) => {
  if (e.event.namespace !== events.join) return
  if (curr.event.step === step)          return

  return step.dispatch() // trigger event!
}
```
> `/plugins/joinWizard.js`

But we must convert the `step` number to an event function, further "collapsing" boilerplate:

```js
export default (step, e, { events, user }) => { 
  const { join } = events

  switch (e.event) {
    case join.logout:
    case join.login:                return join.login      // event function

    case join.submitPhone:          return join.loginCode  // event function

    case join.submitCode.done: {
      return !state.user.profileComplete ? join.signup   // event function
                                         : join.complete // event function
    }

    case join.submitProfile:        return join.complete   // event function
  }
  
  return step ?? join.login
}
```

That's how you create a basic state machine in Respond. 

> By the way, there's a plugin that can help you with this: `wizard`.

`Switch` components look like this:

```js
const LoginSwitch = (props, { step }) => {
  const Component = screens[step.name] // eg: events.join.login.name
  return <Component />
}

const screens = {
  login: LoginScreen,
  loginCode: LoginCodeScreen,
  signup: SignupScreen,
}
```

We just hit multiple birds with 1 stone!

You specify the `wizard` plugin in your module like so:

```js
import { defaultPlugins } from 'respond-framework/plugins'

export default {
  id,
  plugins: [wizard, ...defaultPlugins],
  evevents,
  reducers,
  // omitted
}
```

All modules require a `plugins` array for Respond to infer that it's a module.

This keeps plugins at the forefront of your mind as a tool you should use, not just for package authors.

If a built-in event callback/plugin doesn't do what you need, you'll find that plugins allow for immense flexibility.

Respond can run in wildly different ways by use of plugins. In fact, `reduce` is a plugin itself!

> Idea: create an `async` reduce plugin, and talk to the `db` right in the reduction! Careful though: it could become slow due to waterfalls and lack of parallelism, the same way current React apps are slow due to waterfalls.

> It's better to use async plugins + event callbacks to get/retreive data, and leave reducers to the "business logic" of reducing what you get back from the server.


## `db`

Respond depends on a fully reset*able* database, which means it must be a fullstack framework, providing not just a database, but a server and API.

You access the "api" by way of the `db` singleton.

There are no "controllers" as in traditional MVC, as none are needed in a client-centric framework.

> There are however facilities for *filtering, permissions and authentication* around db calls, giving them a few capabilities of traditional controllers. Visit the [Db](./database.md) section for in depth documentation.

The `db` singleton offers an RPC interface to methods on the server. You call each method like a method on a table, just as you would server-side: 

```js
db.user.findOne(id)
```

But here's where it gets interesting: full-fledged Postgres runs in the browser, using the amazing PG Lite library.

Which means, during development, you aren't in fact using "RPC" -- you're making a local function call like any other! 

That means it's fully traceable and debuggable directly in the Chrome devtools.

This is one of several cornerstones/pillars of Respond's "deterministic" nature.


## Browser History + Back/Forward Buttons

We've talked about user-triggered events, modularity, and the resetable database running in the browser, but now we're going to introduce the 4th pillar & blocker Respond had to solve to achieve the declarative deterministic dream:

**The browser's history (i.e. those pesky back/forward buttons) had to be fully abstracted.**

***The solution is to `trap` users, so the back/forward buttons just become a signal for your app to do what it needs to do.***

Libraries like React Navigation have called this "draining", i.e. in reference to Android's back button.

Respond brings this to the web, for both back and forward buttons.

One of the secret reasons React has had to self-limit itself to a "component" library is because it's been thought there's nothing that can be done with things like the browser history.

With the back/forward buttons removed as a blocker, Respond is able to do work in its rightful place: *the top global context outside of the component tree.*

With Respond Modules, composition is retained. 

It's better than the *microscopic* modularity offered by components.

Why?

Because boundaries are user-defined, typically for areas of your app a lot larger than a single component.

With these 4 pillars

1. modularity
2. event determinism
3. resetable database running in the client
4. abstracted history

the foundation of Respond stands.


## Replay Tools & Testing

The final pillar or crown jewel of Respond is the ability to generate tests out of the *most minimal* *most natural* set of information, from which your app should be replayable.

```js
import { setupTest } from 'respond-framework/testing'

const settings = {}

const events = [
  {
    "index": 0,
    "type": "join.login"
  },
  {
    "index": 2,
    "type": "join.edit",
    "arg": {
      "email": "james@faceyspacey.com"
    }
  },
  {
    "index": 3,
    "type": "join.submitPhone"
  },
]

const t = setupTest({ settings })

test(`0. join.login`, async () => {
  await t.snap(events[0])
})

test(`1. join.edit`, async () => {
  await t.snap(events[1])
})

test(`2. join.submitPhone`, async () => {
  await t.snap(events[2])
})
```
> The Replay Tools UI saves user-triggered events to your Jest test folder like this.


In essence, the pinnacle of declarative*ness* is achieved:

```js
App(await reduce(...events))
```

That's always been the dream. **The Declarative Deterministic Dream.**

Here's what your bootstrap entry script looks like:

```js
import mod from '../index.module.js'
import { createModule } from 'respond-framework'


const { eventFrom, reduce, App } = createModule(mod)

const events = [eventFrom(window.location)]
const state = await reduce(...events) // aka firstEvent.trigger()

const props = {}

App(props, state) // aka "render"
```

That gives you the **mental model** of how respond is supposed to work.

You can obviously simplify it to:

```js
import mod from '../index.module.js'
import { createModule } from 'respond-framework'


const { eventFrom, reduce, App } = createModule(mod)
const state = await reduce(eventFrom(window.location))


App({}, state) // aka "render"
```

As you can see, `App` is a function of `props` and `state`, just like the components you write everywhere in your app.

`...events` are a lazy never ending iterator reduced by an async *but deterministic* pipeline.

> This is metaphorical, as `...events` in this example isn't in fact a lazily evaluated generator, but a device to instill the overall *mental model* of Respond.

Imagine `reduce(...events)` pushing new `e` objects each time you call `e.trigger()`, such as from a `Pressable` or `Input`.

Meanwhile Respond's "call and response" flow tiktoks back and forth between *responding* and rendering.

Besides animations, components are reduced to mere "dumb" templates. 

Separation of concerns makes each aspect (events, reducers, components, selectors) easy as they should be. 

> **AI has a field day with this approach.**

In fact, Respond makes code so much easier that Respond actually *is the answer to the current low level of quality of AI code generation, which is ok for small things, but degrades as you prompt for larger and larger things.*

This is the direction Redux was initially going before React itself took the spotlight. This is the Redux journey taken to its logical conclusion, with cybertruck levels of batteries included.

Respond is the result of over a decade of research while Reactlandia went in a different direction.

As its creator, I challenge you to question "consensus" thinking, and build something with this and compare it to how much more challenging it is to build something with anything else. *And then come to a conclusion.*

Respond shines both for the beginner and those making high-end bespoke apps. 

However, it's going to be more apparent to developers of large apps -- who have experienced the nightmare of the "component everything" approach -- that Respond really delivers on the direction our industry was always supposed to go and the "one true way". 

So Don't Just React...Respond. And start **creating as fast as you think** today.


## Next Steps

Read the complete docs:

- [events](./docs/events.md)
- [reducers](./docs/reducers.md)
- [selectors](./docs/selectors.md)
- [components](./docs/components.md)
- [models](./docs/models.md)
- [db](./docs/db.md)
- [modules](./docs/modules.md)
- [plugins](./docs/plugins.md)
- [replays](./docs/replays.md)
- [testing](./docs/testing.md)