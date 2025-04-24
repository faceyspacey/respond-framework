# Reducers

Reducers are the "response" to your events. 

If you're coming from the server-side MVC world, you will be right at home. Events are like "controllers" receiving a `request` as an `e` object. And reducers are like the "models" that produce your `response`.

> Reducers are the heart of Respond. "Thin event [callbacks], fat *reducers*."

Where they shine is in how they simplify components that can now be "dumb" templates (thanks to "separation of concerns"). Centralizing business logic in `reducers` will help you extract your problem domain in a way that combining this logic with component **implementation details** cannot.

You will realize that mixing state transformations with fetching, submission events and hooks like `useEffect` and `useState` in components is comparatively a nightmare.

And since Respond has developer-defined module & composition system at a higher level, you won't be missing anything by no longer putting these things in components.


## 3 Arg Reducers

In Respond, reducers functions take 3 arguments:

```js
export default (drawerScreen, e, state) => {
  const { events, kinds } = state
  const { drawer } = events

  if (drawerScreen === undefined) {
    return state.userId ? drawer.account() : drawer.guest() // default drawer screen
  }

  switch (e.event) {
    case drawer.logout:
    case events.join.home:
      return drawer.guest()
  }

  if (e.event.namespace !== drawer) return drawerScreen

  return e.kind === kinds.navigation ? e : drawerScreen // make navigations "sticky"
}
```

The 3rd `state` argument is the current module state.

This allows for several key benefits:

- reducers can depend on other reducers without more complex solutions
- you don't have to import the `events` you will `switch` on, or anything that lives in your module's `state` object
- you can even mutate other aspects of state on the `state` argument

It's good that *each reducer* is pure, but it's not required for determinism. What matters is that the ***overall reducer***, *which calls your reducer slices*, is pure or at least deterministic.

In rare cases, it's expedient to mutate other bits of state within a reducer.

You also don't have to return anything from a reducer. If `undefined` is returned, the state will be unchanged.


## Grouping Reducers

You can group and nest reducers simply by putting them in an object within your `reducers` object:

```js
export default {
  drawer: {
    foo: (foo, e) => '',
    bar: (bar, e) => '',
  }
}
```
> `/reducers.js`

When you do this, a 4th argument is available, corresponding to the group of reducers:

```js
export default (bar = 'bar', e, state, group) => {
  return group.foo ? 'foobar' : bar
}
```

You can nest groups as deeply as you want.


## Reducer Ordering & Dependent Reducers

Since reducers receive 2 additional arguments, they can depend on each other.

This may seem like an "anti-pattern", but the real anti-pattern is what you end up having to do in complex cases *when you don't have this capability*.

Use it judiciously, and only when you truly need it.

Other reducers should be commented in code as depending on another reducer.

A common example is when you have a `screen` or `curr` reducer, which "sticks" to a given event for the purpose of rendering a screen:

```js
export default (screen, e, { kinds }) => e.kind === kinds.navigation ? e : screen
```

Now let's imagine you want to keep track of the previous screen:

```js
export default {
  drawer: {
    prev: (prev, e, { kinds, curr }) => e.kind === kinds.navigation ? curr : prev, // swap prev with curr
    curr: (curr, e, { kinds }) => e.kind === kinds.navigation ? e : curr,
  },
}
```

As you can see, ordering lets you naturally do this.


## "Sticky Reducers" - Learning How to Reduce

Respond's event + reducer pattern is more generally known as the "PubSub" pattern.

To use it correctly, you publish/dispatch less, and subscribe/reduce more.

To understand, let's first look at incorrect "imperative" usage -- the following can actually be a single event:

```js
events.logout.trigger()
events.unsetUserId.trigger()
events.home.trigger()
```

This is what traditional apps might do for the single user-triggered event of *logging out*.

Instead, what we want to do is have **multiple reducers listen to a *single event***. Here's 3 reducers that can accomplish that:


```js
export default (token = '', e, { events }) => {
  switch (e.event) {
    case events.home:
    case events.drawer.logout: // single event "published"
      return ''
  }

  return e.token ?? token
}
```
> `/reducers/token.js`

```js
export default (userId = '', e, { events }) => {
  switch (e.event) {
    case events.home:
    case events.drawer.logout: // single event "published"
      return ''
  }

  return e.userId ?? userId
}
```
> `/reducers/userId.js`


```js
export default (screen, e, { events }) => {
  if (screen === undefined) return events.home()

  switch (e.event) {
    case events.home:
    case events.other:
    case events.another:
      return e

    case events.drawer.logout: // single event "published"
      return events.home()
  }

  return screen
}
```
> `/reducers/screen.js`

When you think of the "PubSub" pattern, this *one-to-many mapping* to subscribers is the heart of it.

Now the underlying events can be deterministically replayable by Respond's Replay Tools, and automatically become your tests.

The takeaway is to only trigger events for natural user interactions, and then make your reducers intelligent enough to *infer* state based on the least amount of events.

> In comparison to the one-to-one mapping of most routing frameworks like NextJS, the key is the additional **indirection** that reducing, aka "PubSub", provides.

The magic lies more in what events you *ignore*, and how you *reduce* them, than in what events you dispatch.

Draw on your experience reducing arrays:

```js
const sum = array.reduce((acc, item) => {
  if (!item.num) return acc // ignored

  acc += item.num // "sticky"
  return acc
}, 0)
```

By ignoring events, you make the ones you didn't ignore "sticky" in the form of the state that remains.

Let's imagine that we have a settings screen, where the user will edit a form. We want the `screen` to ignore these events, while *sticking* to the original `navigation` event:

```js
export default (screen, e, { events }) => {
  switch (e.event) {
    case events.home:
    case events.drawer.logout:
      return events.home()

    case events.settings:
      return events.settings()
  }

  return screen ?? events.home()
}
```

```js
const Switch = (props, { screen }) => {
  const Component = screens[screen.event.name]
  return <Component />
}

const screens = {
  home: HomeScreen,
  settings: SettingsScreen,
}
```

What happens if we dispatch `events.edit` or `events.save`?

They are ignored. And therefore the `screen` reducer is said to "stick" to the original `navigation` event. `screen` is a "sticky reducer."

This allows for `submission` events to occur *on the settings screen*.

> Understand "sticky reducers" and you understand Respond.


## Switchin over Namespaces

You can also switch over namespaces or even child modules

```js
export (state, e, { events }) => {
  switch (e.event.namespace) { // <-- namespace
    case events.admin:
      return 'admin'

    case events.drawer:
      return 'drawer'
  }

  return state
}
```

In the above, case we have a single module, but different namespaces for events.

Now imagine we refactored our app to have full-fledged modules for those namespaces:

```js
export (state, e, state) => {
  switch (e.event.module) { // <-- module
    case state:
      return 'root'

    case state.admin:
      return 'admin'

    case state.drawer:
      return 'drawer'
  }

  return state
}
```

Now you have 3 ways to efficiently differentiate between events in a batch:

- `e.event.namespace`
- `e.event.module`
- `e.event.kind`


## `in` + `is` Helpers

You can also match against an array of events, namespaces or modules:

```js
export (state, e, state) => {
  const { events } = state

  if (e.event.in(events.updateOne, events.save)) { // .in(...events)
    // do something
  }

  if (e.event.namespace.in(events.admin, events.drawer)) { // .in(...namespaces)
    // do something
  }

  if (e.event.module.in(state.admin, state.drawer)) { // .in(...modules)
    // do something
  }

  return state
}
```

For consistency, there's also an `is` helper, which is the same as an equality (`===`) check:

```js
export (state, e, state) => {
  const { events } = state
  
  if (e.event.is(events.updateOne)) { // event === events.updateOne
    // do something
  }

  if (e.event.namespace.is(events.admin)) { // event.namespace === events.admin
    // do something
  }

  if (e.event.module.is(state.admin)) { // event.module === state.admin
    // do something
  }
  
  return state
}
```

To iterate quickly, you can start out with an `is`, and then change it to `in` when you want to match more cases.




## Module Reduction Behavior

Reduction in Respond is powered by a `reduce` plugin. In *effect*, reducing is just another event callback that happens to be syncronous (and runs for all events like all plugins do).

> If you wanted, you could create an `async` reduce plugin, and perform fetching via the `db` singleton right in the reduction. What matters is "determinism" not purity.

The power of Respond's `reduce` plugin is how it recurses modules. 

By default, modules are reduced "depth-first", giving parents an opportunity to do something with the result of their children's reductions.

You can customize this behavior by providing a `reduce` method on your module:

```js
export default {
  id,
  plugins,
  events,
  reducers,
  etc,
  reduce(state, e, next, reduce) {
    reduce() // reduce current module first (top-to-bottom instead of depth-first)
    next()   // reduce child modules

    // perhaps run some code that needs to run depth-first
  }
}
```
> `/index.js`

Here `reduce` reduces the current module, and `next` reduces the child modules. 

You can then continue to reduce a few things depth-first after the call to `next()`. It's the best of both worlds.


### Event Capture (Parents Listen to Children)

Parent reducers are guaranteed to see the events of their children, grandchildren, and so on. This is crucial Respond functionality.

You can use this capability so root and ancestor modules can manage the rest of the app.

This makes complex scene changes a breeze -- such as nicely animating from one sibling module to another.

You can also use this to optimize performance, by breaking out functionality into siblings.

For example you can architect your module tree like this:

* root
    * users
    * posts
    * videos
    * xyz

In this design, the `root` module will have the reducers necessary to manage the children. Then child reducers will not run when events are triggered by a sibling branch.

This was a concern of Redux Classic. Respond puts this concern to rest: **by using modules to isolate state, you get better performance for free**.



## Built-in Reducers

Respond comes with several overridable built-in reducers. You can also disable them by setting them to `null` in your `reducers` object. They will be created for each module.

We will go through them in turn as a source of inspiration for your own reducers.

### `userId`

Respond comes with built-in authentication. The `userId` + `token` reducers in your root module are what power it. They are passed down to all children via built-in selectors of the same name.

The names of these 2 reducers are reserved, both as a reducer and a key on events to ensure any event can provide them.

```js
export default (state = '', e) => typeof e.userId === 'string' ? e.userId : state
```

### `token`

`token` behaves the same as `userId`:

```js
export default (state = '', e) => typeof e.token === 'string' ? e.token : state
```
> There's a little bit more code which has been omitted to provide a `token` in replays.

These 2 reducers are examples of "sticky reducers." They show how to make values in state "sticky" for long periods of time.

They also demonstrate how to simplify things, rather than switching over events/namespaces/etc.

You can use this same approach to make any model *stick*. 

For example, if you have a video app, and you want the selected `video` to be sticky, you would create a similar sticky `videoId` reducer paired with a `video` navigation event:


```js
export default (videoId = null, e) => {
  switch (e.event) {
    case events.video:
      return e.id
  }

  return videoId
}
```
> `/reducers/videoId.js`



```js
export default {
  video: {
    pattern: '/video/:id',
    fetch: ({ db }, e) => db.video.findOne(e.id),
  }
}
```
> `/events.js`

Assuming we also cached the return from `fetch` in our `videos` reducer, we can marry the sticky `videoId` with the corresponding cached model:

```js
const VideoScreen = (props, { videos, videoId }) => {
  const video = videos[videoId]
  const { title, src } = video

  return Container(
    Title(title),
    Player({ src }),
  )
}
```
> `/App/MyComponent.js`


Other events can now be dispatched or triggered without obstructing `VideoScreen` until the next `video` navigation.


### `cache` (eg `state.videos`, `state.users`, etc)

Respond automatically generates "cache" reducers for each of your tables. 

You can override these reducers as well as create your own for nested or virtual models (eg: `state.videos[videoId].comments`).

Here's what a the `videos` cache reducer from the example above looks like:

```js
export default (cache = {}, e, { respond }) =>
  e.video ? respond.addToCache(cache, e.video) : cache
```
> `/reducers/videos.js`

If `e.video` is present, it will be added to the cache. If it's already in the cache, it will be merged.

In actuality, it runs like this:

```js
export default (cache = {}, e, { respond }) =>
  respond.addToCache(cache, e.video, e.videos)
```
> `/reducers/videos.js`

> Both singular and plural forms of the given table will be added to the cache. I.e. individual models or arrays of models. If none came through in the current event, nothing will occur.


This allows your db table methods to return models and have them automatically marshalled through event callbacks to the cache, just by naming them in the singular or plural name of the given table.

Further, this is also "collapsed" as table methods *automatically* name the keys on `e` for you. 

> If you have custom methods that returns multiple things, eg, `{ user, posts }`, you will arrive at the same outcome.

By returning models adjacent to one another, you can collapse the need for "normalizing state", ie normalizing API requests.

Prefer this:

```js
{
  user,
  posts,
  etc
}
```

over this:

```js
{
  user: {
    posts: [
      { id: 1, title: 'React' },
      { id: 2, title: 'Respond' },
    ]
  }
}
```

Since Respond is fullstack, you have control over api requests:

```js
export default {
  async findMyPosts() {
    const [user, posts] = await Promise.all([
      this.db.user.findOne(this.identity.id),
      this.db.post.findMany({ userId: this.identity.id })
    ])

    return { user, posts }
  }
}
```
> `/db/user.js`


