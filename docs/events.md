# Events

In Respond, `events` are defined statically at the top level of your application. Therefore `useCallback` is not needed to optimize renders, as events maintain consistent references. 

Events start out as configuration objects. You can define them simply by exporting them individually from a file:

```js
export const profile = {
  pattern: '/user/:id',
  fetch: ({ db }, e) => db.user.findOne(e.id),
}

export const updateOne = {
  submit: ({ db, form }) => db.user.updateOne(form),
}
```
> `/events.js`


And then import them into your module:

```js
import * as events from './events.js'

export default {
  id,
  plugins,
  events,
  reducers,
  etc
}
```

Methods like `fetch` and `submit` are called "event callbacks" and are powered by built-in Plugins.

To create the `e` object passed as the second argument to both event callbacks and reducers, you call an `event` like a function: `const e = events.profile()`.

Under the hood, Respond transforms event configuration objects into functions that create events.

You can also define events as a simple function to begin with:

```js
export const updateOne = ({ db, form }) => db.user.updateOne(form)
```

When defined as a function, they operate as a configuration object with a single callback similar to `submit`.

You can think of events, components, and reducers all as just pure *(or near pure*) functions, with similar arguments.

To *trigger* events, call the `trigger` method that Respond gives events, passing an optional argument called `arg`:

```js
const arg = { id }
events.profile.trigger(arg)
```

This will result in the `e` object dispatching through the **async plugin pipeline**, which includes a powerful `reduce` plugin. The list of plugins is 100% configurable, even the `reduce` plugin.

Typically `trigger` is called by a component like `Pressable` or `Input`. So you will most commonly just pass the event to a component:

```js
const MyComponent = (props, state) => {
  const { id } = props
  const event = state.events.profile

  return Pressable({ event, arg: { id } }) // component functions
}
```
> Respond provides built-in components like `Pressable` and `Input`, but you can create your own.

Data is passed in to events via the `arg` argument, and will be available at `e.arg` and also merged into `e` for convenience (eg: `e.id`).

You can define a `transform` callback to *create* `e` with additional or modified properties:

```js
updateOne: {
  transform: ({ userId }, arg) => ({ ...arg, userId }),
  submit: ({ db, form }, e) => db.user.updateOne(e.userId, form), // e.userId now available
}
```

You can also define events within a default export object:

```js
export default {
  profile: {
    pattern: '/user/:id',
    fetch: ({ db }, e) => db.user.findOne(e.id),
  },
  updateOne: {
    submit: ({ db, form }) => db.user.updateOne(form),
  }
}
```
> `/events.js`

You then import them via `import events from './events.js'`. This is the recommended way to define events unless you want to put logic between them.

Lastly, you can create them directly in a module by suffixing the event name with `Event`:

```js
import * as events from './events.js'

export default {
  reducers,
  profileEvent: { // <-- event will still be `events.profile`
    pattern: '/user/:id',
    fetch: ({ db }, e) => db.user.findOne(e.id),
  }
}
```
> `/index.js`

That's useful for small single-file modules.



## Built-in Callbacks

Callbacks are powered by Respond's plugin pipeline. Respond comes with many built-in plugins and therefore callbacks. You can completely customize what plugins are used. Here we will discuss the built-in ones.

Most plugins are async. They await the returns of callbacks and do something with the result.

Many callbacks support returning `false` to short-circuit, preventing subsequent callbacks from being called. And most plugins support "auto-merging" of their return into the `e` object passed to the next callback.

Callbacks like `fetch` and `submit` support "auto-dispatch" of the result. Results are dispatched with `.done` postfixed if successful, and `.error` if unsuccessful, so you can switch over them in your reducers like this:

```js
export default (state, e, { events }) => {
  switch (e.event) {
    case events.name.done:
      return { ...state, data: e.arg }

    case events.name.error:
      return { ...state, error: e.error }
  }

  return state
}
```

This is the equivalent of calling, eg, `events.profile.done.dispatch(data)` manually, which you will likely never do. But now you understand that `events.profile.done` is just a nested event automatically added to `events.profile`.

> `e.dispatch()` is the same as `e.trigger()`, except for *response* events, so Respond's replayTools can differentiate between *"trigger"* events and *"respond"* events.

