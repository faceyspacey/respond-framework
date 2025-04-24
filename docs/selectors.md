## Selectors

Also known as "computed" or "derived" state, *selectors* in Respond are helper functions that help you create a reusable logical interface to the common bits of state.

Typically you will use a selector to combine 2 pieces of reducer state into a single entity you plan to frequently use like `state.user` or `state.you`:


```js
export default function() {
  const { users, userId } = this
  return users[userId]
}
```
> /selectors/you.js


```js
import selectors from './selectors.js'

export default {
  reducers,
  selectors,
  etc
}
```
> /index.module.js


Usage:

```js
const MyComponent = (props, { you }) =>
  User({
    fullname: you.fullname,
    avatar: you.avatar,
  })
```

Respond will transform zero-argument selectors into getters.

For small modules, you can define them directly as getters on the module:

```js
export default {
  get you() {
    const { users, userId } = this
    return users[userId]
  },
}
```
> /index.module.js


Selectors can receive arguments:
 

```js
export default {
  findSomethingCondtionally(id) {
    return this.flag ? this.users[id] : this.otherUsers[id]
  },
}
```
> /index.module.js


Selectors can call other selectors:

```js
export default {
  findSomethingCondtionally(arg) {
    return arg ? this.you : this.me
  },
}
```


Selectors are available wherever `state` is:

- reducers
- components
- event callbacks
- other selectors


Because of the Valtio-based reactivity system, memoization plays no role in Respond selectors. 

The key benefit to selectors is high performance rendering because they *select* stable object references from reducers.



## Built-in Selectors

Respond comes with several built-in selectors. They are available by default on each module.

You can disable them by setting their respective keys to `null` or override them.


### `curr`

The `curr` selector selects state from the built-in `stack` reducer:

```js
export default function() {
  const { entries, index } = this.stack
  return entries[index]
}
```

The `stack` reducer is an array of `navigation` events. View the [Reducers](./reducers.md) section for more information.

The `curr` selector combines the `entries` and `index` from the `stack` reducer to reliably provide the most recent `navigation` event.

It's therefore an `e` object, containing a reference to the static event at `e.event`, and any additional data on `e` such as `e.arg`, `e.payload`, or anything merged from `arg` or `payload` like `e.id`.

You can use it to render a page. For example, here's a `Post` component from your blog:

```js
const Post = (props, { curr, posts, userId }) => {
  const post = posts[curr.id] // <-- curr.id is really e.id
  const { title, content } = post

  const visible = post.canEdit(userId) // model method, which is just a selector attached to a model

  return Container(
    Title(title),
    Body(content),
    EditButton({ visible })
  )
}
```

Here we're using the `curr` selector and the `id` of the navigation event it contains to further select which post to display.

If you had a simple site that only has posts, you might also make `post` a selector using the `curr` selector:

```js
get post() {
  const { posts } = this
  return posts[this.curr.id]
}
```

This shows how selectors in combination with "sticky reducers" like `stack` and `posts` can be combined to render a page.

This is the essence of selectors. If you find yourself making the same "selection" in components often, that's a perfect candidate for a selector.


### `token` + `userId`

An application can have many modules, but only one user.

Therefore, it's unnecessary to have `token` + `userId` reducers in each module.

Respond passes down the `token` and `userId` from the top module as selectors in all child modules.

In rare cases -- such as when importing a 3rd party module -- they can override this behavior. But starting out, it's nice to know that you will always have both a `token` + `userId` available.

Here's how they work:

```js
export function token(token = '', e) {
  return typeof e.token === 'string' ? e.token : token
}

export function userId(userId = '', e) {
  return typeof e.userId === 'string' ? e.userId : userId
}
```
> built-in `./reducers/auth.js`


```js
import { _parent } from '../reserved.js'


export function token() {
  return this[_parent].token
}

export function userId() {
  return this[_parent].userId
}
```
> built-in `./selectors/auth.js`


Most commonly you will use `userId` in combination with a `users` cache reducer to produce a `user` object:

```js
export default function() {
  const { users, userId } = this
  return users[userId]
}
```
> /selectors/you.js


Some code has been omitted in the `token` reducer to get the `token` from replay settings, as well as cookies in production, but this should give you a good idea of how to use the corresponding selectors.


## When to use props vs selectors?

If you had a `StackNavigator` component with animated transitions, you would do it like this:

