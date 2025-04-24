# Testing

Respond's testing functionality piggybacks on its powerful Replay Tools.

Tests are just arrays of user-triggered events from your actual application.

The *user-triggered* `events` you see in the Replay Tools UI will be what save to your test files, along with the current `settings`.

Tests are automatically generated for you from this array. When you tap "SAVE TEST" on the Events tab, a test like this is what will be generated for you:


## Test

```js
import { setupTest } from 'respond-framework/testing'

const settings = {}

const events = [
  {
    "index": 0,
    "type": "guest.login"
  },
  {
    "index": 2,
    "type": "guest.edit",
    "arg": {
      "email": "james@faceyspacey.com"
    }
  }
]

const t = setupTest({ settings })

test(`0. guest.login`, async () => {
  await t.snap(events[0])
})

test(`1. guest.edit`, async () => {
  await t.snap(events[1])
})
```

Tests start by calling `const t = setupTest(settings)` and then calling `t.snap` within a `test` for each event.

The `t` object allows you to log and perform custom asserts, with the following tools available:

- `t.state`, (root `state` of your app)
- `t.respond` (short for `t.state.respond`)
- `t.renderer`
- `t.snap(event)`
- `t.dispatch(event)`
- `t.trigger(event)`
- `t.replayEventsToIndex(events, index)`

Calls to `t.snap` are generated for each test and calls `e.trigger()` + snapshots the result.

Snapshots will appear in the `.js.snap` file adjacent to the test just like in standard Jest tests.

On `t.renderer` you can call `t.renderer.toJSON()` to get the current state of the renderer.

`dispatch` and `trigger` are the same as in your app, and `replayEventsToIndex` is a helper to replay events to a specific index:

```js
t.replayEventsToIndex = async (events, index, startIndex = 0) => {
  for (let i = startIndex; i <= index; i++) {
    const e = events[i]
    await t.trigger(e)
  }
}
```


## Snapshot Settings

In `/config/config.tests.js`, you can specify the following settings:

```js
export default {
  snapComponents: true,
  snapComponentsDiff: false, // snap component diffs (between current and previous transition)
  snapState: false,
  snapStateDiff: false, // snap state diffs (between current and previous transition)

  ensureTrigger: false, // ensure event is on the page
  
  logComponents: false, // logging
  logComponentsDiff: false,

  logState: false,
  logStateDiff: false,

  ignoredEvents: [
    'admin.someGesture',
  ],

  ignoredWidgets: [
    'Foo.js',
  ],

  dimensions: {
    height: 840,
    width: 1200,
  }
}
> `/config/config.tests.js`

```

You can configure the snapshotter to also snap `state` and *diffs* between the current event and the previous.

You can `ensureTrigger` which ensures that the trigger lives on the page somewhere. This "seals" the test/event by verifying that event handlers like `onPress` have what they need.

> The assumption is that the widgets that trigger events are working and tested in isolation.

You can also ignore events or ignore mocking widgets. Mocking will be covered in the next section.



## Mocking

In order to keep your `.snap` files tidy and you focused on testing what matters, Respond makes extensive use of mocking.

Respond by default mocks the `/widgets` and `/icons` directories, where you will have basic near-pure presentation components.

So that means components will appear "shallow" in your test files:

```js
<Chevron
  color="rgb(255, 255, 255)"
  size={10}
/>
```

In other words, children are not rendered, just the `props` of the mocked component.

> If you don't want something mocked, put it in `/components` or `/App`. 

This makes it so when comparing snapshot diffs in failed tests you can focus on the core state transformations and whether the expected values were passed to your widgets. Eg:

```diff
<Chevron
  color="rgb(255, 255, 255)"
-  size={10}
+  size={9}
/>
```

Respond also mocks `event` functions so they just appear as their "branch" path:

```js
<Chevron
  color="rgb(255, 255, 255)"
  size={10}
  event="admin.post.create" // relative to root module under test
/>
```


**Can I use `state` in widget tests?**

The decision is yours. By default Respond's babel and SWC plugins apply to the `widgets` folder, but you can disable it if you want.

There are cases where elements from `state` are so basic that there's not much to worry about. For example: if you just use an `event` within a widget.