**You can also return *other events***, which will automatically be dispatched. This is how you perform redirects:

```js
export const home = {
  before: ({ user, events }) => user.admin ? events.admin() : events.dashboard(),
}
```
> "auto-redirect"

The backing plugin will therefore call `e.dispatch()` with the return, which in this case is the same as: `events.dashboard.dispatch()`.

Many plugins will support these features, so they will be referenced by name for brevity when documented.

The primary built-in callbacks/plugins are as follows in order of execution:


### `transform`

The `transform` callback is used to transform a minimal set of parameters passed via `arg` into a more helpful set of information, perhaps merging or modifying existing state:

```js
incrementLikeCount: {
  transform: ({ comments }, { id }) => {
    const { count } = comments[id]
    const comment = { id, count: count + 1 } // modify existing state

    return { comment } // optimistic!
  },
  tap: (state, e) => db.comment.updateOne(e.comment), // mutate server
}
```
`transform` happens immediately when `e` is created. Therefore `transform` estbalishes the expected *identity* of each concrete `e` as perceived by subsequent plugins such as `reduce`.

Returning a model name, eg, `comment` is very powerful pattern, as most tables in Respond employ a simple `addToCache` mechanism, which automatically merges if an `id` is present.

By simply dispatching a `comment` object containing its `id`, the `comments` reducer will automatically merge additional fields like `count`. 

This is all that needs to be done to optimistically update the `state.comments` cache. See the **Reducers** section for more on this.

Here we use the `tap` plugin to "tap the database" with a mutation, while ignoring the result. The result can be ignored as we already optimistically performed it.

> Note: the return of most event callbacks merge into `e` for subsequent callbacks, but only `transform` generates `e.payload`, which is guaranteed to be the return of `transform` with no merges like `e` receives.

> `transform` is the only callback that doesn't run in the plugin pipeline and is called immediately in the beginning stage of creating `e`. **It's therefore the only callback that must be syncronous.**

Another common use is for transforming path parameters from URLs:

```js
export const posts = {
  pattern: '/post/:param',
  transform: ({ db }, { param }) => {
    const [section, category] = param.split('-') // custom param transformation
    return { section, category }
  },
  fetch: ({ db }, e) => db.post.findBySectionAndCategory(e.section, e.category),
}
```

or `query` objects or `hash` strings:

```js
export const flights = {
  pattern: '/flight-search',
  transform: (state, { query, hash }) => ({
    flightQuery: query, // example:
    title: hash         // transform to keys recognized by reducers
  })
}
```

Keys for a `query` object and `hash` string will be available if present in the URL. You can assign them directly to state, resulting in a very nice pattern where state is automatically synced to the URL:

```js
export const flights = {
  pattern: '/flight-search',
  transform: (state, { query, hash }) => ({
    flightQuery: query, 
    title: hash        
  })
  reduce: (state, { flightQuery, title }) => {
    Object.assign(state, { flightQuery, title })
  },
  submit: ({ db, flightQuery }) => db.user.queryPaginated(flightQuery),
}
```

> Conversely, if you dispatch `query` or `hash` (eg: `events.flights.trigger({ query, hash })`), the URL will receive the given search string or hash. They are bi-directionally synced. Great for complex search forms like flight trackers, wedding ring search, etc.

In addition, numbers in paths will automatically be converted to integers or floats. **If your needs aren't met, `transform` allows you to do any custom conversion you need.**


All callbacks except `transform` accept `e` as the second argument. In the case of `transform`, the `e` object is not created yet, so instead `arg` is passed so you can *transform* the final `e` object before it's created.

The difference between `e.arg` and `e.payload` is that `e.arg` is only what was initially triggered or dispatched, whereas `e.payload` is the precise return of `transform`.

On `e` lives the result of first merging `arg` and then `payload`. But due to merging, it's not guaranteed to have exactly what you need. Accordingly use `arg` or `payload` for these cases.


### `before`

Runs before event is reduced, usually for the purpose of short-circuiting or redirecting.

Example: *no user available*

```js
export const somethingPrivate = {
  before: ({ user, events }) => user ? undefined : events.login(),
  // omitted
}
```