For occasions that you do have table column containing nested objects, it's not that difficult to handle either:

```js
export default (cache = {}, e, { respond }) =>
  respond.addToCache(cache, e.user.posts)
```
> `/reducers/posts.js`

Since Respond's reactive state management is mutable, when you update a `post` in `state.posts`, it will also be reflected in the `state.users[id].posts` array.

That way you can continue to refer to posts directly on a `user` object if that's more convenient. 

In many cases, you won't need a "virtual" cache reducer for the nested models. For example:

```js
const Posts = (props, { user }) =>
  Container(
    Title(`${user.name}'s Recent Posts`),
    ...user.posts.slice(0, 5).map(p => Post(p))
  )
```

Only break it out separately if you want easy access to nested models by `id` somewhere else.


### `stack`

Keep track of previous `navigation` events for the purpose of rendering a screen, and going back/forward.

```js
export default function (stack = { entries: [], index: -1 }, e, { respond, kinds }) {
  if (e.kind !== kinds.navigation) return stack
  if (e.meta.parallel) return stack
  
  const { entries, index: i } = stack

  if      (respond.isEqualNavigations(e, entries[i])) {      // current event repeated

  }
  else if (respond.isEqualNavigations(e, entries[i - 1])) {  // back
    stack.index = Math.max(i - 1, 0)
  }
  else if (respond.isEqualNavigations(e, entries[i + 1])) {  // next
    stack.index = i + 1
  }
  else {
    entries.splice(i + 1, entries.length, e) // push -- delete stale tail like history.push
    stack.index = entries.length - 1
  }

  return stack
}
```
> `/src/reducers/stack.js`

To use this reducer, all you must do is dispatch `navigation` events as you normally would.

The built-in method, `respond.isEqualNavigations`, will compare the URL (including queries/hashes) to determine equality.

Repeated navigation events will be ignored, and back/forward navigations will be inferred, while using the same `e` entry reference for component rendering performance.

New entries will clip the tail just like the browser's history stack (i.e. `history.push`).

You can import this reducer and use it within your own reducer to add features like a `back` button:

```js
import { stack } from 'respond-framework/reducers'


export default (stack, e, state) => {
  if (stack === undefined) return {
    index: 0,
    entries: [drawer.account()]
  }

  const { drawer } = state.events

  switch (e.event) {
    case drawer.back: {
      stack.index = Math.max(stack.index - 1, 0)
      break
    }
  }

  return stack(stack, e, state)
}
```

Here we assumed the `stack` pertains to a Drawer, and added support for a `back` button + a default initial entry of `drawer.account`, which is the Drawer home screen.

The `back` button is a special case that allows any screen to go back *without knowing what the previous screen was*.

> You could also handle this by making the `drawer.back` event a "pivot" event that uses `stack.entries[stack.index - 1]` to determine the previous screen, and then dispatches it, thereby relying on the standard `stack` reducer behavior. But the way we did it ensures event callbacks don't run when we don't need them to.

This is possible in Respond -- even on web -- because browser `history` does not need to know the actual *history*. Since Respond "traps" visitors, you can "drain" navigators/stacks however you like:

```js
export default {
  pop: { // special event recognized by the "trap"
    back: ({ events }) => events.drawer.back(),
    forward: ({ events }) => {
      return events.home() // do something custom
    },
  }
}
```
> `/events.js`

> Note: without pop handlers or if they return `undefined`, the default behavior of bouncing off the site will occur.


## Recipes for Common Reducers

### `screen` (eg: `drawer`, `main`, `dashboard`)

The first skill you need to get incredibly comfortable with is rendering a screen from state.

Since rendering a "screen" from state is so easy, Respond offers no `Route` component. 

Here's the most basic sticky screen reducer, which you have seen several times already:

```js
export default (screen, e, { kinds }) => e.kind === kinds.navigation ? e : screen
```

Because `navigation` events are common and central to UI experiences, Respond designates them as their own **kind**. This designation is almost as important as the distinction between *trigger* vs *response* events.

Here's how you can render a *Screen* from `screen` state:

```js
const Screen = (props, { screen }) => {
  const Component = screens[screen.event.name]
  return Component()
}

const screens = {
  home: HomeScreen,
  settings: SettingsScreen,
  // etc
}
```

Sometimes you have a small number of components where you simply use a *flag* to dynamically select which component to render:

```js
const Switch = (props, { someFlag }) => {
  const Component = someFlag ? HomeScreen : SettingsScreen
  return Component()
}
```

As you can see there's no magic being kept from you to render things. It's just logical usage of `state`. 

Once you get familiar with this approach, you'll realize Respond excels at truly "appy" things where you have multiple placeholders for *screen-like* things at the same time, such as in a drawer, modal, or multiple tabs on a tab bar, all appearing at once.


### `flag` (eg: `showDrawer`, `showModal`, `inAdmin`)

Boolean flags are another common pattern that you will use a lot.

You can use them to trigger the display of core elements of *layout*:

```js
export default (showDrawer = false, e, { events }) => {
  switch (e.event) {
    case events.drawer.account:
    case events.drawer.settings:
    case events.drawer.editProfile:
      return true

    case events.login:
    case events.main.view:
      return false
  }

  return showDrawer
}
```

You can do it in one line using an event `namespace` if the drawer is always visible while its events are being dispatched:

```js
export default (state, e, { events }) => e.event.namespace === events.drawer
```

If you have nested namespaces, you can switch over multiple namespaces just as you would events:

```js
export default (state = false, e, { events, kinds }) => {
  switch (e.event.namespace) {
    case events.drawer:
    case events.drawer.userProfile:
      return true
  }

  return false
}
```

If you have an event within the `drawer` namespace that should result in closing the Drawer such as `logout`, you can differentiate between `navigation` and other events such as `submission`:


```js
export default (state = false, e, { events, kinds }) => {
  if (e.kind === kinds.navigation) {
    switch (e.event.namespace) {
      case events.drawer:
      case events.drawer.userProfile:
        return true
    }
    
    return false
  }
  else if (e.event === events.drawer.logout) {
    return false
  }
  
  return state
}
```

In non-reductive environments -- or when reducing imperatively/incorrectly -- the ease of how this should be done can be totally missed.

Notice, we didn't do it like this:

```js
export default (state = false, e, { events }) => {
  switch (e.event) {
    case events.drawer.show:
      return true

    case events.drawer.hide:
      return false
  }

  return state
}
```

If we had done it that way, we'd also have to dispatch, eg, `events.drawer.settings`.

Therein lies the power of *reduction*. It also allows you to use reducers as "storage bins" for all logic associated with it. That way you don't lose track of how it's supposed to operate when, for example, many different components need to open the drawer.

> It's also the key to determinism, as in actuality, there is *only one user-triggered event*.

Layout boolean flags are incredibly powerful in that they are always listening to *all events* (within their module or child modules). If they miss some events in a sibling module, then *lift* the reducer to a parent. 

The same principles and techniques with regards to components and "lifting state" applies to modules too.

Here's an example of our "flag" reducer solving a cross-cutting concern related to some far-flung portion of the app with ease:

```js
export default (showDrawer = false, e, { events }) => {
  const isDrawer = e.event.namespace === events.drawer
  if (isDrawer) return true
  
  if (e.error === 'missing-payment-info') return true // show drawer in this special case

  return false
}
```

Then anywhere else in the app that happens to send this error will automatically have the drawer open.

Of course you will also need the drawer's `stack` reducer to display the Payment Info screen.

Just make sure you have *lifted* your module above all modules that might dispatch `e.error === 'missing-payment-info'`.



### `loading`

Traditional React has overblown and overengineered the concept of "loading" state, with "Suspense" being a solution to a problem that doesn't exist in Respond.

Here's a simple loading Reducer that many apps can use for **every single loading state** their app requires:

```js
export default (loading, e, { kinds }) => {
  switch (e.event.kind) {
    case kinds.submission: return true
    case kinds.navigation: return !e.meta.cached // not loading if cached

    case kinds.done:       return false
    case kinds.error:      return false
    case kinds.data:       return false
  }

  return loading
}
```


In your components, you can simply display a loading spinner if `state.loading` is true.

You can go farther with a "truthy" loading state that specifies event identifiers of exactly what's loading:

```js
export default (loading, e, { kinds }) => {
  switch (e.event.kind) {
    case kinds.submission: return e.event // truthy for targeted loading indicators
    case kinds.navigation: return e.meta.cached ? false : e.event

    case kinds.done:       return false
    case kinds.error:      return false
    case kinds.data:       return false
  }

  return loading
}
```

With that you can target loading indicators to different places on the screen, depending on which event was triggered:

```js
const LoginSignup = (props, { loading, events: { signup, login } }) =>
  Container(
    SignupButton({ event: signup, loading: loading === signup }),
    LoginButton({ event: login, loading: loading === login })
  )