```js
const Post = (props, { posts }) => {
  const { title, content } = posts[props.id] // <-- prop used instead of a selector

  return Container(
    Title(title),
    Body(content),
  )
}
```

In this case, we are no longer using the `curr` selector because animated Navigators must show more than one entry at the same time:

```js
export default ({ screens }, { stack, events }) => {
  const anim = useTransition(stack.index)

  return stack.entries.map((e, i) => {
    const style = interpolateEntry(anim, i)
    const Screen = screens[e.event.name]

    return AnimatedView({ key: i }, style, Screen(e)) // <-- props.id comes from e.id
  })
}
```
> `./src/components/Navigator.js`

Instead, we're relying just on the underlying `stack` reducer to pass the `id` as a prop.

This should give you a good idea of when to use `selectors` and when to use `props`. For more information, check Respond's [Naivagator](./components/Navigator.md) component.


## Selector-Powered Abstractions

Sometimes, you may perform similar logic for multiple models, as in an admin panel.

You can use selectors to create a uniform interface, regardless of what model the user is focused on: 


```js
export default {
  get domain() {
    return this[this.table]
  }

  get query() {
    return this.domain.query
  }

  get form() {
    return this.domain.form
  }

  get model() {
    const { models, id } = this.domain // eg: this.post
    return models[id]                  // eg: this.post.models[id]
  }
}
```
> `/selectors.js`

```js
export default (table = 'user', e, { kinds }) =>
  e.kind === kinds.navigation ? e.event.namespace.name : table
```
> `/reducers/table.js`


Here we're reducing the name of a `table` based on the `namespace` of `navigation` events. 

Then in our selectors, we reuse the `domain` selector to create more relevant selectors:

- `query`
- `form`
- `model`

Then anywhere in the module, we can get the relevant `query`, `form` or `model` *without having to know what table is focused*.


Each `domain`, aka "table", is powered by a reducer like the following:

```js
export default (city = {}, e, state) => {
  if (e.event.namespace !== state.events.city) return city

  city.id = e.id ?? city.id
  
  city.models = addToCache(city.models, e.city, e.citys)
  city.form = form(city.form, e, state, state.events.city) // reusable reducer helpers (omitted)
  city.query = query(city.query, e, state.events.city)
  city.results = results(city.results, e, state)

  return city
}
```
> `/reducers/city.js` (but could be `user`, `post`, etc)


We could take this further by abstracting pagination the same way:

```js
export default {
  get result() {
    const { results, key } = this.domain
    return results?.[key]
  }

  get index() {
    return this.result?.index ?? 0
  }

  get total() {
    return this.result?.total ?? 0
  }

  get page() {
    return this.result?.pages[this.index] ?? []
  }
}
```

Above in the `city` reducer you saw generic reusable helper reducers. Here is the `results` helper, which does exactly what you already saw in the "nested pagination" reducer in the [Reducers](./reducers.md) section:

```js
export default (results = {}, e, state) =>
  e.query // e.query presence indicates results page from server
    ? addPage(results, e, state)
    : results



const addPage = (results, { key, page, index, total, count, next }, { domain }) => {
  const pages = results[key]?.pages ?? []

  pages[index] = page // eg ids: ['1','2','3','4']
  domain.key = key    // key is ordered stringification of query

  return {
    ...results,
    [key]: {  // each query saves its own...
      pages,  // ...paginated results, eg: [['1','2','3','4'], ['5','6','7','8']]
      index,  // eg 1
      total,  // total pages
    }
  }
}
```

We're using the `key` returned from the server to maintain a reference to the query, and the `index` to maintain the current page.

We also assign to `state.domain`, which will be `state.city`, `state.post`, etc. We aren't dogmatic about mutating another reducer such as `domain`, as we are confident in the determinism of the overall reducer.

Now, all aspects of our admin panel can be abstracted away with short named selectors:

- `index`
- `total`
- `page`

And we can render a page of results like this:

```js
const AdminPanel = (props, { table, index, total, page }) =>
  Container(
    Title(`Table: ${table}`),
    List(page?.map(id => Row({ id, key: id }))),
    Pagination({ index, total })
  )
```

By now the role of selectors should be clear: they help you "de-normalize" state by combining it for components to consume. Event callbacks, reducers and other selectors also benefit from the uniform interface.

Selectors provide high performance rendering. They preserve the stable object references of raw reducer state, so that React can skip unnecessary re-renders.

This is especially important in Respond, where components are memoized by default. It's now time to take a look at components in more detail.