- supports `return false`
- supports auto-dispatch for errors only
- supports auto-redirect
- supports auto-merge
- when redirecting, pipeline short-circuits like `return false`


### `validate`

Clone of `before`, giving you a second opportunity to do things before `reduce`.

Typically it's used to validate form data before submission, returning an `error` object if validation fails, or refining data for submission.

Example: *validating a form*

```js
export const createProfile = {
  validate: ({ form }) => {
    if (!form.fullname) return { error: 'Please enter a full name' }
    const user = createUser(form) 
    return { user } // refined data for submission (also optimistic)
  },
  submit: ({ db }, e) => db.user.insertOne(e.user)
}
```

> Note: the `user` object returned by `validate` will be optimistically cached by the `users` reducer since the `reduce` plugin runs after:

```js
export default (users, e) => 
  e.user ? addToCache(users, e.user) : users
```
> `/reducers/users.js`


### `reduce`

When the `reduce` callback is specified, other reducers in the module will not run.

It's therefore for straightforward use cases where there's a **one-to-one pairing between a given event and a reducer**. Therefore in that case, it makes a lot of sense to just put a reducer function directly on the event definition:

```js
export const createProfile = {
  reduce: (state, e) => {
    state.user = createUser(state.form) 
  },
  submit: ({ db, user }) => db.user.insertOne(user)
}
```

Here we performed an *optimistic update* client-side before getting the response back from the server.

This behaves the same way as returning `user` from the `validate` callback in the previous example.

Either optimistic approach is fine, and the main thing to note is how easy and natural it is to implement optimistic updates in the first place.

Related to `event.reduce` is `event.reduceBefore` and `event.reduceAfter`, which behave identically to `reduce`, **except the rest of your reducers *still* run in between**.

> You can use `event.reduce` to quickly try things out without having to define a reducer; and just leave it as is until you're sure the rest of the app needs to listen to the event.

> If your certain nowhere else needs to listen, this is the way to go. But often times, you will realize that you implemented the quick and dirty approach, and you would benefit from graduating to full usage of the "PubSub Pattern" (one event -> many reducers).

### `optimistic`

Not awaited, and subsequent callbacks fire immediately (i.e. called in parallel). 

Useful for redirects when you don't care about the result of future callbacks like `submit` (because you know they will always succeed), and you want to provide the snappiest experience to the user.

Example: *optimistically returning to the dashboard from an `editProfile` screen*

```js
export const updateProfile = {
  optimistic: ({ events }) => events.dashboard(),
  submit: ({ db, form }) => db.user.updateProfile(form)
}
```

- response not awaited, subsequent callbacks immediately called in parallel
- auto-redirects
- when redirecting, pipeline does not short-circuit, as the intention is to redirect the user immediately *while* the optimistic update is happening


### `fetch`

```js
export const posts = {
  pattern: '/posts/:category',
  fetch: ({ db }, { category }) => db.post.findMany({ category }),
}
```

- auto-dispatch success data as `events.name.done`
- auto-dispatch error as `events.name.error`
- path caching (eg `/posts/1` will not result in a new fetch)
- `e.meta.cached` will be `true` for reducers to behave accordingly
- `event.cache` key can be used to configure caching behavior (covered below)
- return merged

This is the most common and self-explanatory callback, and one you're likely already familiar with. 

It behaves as you would expect, with built-in URL-based caching based on the URL *visited*, not an api URL since Respond uses RPC.

Respond offers a "level 2" caching of api/db requests, which is covered in [Caching](./caching.md).


### `tap`

Behaves like `optimistc`, except there is no automated features at all. No auto-dispatch, no merged result, etc. And the next callback is immediately called in parallel.

The *feature* is that nothing is done with the response.

The purpose is to signal to developers that this event is fully *optimistc* and was able to update the UI simply based on reducing the trigger event. 

This is for `db` calls that are likely to always succeed. When you see this, you will also know that `db` methods don't need to return a response.

Since optimitic updates are so easy with Respond, you will want to use `tap` every chance you get.

> Under the hood, Respond makes sure the promise is resolved before moving on to the next replay event. It does so in parallel with subsequent callbacks:


### `submit`

`submit` is for when you *do care about the result* from `db`. Your reducers will be able to listen to `events.name.done` and receive results.

- auto-dispatch `.done`
- auto-dispatch `.error`
- auto-redirect
- short-circuit
- return merged

You use `submit` instead of `tap` when you can't optimistically update the UI fully. Typically a `loading` indicator will be displayed, similar to `fetch`, until the response is received.

It's important to note that `.done` will always be fired, *even if nothing is returned from `submit`*. Submissions can't be cached after all.

Consistent response events in this case are a core part of the feature, so `loading` indicators can be reliably hidden.

Another use case for `submit` is when you can optimistically update the UI, **but you either want to store additional data from the server or in rare circumstances undo an incorrect optimistic update**.

One thing that hasn't been mentioned is the way to handle `errors`:

```js
export const save = {
  submit: ({ db }) => ({ error: 'invalid-profile' }), // typically returned from a db method
}
```

Usually you will have a `flash` or `modal` reducer receive all `e.error` objects, resulting in the display of a modal error popup:

```js
export default (flash = null, e, { translations }) => {
  if (e.flash === null) return null

  if (e.error) {
    const message = translations[e.error]
    return { layout: 'alert', message }
  }

  return flash
}
```
> Note: translations in this example need to be stored in state.


### `custom`

When defining your event as a function, it in fact gets converted from function form to object form:

```js
export async function updateOne({ db, form }) {
  await db.user.updateOne(form)
}
```

to:

```js
export const updateOne = {
  custom: async ({ db, form }) => {
    await db.user.updateOne(form)
  }
}
```

`custom` behaves almost identically to `submit`, except it doesn't always dispatch `.done`. `submit` will dispatch `.done` even for empty returns to signal completion. With `custom`, the response event is only dispatched *if a result is in fact returned*.

This is an important distinction because `submit` is intended to be used with `loading` indicators, which need the `.done` response event to be consistently fired, whereas the purpose of *custom* functions is to give full control to the developer.

This is a place to manually call `.dispatch` directly within your event function/callback, or even mutate state directly:

```js
export async function updateOne(state) {
  state.loading = true
  const res = await db.user.updateOne(state.form)
  state.events.foo.dispatch(res)
  state.loading = false
}
```

Using `custom` or a function for your event is how you take full control of the event flow.

Therefore partial automatic dispatch is provided, but only when desired by the developer. 

- auto-dispatch `.done` (when data is returned)
- auto-dispatch `.error` (when error is returned)
- auto-redirect (when event is returned)
- return merged (when data is returned)

However, the `reduce` plugin, and therefore all your reducers, will be called before your *custom* function.

If that's not your desired behavior or you would like a *fully* custom function, where no plugins are dispatched at all, you can define a plugin of your own that does the following:

- runs early in the plugin pipeline
- calls a key of your choosing
- short-circuits before subsequent plugins by returning `false`

Built-in plugins are not intended to be the last say on event behavior. Plugins are extremely easy to make as they are functions with the same signature as callbacks, *but called for all events in a given module*.

So if built-ins don't suit your needs, don't hestitate to make your own.


### `redirect`

`redirect` is a simple callback that always occurs after a reduction. 

The reason is because `redirect` comes *after* `reduce`. This is unlike `before` which runs *before* `reduce` and therefore has the power to cancel reductions by returning `false`.

- auto-redirect
- return merged

It manually serves as an indicator that the given event is primarily about redirection, as you can use many other callbacks to achieve the same effect.

To make it work, just return an event from the callback. However, it can also return data that is merged into the `e` object for subsequent callbacks.

The reason to use it over `before` is because you want the user-triggered event to be reduced. Otherwise use `before`, as it's snappier.

A good use case is for "pivot events" where you aren't sure where to take the user, and need to figure it out dynamically, perhaps in response to async data from `db`.

Example: *dynamic db-driven pivot*

```js
export const pivot = {
  submit: ({ db }) => db.user.loadData(),
  redirect: ({ user, events }) => user.admin ? events.admin() : events.dashboard()
}
```