```
> Imagine a small loading spinner on each button.

To complete the mission, we must *invert* our `screen` reducer to not switch screens until ***after*** the loading state is complete:

```js
const screen = (screen, e, { kinds }) =>
  e.meta.from.kind === kinds.navigation ? e : screen
```

If you're paying close attention, that reveals React Suspense and its exploding API as unncessary complexity (`useTransition`, `useDefferedValue`, `useActionState`, etc) .

In Respond, you have module-wide and app-wide control of fine-grained states, and can target components anyhwere in the tree without the "inversion of control" provided by Suspense.

For most apps, displaying the loading state on the current screen is a minority use case. It's usually just an occasional button here and there. But Respond offers this naturally if you need it.


### `form`

Form reduction also isn't some arkane art, requiring special expertise, resulting in library authors coming up with a million ways to do something that should be simple.

In Respond, editing a form is just a case of triggering an event on an `Input` with the same ease as you would on a `Pressable`, and performing a simple mutation:

```js
export default (form = {}, e, { events }) => {
  if (e.event === events.edit) Object.assign(form, e.arg) // mutation
  return form
}
```

Here, we're listening to any `edit`, and assigning `e.arg` to `form`. `arg` will contain `{ lastName: 'Gillmore' }`, because that's what the `Input` component triggers.

In its simplest *form*, you can use the same `form` reducer for all your forms in just a few lines:

```js
export default (form = {}, e, { events, user, video }) => {
  if (e.event === events.edit) Object.assign(form, e.arg)
    
  switch (e.event) {
    case events.editProfile:
    case events.editPaymentMethods:
      return user.clone()

    case events.updateVideo:
      return video.clone()
  }

  return form
}
```


Two things to notice:

- we are using the same `form` for different features
- we are cloning a pre-existing model, so we can access to its methods/getters

> Keep in mind the purpose of a `form` reducer: **to create *temporary state* before swapping it after user approval/submission.**

> Otherwise, we would just mutate a model directly, and always have access to its methods/getters.

What if we don't have the `video` model already?


```js
export default (form, e, { events, video, db }) => {
  if (e.event === events.edit) Object.assign(form, e.arg)
    
  switch (e.event) {
    case events.createVideo:
    case events.save.done:
      return db.video.create() // empty model (with optimistic id)

    case events.updateVideo:
    case events.updateVideo.done:
      return video?.clone() ?? db.video.create() // video possibly not fetched yet
  }

  return form ?? db.video.create() // default state if undefined
}
```

In the `updateVideo` case, we won't have the video until `.done` unless the navigation event was cached (or we already have the model). So we need need to put to use an empty model for a few moments via `?? db.video.create()`.

In the create case, we are starting from an empty model.

In all cases we can use model getters and methods on `state.form` within a component, eg:

```js
const VideoForm = (props, { form, you, curr }) => {
  const permitted = form.permitted(you) // method like video.permitted(user)

  if (permitted) {
    return Container(
      Title('Video Upload'),
      Input({ name: 'title', value: form.title }),
      Input({ name: 'description', value: form.description }),
      SubmitButton({ event: events.saveVideo })
    )
  }
}
```

Upon submission (`events.save`), we can clear the form by assigning another empty model.

Let's now do a login/signup form:

```js
export default (form, e, { events, db, users }) => {
  if (e.event === events.edit) {
    return Object.assign(form, e.arg)
  }
    
  switch (e.event) {
    case events.login:
    case events.signup:
    case events.submitPassword.done: // clear
      return db.user.make() // empty model (without optimistic id)

    case events.forgotPassword:
      return form.email ? form : db.user.make() // remember email
  }

  return form ?? db.user.make()
}
```
> `user.make()` creates a model without an optimistic unique `id` like `user.create()`. We do this because we are just using the `user` model for its methods/getters, not to insert a new model into the database.

Here we're *remembering* `form` state between navigation events, so that on `forgotPassword` the user doesn't have to re-type his email again. 

This is very common missed opportunity in the majority of apps. If they were using Respond, it would be trivial to provide the best experience.


### Gotchas on Multiple `form` Reducers

#### Animations
If you need to transition between forms in an animated Navigator -- where each screen builds a new model -- you'd use 2 independent `form` reducers, so that the current one doesn't clear itself prematurely while fading out.

#### Remembering
If you want to remember incomplete forms, say in an administration panel where you have a form for each table/model, you might want a hash called `form`, with a key for each model. That way the admin can navigate between tables, and have forms remember what they were working on.

The key to deciding whether you need multiple `form` reducers is whether there's a true need to ***remember*** the `form` state after the user leaves the screen.

If not -- and during the beginning stages of your app -- treat yourself to having a single `form` reducer to manage.


### Abstraction Example


Say, we have an admin panel, and every table has the same form. We could create selectors for `table` and `model`: 

```js
export default (form = {}, e, { events, table, model }) => {
  if (e.event === events.edit) Object.assign(form, e.arg)
    
  switch (e.event) {
    case events.createVideo:
    case events.save.done:
      return table.create() 

    case events.updateVideo:
    case events.updateVideo.done:
      return model?.clone() ?? table.create()
  }

  return form
}
```

- `table` is`db.post`, `db.user`, etc
- `model` is `state.posts[state.postId]`, `state.users[state.userId]`, etc

To facilitate this we would have a "sticky" `table` reducer, which changes as the admin navigates between areas of the admin panel.

Another way to do this would be to create a dynamic reusable module that receives a `tableName` as a prop.


### `list`

When you want to show different "views" of models or need optimium rendering performance, you can use `list` reducers.

`list` reducers work by maintaining a list of `ids` for a given model. 

In its simplest form, you will store a `list` at the same time as a `cache` reducer captures models:


```js
export default (list = [], e, { events }) => {
  switch (e.event) {
    case events.enterGame.done:
      return e.players.map(p => p.id)

    case events.addPlayer:
      return [...list, e.player.id]

    case events.removePlayer:
      return list.filter(id => id !== e.id)
  }

  return list
}
```
> `/reducers/list.js`

```js
export default (cache = {}, e, { respond }) =>
  respond.addToCache(cache, e.players, e.player)
