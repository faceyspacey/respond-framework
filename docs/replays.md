# Replays

By finally uncovering the key to true full app determinism, Respond has unlocked the promise land of app development we have all been waiting for.

The key is to filter just *user-triggered* events, while never calling `setState` in response to `onPress`, `onChange`, etc.

Compartmentalized components could never achieve this. We need identifiers for events *known outside the component tree*.

But once we have this, app development becomes 100% declarative, top to bottom. 

Replays are where this all comes together. 


## Overview

Respond allows you to replay to any event with unnoticeable millisecond immediacy. Respond allows you to specify initial module "settings" so you don't have to repeat steps. For instance, you can have a given user from seed already logged in.

These settings combined with a few initial events in an array put you right where you want to work whenever you need to be there.

They're saveable. They're always recording. When you refresh the page, you're right back where you were. If you edit any portion of code (whether on the client or server), HMR factors in the updates.

HMR can replay just the most recent event or replay the entire array, recalculating the result of your changes across a multi-step flow.

> That means any database calls along the way will be replayed as well, perhaps resulting in a totally different result.

Your events double as tests, and you can clone a test just by adding new events and saving it with a different name.

You can tap the "splice mode" button and insert events anywhere in the array, or delete events. You can skip events or re-order them. And all fx and db calls replay. **This isn't your grandfather's "time travel debugger".**

The power is immense and it must be experienced to be believed.


## Replay Tools UI

The Replay Tools are a UI widget a little thinner than a phone in portrait mode that exists in any corner of the screen that you designate.

There are 3 tabs: 

- Events
- Settings
- Tests

And an expandable state browser reminiscent of the Redux DevTools. It's called the "Inspection Tools".

This is your driver seat and where you steer your entire development experience. 

When starting a new app, you will have no events yet to trigger. Which is why Respond recommends you start out with one of our templates so you have something you can replay from the start.


## Events

Events is a recording of any event triggered by `event.trigger()`, i.e. not "response events" dispatched by callbacks (which use `event.dispatch()` in the plugin that powers them).

You can move back and forth in the timeline by clicking the event rows.

You can skip events by tapping the "SKIP" hover button, or delete them via the delete button.

You can tap "CLEAR" to clear all events except the first one.

In the top right is the "Splice Mode" button which looks like a record button when clicked. Tap it so new events occur right after the current event.

In standard mode, new events will behave like the browser's history stack and clip the tail.

Events become "purple" when divering from events in a current test, so you can know which events are new and which are old.

There's also drag-n-drop so you can move them around however you want.


## Tests

When you want to make a test, just tap SAVE TEST and it will save your events to the current module's `__tests__` folder, along with any settings configured on the "Settings" tab.

You can then navigate to the "Tests" tab and find it again. 

Here you can browse tests by module, and sort by name or recent. 

You can also search for tests by the names of components snapshotted in their corresponding `.js.snap` files.

> This is a key workflow for quickly verifying mocked "widget" components display correctly in all cases.

Tests work by executing each event, and then taking a snapshot of the resulting components using `react-test-renderer`.

Hovering over each test produces 4 buttons:

- START (go to 1st event)
- RUN (run test in terminal - Mac only)
- OPEN (open test file)
- END (go to last event)

The actual Jest tests and mocking are covered in depth in the [Testing](./testing.md) section.


## Settings

Settings is actually where you test and replay begins.

Example:

You want to always be logged in as a particular user for a given feature you're working on.

To do this, you will specify a `userId` in `config.replays.js` that you can select from seed:

```js
import * as seed from '../seed/index.js'

export default {
  userId: {
    options: [
      { label: 'none', value: undefined },
      ...seed.user.map(v => ({ label: v.name, value: v.id }))
    ],
  },
}
```
>  `/config/config.replays.js`

Now when you tap "RELOAD" at the bottom of the Settings tab, Respond will automatically load the given `userId` and `token` into state.

> The user of course will have to exist in your seed

You will be responsible for ensuring that the first event returns the actual model, as there are a number of ways you can do that.

The simplest way is to create a `you` reducer that grabs the user from the seed:

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
> `/reducers/you.js`

As that will only work while developing, you will need to retreive the user from the server when you're ready.

> Look into the `initialData` plugin in the [Plugins](./plugins.md) section for how to do that.

From there, you can navigate the app as the given user, and work on features in a member area or private dashboard.

You can add as many replay settings as you want and they will appear in the UI.