"Pivot events" are also useful when you don't want to do the work of dynamically selecting events within components. This becomes useful once you're making the same decision in multiple components (or other event callbacks).

That way you can just pass, eg `pivot`, everywhere: `<Pressable event={events.pivot} />`.


### `end`

- auto-dispatch `.data`
- auto-dispatch `.error` with short-circuit
- auto-redirect
- return merged

Notice `.data` is dispatched instead of `.done`. This is because `.done` is reserved specifically for standard `submit` and `fetch` events to provide consistent behavior in reducers, when you want to hide `loading` indicators.

This is for advanced use cases where you have a second set of data, or additional things you'd like to do.

You can use it for any fx you might have, such as requesting push notification permissions, joining a realtime channel, etc. This is where you put that sort of stuff.


### `after`

- auto-dispatch `.data`
- auto-dispatch `.error` with short-circuit
- auto-redirect
- return merged

`after` behaves just like `end`, except it doesn't hold up the async pipeline, and therefore **runs in parallel** to a parent event that redirected to it.

This allows you to write effectful code using `await` without worrying about holding up redirects. It's therefore best used in "pivot" events as described above.

If that's not a concern to you, think of it as a second `end` to group an additional set of functionality.


## Special Keys

Plugins can can do more than just call functions. They can use the presence of various keys and their values to trigger unique behaviors.

Here's the full list of keys put to use by built-in plugins:

### `pattern`

The `pattern` string behaves like it does in most routing libraries to match a given URL to an event.

> It's called `pattern` to differentiate between module "branches" and event "namespaces" which are collectively called paths (eg: `admin.dashboard.post.edit`). And to differentiate between the `path` itself in the address bar. 

> *The secret reason it's called `pattern` is to get you out of the mindset of thinking you're building a website rather than an app.*

Unlike other routing libraries, once a Respond app starts you almost never deal directly with paths again.

When your app starts, Respond matches the incoming URL to an event using `pattern`. For subsequent *navigation* events, Respond will perform the inverse and use the `pattern` to sync the URL.

But you will be triggering events, not paths. **A well designed Respond app should have minimal knowledge of what paths are employed.**