```
> `/reducers/players.js` (cache reducer)

In this example, we are starting a game, and when we receive the data in `events.enterGame.done`, we add the player ids to the `list` and the models to a `cache` reducer.

`player` models may have their properties mutated without changing `list`, so to optimize rendering we'll use the "Connected Child" pattern:

```js
const ParentList = (props, { list }) =>
  Container(
    list.map(id => Child({ id, key: id })),
    AddButton({ event: events.addPlayer })
  )

const Child = ({ id }, { players }) =>
  Container(
    Title(players[id].name),
    RemoveButton({ event: events.removePlayer, arg: { id } })
  )
```

Here only the `Child` accesses all the data of a `player` model. The `id` will not change, and so long as the `list` of ids doesn't change, you can mutate the child (eg change the `name`) without re-rendering other children.

Additionally, React can optimize if the list *does change*, but their `key` remains the same.

This is a very powerful pattern once we get to pagination and infinite lists, which we'll cover next.

Before moving on, let's imagine we have another list of players, perhaps we an "all time leaderboard":

```js
export default (leaderboard = [], e, { events, players }) => {
  switch (e.event) {
    case events.leaderboard.done:
      return e.players.map(p => p.id)

    case events.sortBest:
      return list.sort((a, b) => players[b].score - players[a].score)

    case events.sortAlphabetical:
      return list.sort((a, b) => players[a].name.localeCompare(players[b].name))
  }

  return list
}
```
> `/reducers/leaderboard.js` (also a "list" reducer)

We can now re-use the same `players` cache, but with a completely different list.

And as you can see, we can provide additional "views" in the form of sorting and filtering.

Because client-side database normalization is automatic in Respond, `list` reducers become one of the few areas you need to customize.

Other "fetching libraries" hide this stuff from you behind an interface, limiting what you can do. Respond instead provides the "right level of abstraction" where it's both natural to handle and you have full control.

This is what you really want as this is ***the unique work of your app*** where you need complete flexibility. 

> If you want to make pro apps, you must learn fine-grained construction of `list` state. You can't rely on a "hook library" to meet all your needs without headaches that cancel initial gains.


### Synced References

You can even keep the model nested in the original parent model since Respond's underlying state management respects references reactively.

That means the same model can exist in multiple places in state, and changes to one will be reflected in all.

Imagine that instead of `e.players`, we received `e.game` which contains players at `e.game.players`:

```js
export default (games = {}, e, { respond }) =>
  respond.addToCache(games, e.game)
```
> `/reducers/games.js`

```js
export default (players = {}, e, { respond }) => 
  respond.addToCache(players, e.game?.players)
```
> `/reducers/players.js`
```js
export default (playerList = [], e, { events }) => {
  switch (e.event) {
    case events.enterGame.done:
      return e.game.players.map(p => p.id)
  }

  return playerList
}
```
> `/reducers/playerList.js`

Now we can render players using the `playerList` of `ids`, and mutate `state.players`, while keeping up `game.players` up to date:

```js
export default {
  updatePlayer: {
    reduce: (state, e) => {
      const p = e.player
      Object.assign(state.players[p.id], p) // game.players synced
    },
    tap: ({ db }, e) => db.player.updateOne(e.player)
  }
}
```
> `/events.js`

Now the previous `ParentList` and a simpler `Game` component, which renders `game.players` directly, will both be up to date:

```js
const Game = (props, { game }) =>
  Container(
    Title(game.name),
    game.players.map(p => Title(p.name))
  )
```

Since we aren't rendering an infinite list, we can even get the rendering performance of the "connected child" pattern:

```js
const Game = (props, { game }) =>
  Container(
    Title(game.name),
    game.players.map((_, index) => Child({
      index, // index instead of id
      key: index
    }))
  )

const Child = ({ index }, { game }) => {
  const player = game.players[index]
  const { id } = player

  return Container(
    Title(player.name),
    RemoveButton({ event: events.removePlayer, arg: { id } })
  )
}
```

You may be tempted to replace the models at `game.players` with a list of `ids` to be fully "normalized", but as you can see, *updates still propagate from the `players` hash back to `game.players`.*

> This is the benefit of the Valtio-based **mutable state api** which *reacts* immutably within components.

In conclusion, you don't have to use `id` lists in Respond as much as you would in traditional state management libraries, given references are reactively synced.

You could just as easily store a *different list* of the same `model` objects.

But the "connected child" pattern offers superior performance, and for that reason, it's the recommended approach.


### `pagination` and "Infinite Lists"

Pagination and infinite lists present a new layer of problems to be solved. If you're serious about building bespoke high-end apps, it's required learning to understand infinite lists and pagination from first principles.

Far too many libraries exist to "solve" this problem, **while really serving to limit your necessary understanding of the problem space.**

You will save more time in the long run by understanding the fundamentals than forcing leaky "fetching libraries" to do what you need.

Off the top of your head, what information do you need to maintain a growing list of items (or pages of items)?

- page `index`
- page `total`
- `hasMore` selector (derived from `index` + `total`)
- each `list` containing a list of ids

So let's build it. Instead of `hasMore`, we're going to have a called `next` which contains the next `index` if available or `null` if the list doesn't *have more*:

```js
const defaultState = { index: -1, total: 0, next: null, list: [] }