If you're app revolves around a given model, such as a `video`. You can create another setting called `videoId`, and not have to set that up either.

If the user has various modes like `user.pro`, you can make that toggleable via a radio switch:

```js
pro: {
  boolean: true,
},
```

You can provide inputs for text-based settings:

```js
listCount: {
  placeholder: 'listCount: 10',
  defaultValueDevelopment: 1,
  defaultValueProduction: 10,
  format: v => parseInt(v?.toString().replace(/\D+/g, ''))
},
```

And as you see, you can parse strings into numbers too.

You can also specify JSON to handle an object for a single key all at once:

```js
paymentSettings: {
  placeholder: 'settings: { "subscription": true }',
  json: true,
},
```

You can make settings dependent on other settings (so they don't display under certain conditions):

```js
paymentSettings: {
  placeholder: 'settings: { "subscription": true }',
  json: true,
  available: settings => settings.pro
},
```


## Seed Data

In the `replays` config object assigned to your module, you pass a `createSeed` function that will be called on reload and replays.

In it, you take your seed data -- which is just standard javascript or json -- and insert the necessary data into your tables.

You will have available to you the selected settings from the UI (or from test) to make determinations of what rows to insert and what values to assign to them.

For convenience, you can also assign it to the `db` object created by `createDatabase`:


```js
import config from './config/config.replays.js'
import createSeed from './seed/createSeed.js'

export default {
  replays: {
    config,
    createSeed
  }
}
```

When starting out, you can also just pass your seed data directly:

```js
import config from './config/config.replays.js'
import * as seed from './seed/index.js'

export default {
  replays: {
    config,
    seed
  }
}
```

Seed will be a hash of tables, each with an array of rows or  an object keyed by `id`:

```js
const seed = {
  user: [
    { id: '1', name: 'Dan' }
    { id: '2', name: 'James' }
  ],
  post: [
    { id: '1', title: 'React' }
    { id: '2', title: 'Respond' }
  ]
}
```

In this case, the entire seed will always be added, regardless of whether it's used. Don't worry too much about performance yet. 

> You will see that a lot of data can be added without problem.

Your first concern will be applying settings in `createSeed`:

```js
import * as seed from './seed/index.js'

export default (settings, options, db) => {
  if (settings.pro) {
    Object.values(seed.user).forEach(user => {
      user.pro = true
    })
  }

  db.tableNames.forEach(k => {
    db[k].insertSeed(seed[k])
  })
}
```
> `/seed/createSeed.js`

As you can see, we applied the `settings` from the Settings UI to our users.

You won't always be applying setting values to users exactly like that. This is just a simple example.

You can and will operate on other tables/rows as well, depending on your needs, and where you want the app to arrive to after reload or start of a test.

The last line calls `insertSeed` for each table, which is the default behavior if you simply assign `replays.seed`.

Lastly, you can use your `settings` not just when the seed is created, but anywhere in your app, as we did with the `you` reducer. But the key is to do something different in production vs development.

For simple values, this can be handled via the `defaultValueProduction` as shown above, but for complex behavior, you do it directly in code:

```js
import config from '../config.js'

export default {
  findUser() {
    if (config.isProd) return this.findCurrentUser()

    const { userId } = replays.settings
    return replays.db.user[userId]
  }
}
```
> `/tables/user.js`

This may violate what you've learned about mocking, but it's required for development to deterministically behave the same as tests.

You will to think similar to the benefits of the "functional core, imperative shell" where most of your app is automatically secured by pure functions -- or in this case not using replay settings -- and the few places that do use settings require a production-only test to fully secure it. 

In practice, you will trust that it works until you're hopefully making some money from your app that it's truly worth writing these few manual tests.



## Conclusion

Don't get Respond's Replay Tools be confused with other "time machine" tools that will go unnamed.

They can't be relied on because they aren't full stack and the database will get out of sync. 

They don't replay the fx of data fetching and submission. Rather they just take you to a previous state without replaying fx. So you have no idea whether the most important and problematic part (asyncronous work) is behaving correctly.

The dawn of a new era is upon us. Now things in the app development world will finally become standardized and uniform, as there's less "correct" ways to do things.

The primary patterns are outlined herein.

With module composition & separation of concerns, each aspect -- paricularly components -- become a builing block simple enough for AI to generate at quality.

AI can finally generate high quality code for large apps because of Respond's fullstack replays.