Patterns are powered by [path-to-regexp](https://github.com/pillarjs/path-to-regexp). Read their docs for full usage details.

> On native `pattern` plays lesser a role, as you can choose to trigger an event directly *and* there is no address bar to sync. However the `pattern` will still be used to cache the returns of `fetch`. You may also have deep links, which you can match via `respond.eventFrom(deepPlinkPath)`.


### `cache`

The `cache` value can be `false` to disable caching or a function to perform a custom caching strategy. 

Unlike other callbacks, `cache` receives a 3rd argument for whether Respond internally determined the event was cached or not:

```js
export const friends = {
  pattern: '/friends/:index',
  cache: (state, e, cached) => {
    if (cached) return isReallyCached(state) // make custom determiniation
    return false
  },
  fetch: (s, e) => s.db.user.findFriendsPaginated(s.paginationState),
}
```

`e.meta.cached` will be `true` if a given `navigation` event was visited before. That determinition can be cutomized with this function.

The cache key is the concrete URL, eg `/user/1`,`/user/2`, etc, not the pattern, eg `/user/:id`. So each unique version of a URL will be cached separately.

> Note: unlike `submit`, `fetch` isn't guaranteed to have a follow-up `.done` or `.error` event due to this caching behavior. Therefore `loading` indicators should check the presence of `e.meta.cached`, not just `.done` or `.error` as it won't always be called.


### `kind`

The `kind` of events is automatically determined based on whether it has a `pattern` or not. If it does, it's a `navigation` event, otherwise it's a `submission` event.

However, sometimes you want events to be treated as a `navigation` event even if they don't have a `pattern`. You can do this by setting `event.kind` to `navigation`:

```js
export const warningModal = {
  kind: 'navigation',
}
```

or
```js
import kinds from 'respond/kinds'

export const warningModal = {
  kind: kinds.navigation,
}
```


There are additional `kinds` other than `navigation` and `submission`. They will be covered below in their own section.



### `sync`

When `true`, the `sync` flag indicates to Respond that the event needs to run syncronously. It will therefore run before all async plugins/callbacks.

This is necessary due to how form inputs behave in React, where the cursor will jump if mutations occur asynchronously.

Any *plugins* marked as `sync` are moved to the beginning of the plugin pipeline before async ones to guarantee the desired behavior.

Additionally, the `sync` flag on an *event* allows the syncronous `edit` plugin to capture it during the syncronous phase.

The `edit` plugin runs with syncronous versions of the following plugins:

- `before`
- `reduce` (already sycnronous)
- `debounce` (can be async, since it comes after reduction)
- `end` (can be async too)

That means you can have these 4 callbacks on a sync event.

All namespaces within Respond automatically have an `edit` event added to them:

```js
const edit = {
  kind: kinds.edit,
  sync: true,
}
```

Therefore, you usually never use the `event.sync` flag, but instead just use the built-in edit event, eg: `events.edit` or `events.nestedNamespace.edit`.

The `debounce` plugin is just like the `submit` plugin, except it's debounced:

```js
export const search = {
  debounce: ({ db }, e) => db.table.search(e.searchValue),
  debounceDuration: 300, // optional, default 300ms
}
```
> Note: events with the `debounce` callback will automatically be inferred as `sync`.


If you're concerned about your reducers running unnecessarily just to update a single input, use the `reduce` callback:

```js
export const search = {
  reduce(state, e) {
    state.searchValue = e.searchValue /// et voila!
  },
  debounce: ({ db }, e) => db.table.search(e.searchValue),
}
```
> Because Respond is comprised of modules, reducers are already optimized to run only if their module is targeted by an event. Therefore through thoughtful branching of modules, you get improved O(log n) performance for free.


### `namespace`

If Respond incorrectly thinks your `event` is a namespace, you can set this to `false` to fix that.

The reverse can happen with a file of events which are all `functions`. The solution is to put the following at the top of the events file:

```js
export const namespace = true
```



## Namespaces

Namespaces are a way to group events together, and are useful for organizing your code.

Until now, you've seen events defined at the top level of your module, like this:

```js
export const profile = {
  pattern: '/user/:id',
  fetch: ({ db }, e) => db.user.findOne(e.id),
}
```

But you can also import them as namespaces like this:

```js
export { default as user } from './user.js'
export { default as post } from './post.js'
export { default as foo } from './foo.js'
```
> `/events/index.js`

When you import these into your module, you end up with *paths* like `events.user.profile` instead of `events.profile`.

Respond supports infinite testing -- so you can have namespaces within namespaces, and so on.

A good iterative step is to start out with multiple namespaces in a single module, and then when any namespace gets too big, you can break it out into its own module. When you do, you won't have to change paths, as they will be the same.


## Kinds

User-triggered events can either be `navigation` or `submission`.

Because you will use this so much, the distinction is almost as important as the difference between "trigger" and "response" events.

Navigation events have patterns and therefore correspond to "universal resource locations" that users may want to return to. 

Navigation events therefore are cues for reducers to switch screens, pages, etc.

For example, here's a simple `screen` reducer:

```js
export default (screen, e, { kinds }) => e.kind === kinds.navigation ? e : screen
```

You can then select which component to display based on the value of `state.screen`:

```js
const Screen = (props, { screen }) => {
  const Component = screens[screen.event.name]
  return Compnent()
}


const screens = {
  home: HomeScreen,
  profile: ProfileScreen,
  settings: SettingsScreen,
  etc
}
```

> Given how easy this is to do, there's no magical routing component. Instead, you `reduce` and *select* `state` to display things.

From here, `submission` events can happen without *switching* the screen, such as editing + submitting a form. The `screen` state is said to be "sticky."

This is because `state.screen` ignores events that aren't of kind `navigation`.

Another common use case is `state.loading` reducers which listen to these 2 kinds, but also the *3 response kinds*: 

- `done`
- `error`
- `data`

Let's see how all 5 kinds come together in a typical `loading` reducer:

```js
export default (loading, e, { kinds }) => {
  switch (e.event.kind) {
    case kinds.submission: return true
    case kinds.navigation: return !e.meta.cached

    case kinds.done:       return false
    case kinds.error:      return false
    case kinds.data:       return false
  }

  return loading
}
```


#### Other Kinds:

- `init` runs at startup (rarely used as reducers typically initialize in response to `undefined` states)
- `edit` triggered by the built-in `edit` event 

All in all, you will rarely assign kinds manually, and just default to what Respond infers.

Where you use kinds is to **blanket capture** entire *kinds* of events in reducers or plugins, rather than many individual events.


## `eventFrom` and `fromEvent` (occasional usage)

In the rare cases (such as native deep linking) where you need to manually convert between URLs, you can use these functions:

```js
const e = state.respond.eventFrom(url) // also can pass `location` object
await e.trigger()

const location = state.respond.fromEvent(event)
doSomething(location) // eg location.url, location.pathname, etc
```

Respond maintains a custom `location` object of this shape: `{ url, pathname, search, hash }` where `url` is the relative URL, including search and hash if available.

## Query Strings and Hashes

Respond has automatic support for query strings and hashes.

If the URL has them, they will be available at `e.query` and `e.hash` respectively in your event callbacks, as well as reducers.

You can also dispatch them manually, and they will appear in the URL, as they are bi-directionally synchronized like paths.

If you don't like the query parsing + stringification algorithm, you can replace them at `state.options.parseSearch` and `state.options.stringifyQuery` respectively within your module definition.

This feature is actually a very underrated feature, as you can maintain state in the address bar simply by syncing `e.query` to `state`:

```js
export const search = {
  pattern: '/search',
  before: (state, e) => {
    Object.assign(state.query, e.query) // syncronized bi-directionally
  },
  fetch: ({ db, query }) => db.rings.queryPaginated(query),
}
```

That will work on visits within the browser, and will be kept in sync each time you call `events.search.trigger({ query })`.

In both cases `state.query` will be kept up to date along with the address bar.

Queries and hashes should behave as you would expect once you grok the magic of linking to a value in state like `state.query`.

This is the idiom you want to use when building a complex search form, such as flight search, wedding ring search, etc. 

That way the user has shareable URLs that they can share with others.

What's nice about this is there's often one-to-one pairing between all of the following:

- what the user is entering
- what you're storing in state
- what you're requesting from the server
- and what's shown in the address bar search string.

4 tasks are collapsed at once.

So you can pretty much just trigger events with an object containing the user's latest search query, and everything else will automatically be synced up.

> Tip: If it's a basic paginated or infinite list, stick to just URL params like `/blog/:slug`, `/blog/:index` and `/blog/:category/:index`.


### `fromLocation` and `locationFrom` (rarely needed)

For complex transformations, there's also `locationFrom` and `fromLocation` callbacks which provide fine-grained control over elements of the URL.

```js
export const searchyHashyEvent = {
  pattern: '/searchy-hashy/:foo',
  locationFrom: (state, e) => {
    const { query, hash } = e.arg
    const pathname = '/customized'
    return { pathname, query, hash } // must return all 3
  },
  fromLocation: (state, e) => {
    const { search, hash } = e
    return customTransformation(search, hash) // should return { query, hash } or whatever you want `arg` to be
  },
}
```

> Notice that when receiving a `location` object, you're receiving the `search` *string* instead of a `query` *object*.

`locationFrom` must return a `location` object with at least `pathname`, and `query` or `hash` if available.

`fromLocation` only must return what you expect for `arg` to be, but typically is used for converting a `search` string to a `query` object, or a custom conversion of the `hash`.

You'll rarely need these functions, especially when getting started. But they are there for more advanced use cases.


### `meta` "Back Channel"

Calls to `e.trigger` and `e.dispatch` actually receive a 2nd argument:

```js
events.foo.trigger(arg, meta)
```

The purpose of the `meta` argument is for marking implementation details, rather than standard app domain data.

For example, internally here are some of its uses:

- marking events as `trigger` events
- whether `navigation` event was cached (`e.meta.cached`)
- marking parallel events in the optional `parallel` plugin
- marking events that came from inputs for optimized replays

You can use it as a back channel for whatever you would like, but keep in mind its focus on implementation details.

You can also pass it within `arg` if that ends up being more convenient: 

```js
events.foo.trigger({ meta: { foo: 'bar' } })
```