export default (pagination = defaultState, e, { events }) => {
  switch (e.event) {
    case events.friends.done: {
      pagination.index = e.index
      pagination.total = e.total
      pagination.next = e.next
      pagination.list.push(...e.page.map(u => u.id)) // infinite list
      break
    }
  }

  return pagination
}
```
> `./reducers/pagination.js`

> Observe how we're deferring to the server for `index`, `total`, `next`, etc.

> When possible, go as far ***upstream*** as possible. It's best to refine your data shape at the **root** as the "single source of truth". That way you don't have to do it again and again. 


```js
export default (props, { events, pagination: p }) => {
  if (p.index === -1) return Spinner()

  return FlatList({
    data: p.list,
    renderItem: ({ item: id }) => Row({ id, key: id }),
    keyExtractor: id => id,
    ListFooterComponent: p.next ? Spinner() : null,
    onEndReached: events.friends.trigger, // same event that initially rendered screen
  })
}
```
> `./App/Friends.js`

When visiting the `navigation` event `events.friends` the list will be populated in its `.done` response:

```js
export default {
  friends: {
    pattern: '/my-friends',
    before: ({ pagination }) => pagination.next ? undefined : false, // short-circuit if no more pages
    submit: ({ db, pagination: p }) => db.user.findFriendsPaginated(p.index)
  }
}
```
> `./events.js`

Here we short-circuit by returning `false` if `pagination.next` is `null`.

And we defer to the server -- at the "top of the stream" -- to perform the only real logic of pagination, *namely incrementing an index*:

```js
export default {
  async findFriendsPaginated(index) {
    const selector = {}
    const skip = ++index
    const limit = 10

    const [friends, count] = await Promise.all([
      this.findMany(selector, { skip, limit }),
      this.count(selector)
    ])

    const total = Math.ceil(count / limit) // total pages
    const next = total > index + 1 ? index + 1 : null

    return { page: friends, index, total, next }
  }
}
```
> `./db/user.js`



Starting with `index: -1` collapses a few things and hits a few birds with one stone:

- we can show a spinner on initial load
- we can cleanly increment `++index` in a single place within `findFriendsPaginated`
- the returned `index` becomes the next state, and so on

Essentially `pagination.index` is a mini incrementing "state machine".

We've thoughtfully understood the problem so that logical concerns are only handled in a few places as far *upstream* as possible. Then at the end of the *stream*, "dumb" templating logic is all that's left.

If instead we wanted true pagination, as on a desktop website, we would only need to make these changes:


```diff
const defaultState = { index: -1, total: 0, next: null, pages: {} }

export default (pagination = defaultState, e, { events }) => {
  switch (e.event) {
+   case events.friends: {
+     pagination.index = e.index
+     break
+   }

    case events.friends.done: {
      pagination.index = e.index
      pagination.total = e.total
-     pagination.next = e.next
-     pagination.list.push(...e.page) // infinite list
+     pagination.pages[e.index] = e.page.map(u => u.id)  // basic pagination
      break
    }
  }

  return pagination
}
```

The primary changes are that we store individual `lists` as a hash, keyed by `index`; and we reduce `e.index` upfront in the **trigger** event to immediately display a `Spinner` component.

We also no longer need `next`, as the user will no longer be *automatically* moving toward the end, but can *manually* select a previous or next page:

```js
const Friends = (props, { events, pagination: p }) => {
  const event = events.friends
  const page = p.pages[p.index]

  return Container(
    page?.map(id => Row({ id, key: id })) ?? Spinner(),
    Pagination({ event, index: p.index, total: p.total, next: p.next }),
  )
}

const Pagination = (props, { events, pagination: p }) => {
  const event = events.friends

  const hasPrev = p.index > 0
  const hasNext = p.index < p.total - 1

  return Container(
    Prev({ event, arg: { index: index - 1, disabled: !hasPrev } }),
    Next({ event, arg: { index: index + 1, disabled: !hasNext } }),
  )
}
```

In the `Pagination` component we find the only remnants of our prior `next` logic. It takes the form of basic templating logic to display `Prev` / `Next` buttons (in disabled or active states).

To complete the change, `event.friends` must receive `e.index`, since it's no longer automatically always the *next* `index`:

```js
export default {
  friends: {
    pattern: '/my-friends/:index', // :index so we can refresh the page
    submit: ({ db }, e) => db.user.findFriendsPaginated(e.index)
  }
}
```

Lastly, `findFriendsPaginated` no longer needs to manage the logic of an incrementing state machine. Instead we just pass the `index` / `skip` we want to use:

```js
export default {
  async findFriendsPaginated(skip) {
    const selector = {}
    const limit = 10

    const [friends, count] = await Promise.all([
      this.findMany(selector, { skip, limit }),
      this.count(selector)
    ])

    const total = Math.ceil(count / limit) // total pages

    return { page: friends, index, total }
  }
}
```


Top of your mind might be "how many other forms can pagination / infinite lists take?"

Leaving out, "cursor" style pagination, which you can look up on Google, there really isn't that much more to the "app science" here except for abstracting this approach to support *any* infinite list, such as from different "filters" / "queries" or "sorts."

You can abstract these features into a parent hash, the same way `lists` are in `pages` hash:

```js
export default (results = {}, e) =>
  e.query // e.query presence indicates results page from server
    ? addPage(results, e)
    : results