You can also use regular React `state`. And when you want to be extremely certain all is well, you will want to write manual tests for these widgets.

But, again, for basic use cases, such as just animating a widget in and out, it's perfectly ok to leave them mocked in the early stages of your app.


### Editing Widgets

If you edit one of these *widgets*, the workflow is to search for its name on the Tests tab of the Replay Tools, and replay the given tests that incorporate them.

Most of the time, the change will be small and you can verify it visually in a single place. 

The idea is that if you're going to change a visual component/widget, **there's no way around checking it everywhere to be sure**.

In short, there's very little gained from snapping non-interactive visual components, without using image snapping. 

> If it's that important, use image snapping tools. You can use the same events arrays as the basis for these tests as well, but *for now* you will need to use a different workflow that renders to the DOM.

> Note: Respond's testing is super fast because no DOM is used.


### Globals

The default workflow is to mock a bunch of globals along with your widgets. In your `setAfterEnv.js` file provided to Jest, all you will see is:

```js
import { mockTests } from 'respond-framework/testing'

mockTests()
```

`mockTests` performs the following:

```js
import { mockGlobals , mockEvents , mockDirectory } from 'respond-framework/testing/testing'

export default () => {
  mockGlobals()
  mockEvents()
  
  mockDirectory('icons')
  mockDirectory('widgets', 'ignoredWidgets')
}
```

`mockGlobals` performs the following:

```js
export default (opts = {}) => {
  global.window = {
    location: {
      search: '',
      protocol: 'http:',
      host: 'localhost:3000'
    },
    history: {
      replaceState() {},
      pushState() {},
    },
    Image: class Image {},
    navigator: {
      userAgent: ''
    },
    prefetchImage: jest.fn(),
    document: {},
    alert: jest.fn(),
    prompt: jest.fn(),
    confirm: jest.fn()
  }
  
  Object.assign(global, global.window)

  const mockMath = Object.create(global.Math)
  mockMath.random = () => 0.5
  global.Math = mockMath

  const today = new Date(opts.date ?? '2023-07-04T12:00:00.000Z')

  jest
    .useFakeTimers()
    .setSystemTime(today)
}
```

You can customize by writing your own.

The overall idea is that your app needs to run as if the browser or native environment doesn't exist. Instead it repeatedly renders deterministic templates.


## Snapping State

You may be tempted to snap `state`, and it's available if you truly need. But the true result is the resulting component tree.

Because you're going to be creating a lot of these tests -- and because of its nature there will be lots of duplicate things snapped -- your key concern is maintaining a minimal *cognitive load* for yourself.

Your workflow will be viewing Jest or Wallaby diffs for failling tests, which means the less unecessary things you have to look at, the better.

The resulting useful state will find its way to the component tree, so you can think of the component tree as *state itself*.

If you are running into problems and want to check the underlying state, that's when you enable the `snapState` and `snapStateDiff` options.

You can also do it just for an individual file:

```js
setupTest(settings, { snapState: true })
```

or for an individual test:

```js
test(`0. guest.login`, async () => {
  await t.snap(events[0], { snapState: true })
})
```

That's a better use case for occasionally snapping state. You may also just choose to log it with the `logState` and `logStateDiff`.


## Deterministic IDs

For Respond's fullstack determinism to come together, various counters and `id`s must be mocked both in tests *and in your app*.

For this reason, your tests rely on a determinism engine outside of Jest.

Respond keeps track of a single core counter, which becomes the seed for generating IDs as well as plain numbers:

```js
import { ObjectId } from 'bson'
import { isDev } from '../helpers/constants.js'


export const createCounterRef = seed => {
  ref.value = seed?.__counterRef.value ?? 0
  return ref
}

const ref = { value: 0 }



const genNumber = () => ref.value++

const genId = () => ('id' + ref.value++).padEnd(24, '0') 

// rest omitted
```


The value of the `ref.value` counter will be reset for each test, and database row IDs will be generated like this: `id0000000000000000000000`.

The counter will also maintain its state when refreshing the browser while working, so that you can continue from where you left off.

There's a few other elements to Respond's *determinism*, but this should should be enough to feel comfortable relying on it.