const addPage = (results, { key, page, index, total, next }) => {
  const pages = results[key]?.pages ?? []

  pages[index] = page

  return {
    ...results,
    [key]: {  // key is ordered stringification of query
      pages,  // ...paginated results, eg: [[1,2,3,4], [5,6,7,8]]
      index,
      total,
      next
    }
  }
}
```

To get a better idea what, you're looking at, here's a concrete version:

```js
const addPage = (results, { key, page, index, total, next }) => {
  return {
    ...results,
    ["{ gender: 'male', sort: 'age', sortDirection: 'asc' }"]: { 
      pages: {
        0: ['1', '2', '3', '4'],
        1: ['5', '6', '7', '8']
      },
      index,
      total,
      next
    }
  }
```

The *key* is the hash `key` used, which bi-directionally syncs the server and the client.

The `key` is made from query parameters passed to the server. And both the client and server can generate the key deterministically. So the client can determine loading state based on whether it has something for this key, and the server can send responses possibly out of order, and they get stored in the correct place. 

The `key` could also be as simple as a page in your app:


```js
const addPage = (results, { key, page, index, total, next, meta }) => {
  return {
    ...results,
    ["/my-friends"]: {},
    ["/user/123"]: {},
    [meta.url]: {}, // etc
  }
}
```

This gives you the ability to store unlimited pages like `/user/123` in a single hash reducer, and even complex queries, as in a flight tracker, wedding ring search, etc.

> Another option is to turn `addPage` into a helper function, which you reuse across multiple similar paginated lists or modules. That way, you don't have to dig through as much nesting, either in code or in the Inspection Tools.



### `step` (ie a "state machine")

We discussed a "state machine" in reference to incrementing indexes in the `pagination` reducer -- now we're going to build a full-fledged "step" reducer for the login/signup scenario!

Let's start with the `step` reducer itself:


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

To render, we can simply key on `step` in a `Wizard` component:

```js
const LoginWizardSwitch = (props, { step }) => {
  const Component = screens[step]
  return <Component />
}

const screens = {
  1: LoginScreen,
  2: LoginCodeScreen,
  3: SignupScreen,
}
```

The `4` screen isn't needed here, as it corresponds to a different module that will be rendered in place of the *entire `LoginWizardSwitch` component*.

Next we need urls for each step, which can be considered an "effect" outside of the reduction phase. We also might have other fx. Therefore we need matching `navigation` events for each step, and of course the `submission` events:

```js
export default {
  login: {
    pattern: '/login', // step 1
  },
  submitPhone: {
    validate: ({ form }) => isValidPhone(form.phone) ? undefined : { error: 'invalid-phone' },
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
    validate: state => {
      const error = validateProfile(state)
      if (error) return { error }

      const user = createUser(state)
      return { user } // e.user optimistcally reduced into state.users
    },
    submit: ({ db }, e) => db.user.submitProfile(e.user),
  },

  complete: { // step 4
    before: ({ events }) => {
      // run fx, such as connect to realtime sockets
      return events.dashboard.view() // redirect (join.complete will not reduce)
    }
  }
}
```
> `./events/join.js`

The next thing we need is something to run these events based on those `step` integers.

A `plugin` is an appropriate solution as it can listen to *all events*. Therefore we can use it to `dispatch` the next event in *response* to a `step` change:

A naive implementation might look like this:

```js
export default {
  login: {
    pattern: '/login',
    step: 1, // add step number
  },
  submitPhone: {
    validate: ({ form }) => isValidPhone(form.phone) ? undefined : { error: 'invalid-phone' },
    tap: ({ db, form }) => db.user.submitPhone(form),
  },
  // omitted
```
> Note: only navigation events, which we will render from, receive a `step` property


```js
export default ({ events, step, curr }, e) => {
  if (e.event.namespace !== events.join) return // only run for `join` namespace
  if (curr.event.step === step)          return // step already dispatched 

  // match `event.step` to `state.step`
  const event = Object.values(events.join).find(event => event.step === step)
  return event.dispatch() // then automatically dispatch
}
```
> `/plugins/wizard.js`


But we can do one better and by using `event` functions as the actual value for `step`:


```js
export default (step, e, { events, user }) => { 
  const { join } = events

  switch (e.event) {
    case join.logout:
    case join.login:              return join.login      // event function

    case join.submitPhone:        return join.loginCode  // event function

    case join.submitCode.done: {
      return !state.user.profileComplete ? join.signup   // event function
                                         : join.complete // event function
    }

    case join.submitProfile:      return join.complete   // event function
  }
  
  return step ?? join.login
}
```
> `/reducers/step.js`


```js
export default ({ events, step, curr }, e) => {
  if (e.event.namespace !== events.join) return
  if (curr.event.step === step)          return

  return step.dispatch() // trigger event/callbacks/fx
}
```
> `/plugins/wizard.js`

Now we don't need to perform a lookup by step number. We can just `dispatch` the `step` itself. And we can eliminate the `step` property on our events.


Lastly we can hit 2 birds with one stone by the `event` name doubling as the key for our `Switch` component:


```js
const LoginWizardSwitch = (props, { step }) => {
  const Component = screens[step.name]
  return <Component />
}

const screens = {
  login: LoginScreen,
  loginCode: LoginCodeScreen,
  signup: SignupScreen,
}
```

That's the prescribed way to do wizards and state machines with Respond. There's also a built-in `wizard` plugin, which can be helpful if you want to produce multiple wizards with a uniform interface:

```js
plugins: [
  wizard({
    namespace = 'wizard',
    stepKey = 'step',
    currKey = 'curr',
    before, // before fx
    after   // after fx
  }),
  ...defaultPlugins
]
```
> `index.js`

Refer to the **Plugins** section to learn more.



## Advanced Recipes

Reducers can become non-obviously complex due to seemingly simple use cases. As well as the selectors that combine them.

In this section, we'll cover some common advanced patterns you will benefit from being aware of ahead of time.


### Animated Stacks

You should have noticed this when going from the `screen` reducer to the `stack` reducer:

- with `screen` you can just make the latest event "sticky"
- but if you wanna *remember* a history, aka "stack", you must keep track of previous (and subsequent) screens

This becomes even more complex once you want to *animate* the stack's transitions, as you need a mechanism to display 2 screens at the same time.

In this case, you don't need to change the reducer, but simply change how you select `state`.

The recipe is as follows:

- render all entries, or at least adjacent entries
- pass the unique entry as `e` to each screen

```js
export default ({ screens }, { stack, events }) => {
  const anim = useTransition(stack.index)

  return stack.entries.map((e, i) => {
    const style = interpolateEntry(anim, i) // standard anim.interpolate logic of your choosing
    const Screen = screens[e.event.name]

    return AnimatedView({ key: i }, style, Screen(e))
  })
}
```
> `./src/components/Navigator.js`


`Screen` will now have all the information it needs to render correctly, no matter the current `stack.index`.


### Multiple Simultaneous `loading` or `form` Components

If you have multiple loading indicators or forms, you may be tempted to do this:

```js
export default {
  loading: {
    drawer: (drawer, e) => ...,
    modal: (modal, e) => ...,
    form: (form, e) => ...,
  },
  form: {
    user: (user, e) => ...,
    post: (post, e) => ...,
    video: (video, e) => ...,
  },
}
```

But unless they are showing at the same time or have drastically different requirements, you can reuse the same `loading` or `form` reducers. 

As you saw above, `loading` state can be tagged to individual events for targeting different placeholders that you would like to show a `Spinner` component.

And a single a `form` reducer can be used for all steps/screens in a wizard, as well as different models.

When that doesn't suffice, using multiple modules can at least save you from having to come up with annoying names like `loadingDrawer` or `formWhatever`. 

Additionally, you can import the same `loading` component into multiple modules, while keeping the same simple name.

The thing to keep in mind is whether there is a reason to *remember* another form or loading state.

The animated navigator example from above is a case where multiple forms would be useful for remembering (though for only 500 milliseconds).

Unfortunately, whenever you have animations, complexity is multiplied by another dimension unexpectedly. Not just for `StackNavigators`.

If you have a form simply fade out on submission, you have the problem that you don't want its values to be abruptly cleared.

For this seemingly simple case, you can remember the previous state of a form using component level tools:

```js
const FormContainer = (props, { form, step, events, prevState }) => {
  const submittedForm = step === events.lastStep
  const reference = submittedForm ? prevState.form : form

  return useMemo(() => Form(), [reference])
}
```
> Respond maintains `prevState` for you, so you always have the previous state before the most recent trigger event.

Here `Form` will render as expected until the last step of a wizard, in which case, the memoized element will continue to display.

You can do this a number of ways that don't require additional `form` reducers. It's silly to have to create additional reducers just for temporary animation states that only display for a few milliseconds. This is how you handle it.



### Combining Multiple Reducer Patterns

Say your users can browser profiles, for example `video` profiles. On each profile, you want infinite lists of some related entity type: 

- `relatedVideos`
- `comments`
- etc

Your first option is to use a nested `pagination` reducer that combines results from different screens, as described above.

But this becomes cumbersome once you want to `push` and `pop` from multiple lists *and models*, which each have different requirements.

You might also enjoy being able to access a list whenver you have a `video` model: 

- `video.relatedIds`
- `video.commentIds`

The solution is to reduce the `list` **where the model is**, namely its `cache` reducer, while breaking out the `pagination` into a separate *generic* reducer that just handles `index`, `total` and `next`:

```js
export default (videos = {}, e, state) => {
  addToCache(videos, e.video, e.videos) 

  const { events, video } = state

  switch (e.event) {
    case events.relatedVideos.done: {
      const next = e.videos.map(c => c.id)
      video.relatedIds = video.relatedIds ? [...video.relatedIds, ...next] : next
      break
    }

    case events.comments.done: {
      const next = e.comments.map(c => c.id)
      video.commentIds = video.commentIds ? [...video.commentIds, ...next] : next
      break
    }

    case events.addComment: {
      video.commentIds.unshift(e.id) // add to top of list
      break
    }
  }

  return videos
}
```
> `/reducers/videos.js`

```js
export default {
  get video() {
    return this.videos[this.videoId] // you will learn about "selectors" in the next section
  }
}
```
> `/selectors.js`


```js
export default (pagination = {}, e, { events, screen }) => {
  const { name } = screen.event

  switch (e.event) {
    case events.comments:
    case events.relatedVideos: {
      pagination[name] ??= { index: -1, total: 0, next: null }
      break
    }

    case events.comments.done:
    case events.relatedVideos.done: {
      pagination[name].index = e.index
      pagination[name].total = e.total
      pagination[name].next = e.next
      break
    }
  }
}
```
- `/reducers/pagination.js`


Then in components we can grab the correct `pagination` for the current `screen`, and then grab the `ids` from where it logically belongs within each `video` of the `videos` hash:

```js
const VideoProfile = (props, { screen, pagination, video }) => {
  const { index, total, next } = pagination[screen.event.name]

  return Container(
    Title(video.title),
    Player({ src: video.src }),
    Bottom(
      Column(
        video.relatedIds.map(id => RelatedVideo({ id, key: id })),
        LoadMore({ event: events.relatedVideos })
      ),
      Column(
        video.commentIds.map(id => Comment({ id, key: id })),
        AddComment({ event: events.addComment }),
        LoadMore({ event: events.comments })
      )
    )
  )
}
```


The key thing to take note of is that our models don't have `video.commentIds`. 

Rather, `comments` have `comment.videoId`, creating a one-to-many relationship between each `video` and its `comments`. However, there is no access to comments without a separate query.

We can think of `video.commentIds` therefore as a "virtual" property that only exists on the client *once we populate it*.

Let's create the necessary table method and events to populate it:

```js
export default {
  async findManyPaginated(videoId, index) {
    const selector = { videoId }
    const skip = ++index
    const limit = 10

    const [comments, count] = await Promise.all([
      this.findMany(selector, { skip, limit }), // updatedAt is default sort
      this.count(selector)
    ])

    const total = Math.ceil(count / limit) // total pages
    const next = total > index + 1 ? index + 1 : null

    return { comments, index, total, next }
  }
}
```
> `./db/comments.js`


```js
export default {
  comments: {
    fetch: ({ db, videoId, pagination, screen }) => {
      const { index } = pagination[screen.event.name]
      return db.comments.findManyPaginated(videoId, index)
    }
  },
  video: {
    pattern: '/video/:id',
    optimistic: ({ events }, e) => e.meta.cached ? undefined : events.comments(),
    fetch: ({ db }, e) => db.video.findOne(e.id)
  }
}
```
> `/events/video.js`


When you visit a `video` profile, `events.comments` will make the first request of the infinite list in parallel using the built-in `optimistic` callback.

> But only the first time. If it's cached (on a subsequent visit), it won't be called.

`events.comments` can then be called repeatedly until the list is exhausted, while the `videos` reducer will cache the individual videos. 

The `pagination` reducer can now manage *paging* in a generic way that can be used by other models.

For completeness, here's the sticky `videoId` reducer that informs reducers/events of the current `video` model:

```js
export default (videoId = '', e) => e.videoId ?? videoId
```
> `/reducers/videoId.js`

We didn't cover `relatedIds`, but it's similar to `commentIds`, with the exception that we aren't adding more to the array.

This approach really starts to shine once we start adding other models like `user`, `post`, etc, which have their own infinite lists.

Every model can share the same generic `pagination` reducer, while not concerning itself with the actual `list`.

Then you can perform custom optimistic mutations for each model in their respective `cache` reducers.

As always don't prematurely optimize, but instead just focus on one model at a time. If, after your app evolves, you find recurring patterns, you can abstract them into more generic solutions like the nested `pagination` reducer.

> If this is your first Respond app, start with a *non-nested* `pagination` reducer to get the hang of it first. And that goes for any toolset you might be using.

This should serve as a good starting point for combining reduction patterns for more complicated use cases when you get there.

You will find that using the basic reducer recipes herein *combined with Respond Modules* gets you a long way, particularly in saving you from having to make duplicate "boilerplate" reducers that all do the same thing.