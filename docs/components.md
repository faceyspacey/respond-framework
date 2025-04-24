# Components

In Respond, components receive a second argument for `state`.

```js
const MyComponent = (props, state) => ...
```

You don't need to call a hook to retreive it. It contains the isolated `state` of the given module. Components are memoized by default.

Otherwise components behave the same as they do in React.


## Component Functions (not "Functional Components")

Respond supports direct component calling instead of JSX:

```js
Pressable({ event })
```

instead of:

```js
<Pressable event={event} />
```

This is more convenient than having to call `createElement`:

```js
React.createElement(Pressable, { event })
```

Respond isn't the only one doing this. Check out VanJS for another example.

You can think of this interface as "render-optimized component functions" or "render-aware component functions" or ***"component functions"*** for short.

There's also a JSX babel/swc plugin for legacy components.

You can use both in a single project, and bring along legacy functional components.


## Babel Plugin Configuration

To enable double arg component functions, add the following plugin if you're using babel:

```js
module.exports = function(api) {
  api.cache(true)

  return {
    presets: [
      [
        '@babel/preset-env', {
          targets: 'last 2 Chrome versions'
        }
      ],
    ],
    plugins: [
      [
        './src/babel/babel-plugin-respond.js', {
          directories: ['App', 'components', 'widgets', 'icons'], // default
        }
      ],
    ]
  }
}
```

Displayed are the default directories parsed, but you can customize it how you need.



## `box-model`

Respond is intended to be paired with the `box-model` package, which makes styling a breeze, while also making use of component functions:

```js
import box from 'box-model'

export default (props, state) => {
  const { title } = state.curr

  return Container(
    Title(title)
    Body({ color: 'white' }, title)
  )
}

const Container = box({
  backgroundColor: 'pink',
})

const Title = box({
  fontSize: 24,
  color: 'white',
})

const Body = box.flip({ // <-- flip mode!
  fontSize: 18,
})
```

As you can see, components created with `box` are also just functions.

> The intention in covering `box-model` within the components section is to get you in the mindset that Respond is essentially pure functions (or near pure deterministic functions) all the way down.

Layout components created with `box` have a variadic signature, which allows for a `style` arg instead of `props` as the first argument in "flip mode." Otherwise, the signature is typically `(props, style, ...children)` or `(props, ...children)`. 

Here's the complete set of signatures:

```js 
Title(props, style, ...children)
Title(props, ...children)
Title(...children)

// flip mode:
Body(style, props, ...children)
Body(style, ...children)
Body(...children)
```

You can also "flip" at time of render: `Body.flip(props, { color: 'white' }, title)` .
> Here we're obviously flipping back to props-first.

`box-model` under the hood uses React Native components and styling, including `react-native-svg` components (for both native and web).

By default, it will infer whether the component should be `View` or `Text` based on its first child.

That way you can worry less about what component/element you're using, and focus just on the styling.

> Everything *is just a "box"*.

But you can also use the box styling interface with custom components:

```js
const Pressable = box({
  type: 'Pressable', // react-native component
  backgroundColor: 'black',
})
```

> All React Native components are supported in string form, without having to import them.

You can also pass in any custom component that accepts a `style` prop:


```js
import { Text } from 'react-native'

const MyComponent = ({ style }) => Text({ style })

const Title = box({
  type: MyComponent,
  fontSize: 24,
})
```


### `Box` (inline helper)

When you're not ready to specify static styles, you can use `Box` inline:

```js
import { Box } from 'box-model'
Box({ width: size, height: size }, ...children)
```

Styles come first, as that's its primary purpose, but you can also flip it:

```js
import { Box } from 'box-model'
Box.flip(props, { width: size, height: size }, ...children)
```

Not having to predefine components is great for prototyping, as everything *is just a `Box`*.



### Additional Features:

`box` can `extend`:


```js
const Subtitle = box({
  extend: Title
  fontSize: 20,
})
```

```js
const Subtitle = box({
  extend: [Title, Foo], // multiple inheritance supported
  fontSize: 20,
})
```


`box` has `variants`:

```js
const Column = box({
  height: '100%',
  width: 900,
  variants: {
    thin: {
      width: 200,
      borderWidth: 1,
    }
  }
})
```
```js
const thin = true
Column({ thin })
```

When using `extend`, variants are deep merged by default. But you can specify `deep: false` to choose shallow merging instead:

```js
const FatColumn = box({
  extend: [Column],
  width: 1200,
  deep: false, // <-- shallow merge variants
  variants: {
    thin: {
      width: 300,
      // borderWidth won't be 1
    }
  }
})
```


`box` supports fully `dynamic` props-based style functions:

```js
const Column = box({
  height: '100%',
  width: 900,
  dynamic: props => props.fat ? { width: 600 } : undefined,
})
```

You can also supply static `props` so you have less presentation code in render:

```js
const Title = box({
  props: {
    numberOfLines: 1
  }
})
```

Like variants, `props` will also be merged when using `extend`.


### `box.textView`

You no longer have to double nest 2 components just to display some text.

`box` offers a combined `textView` component, which renders as a `Text` component within a `View` component:

```js
const TabComponent = ({ event, text, disabled }) => {
  return Tab({ event, disabled }, text)
}

const Tab = box.textView({ // View style
  type: 'Pressable',
  flex: 1,
  paddingVertical: 10,
  variants: {
    disabled: {
      backgroundColor: 'grey',
    },
  }
}, { // Text style
  fontSize: 15,
  textAlign: 'center',
  color: colors.whiteDark,
  variants: {
    disabled: {
      color: 'white'
    }
  }
})
```
> If you have only used React on *web without React Native*, you're accustomed to rendering text as a single component, such as a `<span>`, `<h1>`, etc. In React Native -- without `box.textView` -- you must render text as a `Text` component within a `View` component. That's the problem `box.textView` solves.


`box.textView` takes 2 arguments: 

- `View`'s styles
- `Text`'s styles

`props` are shared between both the `View` and `Text` components. As you can see, `props.disabled` styles both.

Additionally, if using a custom component like `Pressable` -- which also accepts `props.disabled` -- the prop is shared there too, collapsing 3 tasks into a single prop.


Supported signatures:

```js
Tab(viewProps, viewStyle, textProps, textStyle, ...children)
Tab(viewProps, viewStyle, textProps, ...children)
Tab(viewProps, viewStyle, ...children)
Tab(viewProps, ...children) // <-- this is what you saw above (most common, in combination with variants)
Tab(...children)
```

And there's also `Box.TextView` for quick inline text components:

```js
Box.TextView(viewStyle, textStyle, ...children)
Box.TextView(viewStyle, ...children)
Box.TextView(...children)
```

Flip mode:

```js
Box.TextView.flip(textStyle, viewStyle, ...children)
Box.TextView.flip(textStyle, ...children)
Box.TextView.flip(...children)
```

Flip mode behaves differently in this case, given there is no `props` argument. Instead it flips the position of `viewStyle` and `textStyle` arguments, making `textStyle` come first.

If you happen to want `props` with either `Text` or `View`, instead use `box.textView` to create a static component.


### `box.addComponents`

You can add custom components to `box` with `box.addComponents`:

```js
import box from 'box-model'
box.addComponents(components)
```

Where `components` is an object of components, keyed by name:

```js
const components = {
  MyComponent,
  MyOtherComponent,
}
```

Now you can use them wherever `box` is available without importing them:

```js
const MyComponent = box({
  type: 'MyComponent',
  props: {
    color: 'white',
  },
})
```

You can also specify a prefix to scope the components:

```js
box.addComponents(components, 'prefix')

const MyComponent = box({
  type: 'prefix.MyComponent',
})
```


You can also extend from these strings:

```js
const BoxComponent = box({
  backgroundColor: 'pink',
})

box.addComponents({ BoxComponent })

const MyComponent = box({
  extend: 'BoxComponent',
})
```


That's how you make your own custom toolkit of ready-made widgets that you can use over and over again without having to import them.



## `respond.js`

To link components with your Respond Modules, you need to specify a `respond.js` file at the root of each module directory:

```js
import { createUseRespond } from 'respond-framework'

export const {
  id,
  useRespond,
  useSubscribe,
  useListen,
} = createUseRespond()
```

The babel/swc plugin will look for this.

If you want to use `useRespond` directly, this is where you import it from.

In your module, you import and assign `id`:


```js

import { id } from './respond.js'

export default {
  id,
  plugins,
}
```

That's the bare minimum to be considered a Respond Module.



## Other methods:

### `useRespond`

If your components are in a directory not parsed by the babel/swc plugin, you can use `useRespond` directly within your component:

```js
import { useRespond } from '../respond.js'

const MyComponent = props => {
  const state = useRespond()
}
```


### `useSubscribe(cb, deps)`

To listen to just `trigger` events, use `useSubscribe`:

```js
useSubscribe(state => {
  // do something
}, [...deps])
```

It will be fired after the reduction.


### `useSubscribe(cb, deps, true)` -- all reduction events

To listen to all reduction events, use `useSubscribe` with `true` as the 3rd argument:

```js
useSubscribe(state => {
  // do something
}, [...deps], true)
```


### `useListen`

To listen to all state changes, regardless of whether they were triggered by a reduction, use `useListen`:

```js
useListen(state => {
 // do something
}, [...deps])
```

This can be handy if you mutate state in event callbacks outside of `reduce`.



## Built-in Components

Respond exports built-in components for common use cases. Think of them more as copy-pastable "recipes", which you can customize in userland, even if just the styles:


### Pressable

Usage:

```js
import { Pressable } from 'respond-framework/components'

const event = state.events.addFriend
const arg = { id: user.id }

Pressable({ event, arg })
```

Simplified implementation you can customize based on:

```js
const Pressable = ({
  event,
  arg,
  disabled,
  onPress,
  testKey,
  ref, // react 19
  ...props
}) => {
  const callback = event
    ? () => {
        event.trigger(arg, { testKey })
        onPress?.()
      }
    : onPress

  const Component = disabled ? View : TouchableOpacity
  const onPress = !disabled && callback

  return Component({ ...props, onPress, ref })
}
```



### Input

Usage:

```js
Input({
  event: state.events.edit,
  name: 'firstName',
  value: state.form.firstName,
})
```


Simplified implementation:

```js
const Input = ({
  event,
  name = 'value',
  value: v,
  formatIn = v => v,
  format = v => v,
  formatOut = format,
  style,
  placeholder,
  disabled,
  returnKeyType = 'done',
  ...props,
}, ref) => {
  const value = String(formatIn(v) || '')

  const onChangeText = v => {
    if (disabled) return

    const next = formatOut(v) || ''
    if (next === value) return

    event.trigger({ [name]: next }, { name, input: true })
  }

  return TextInput({
    ref,
    value,
    style,
    onChangeText,
    returnKeyType,
    disabled,
    editable: !disabled,
    placeholder: placeholder || name,
    ...props
  })
}
```


### Radio

Usage:

```js
Radio({
  event: state.events.edit,
  name: 'status',
  label: 'Status',
  value: state.form.status,
  options: [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
  ],
})
```

Implementation:

```js
const Radio = ({
  event,
  name,
  label,
  value,
  options,
  style,
  styleLabel,
  styleRadios,
  styleRadio,
  styleRadioActive,
  styleRadioText,
  styleRadioTextActive,
  styleLeft,
  styleRight,
}) =>
  Container(style, // flip mode
    label && Label(styleLabel, `${label}:`), // flip mode
    Radios(styleRadios,  // flip mode
      options.map((o, last) =>
        RadioButton({
          ...o,
          event,
          name,
          key: o.value,
          active: o.value === value,
          style: styleRadio,
          styleActive: styleRadioActive,
          styleText: styleRadioText,
          styleTextActive: styleRadioTextActive,
        })
      )
    )
  )
```

> Note: `Container`, `Label`, and `Radios` were created via `box.flip`. From here on out, we'll assume you're aware `box` or `box.flip` is being used based on the first argument passed to these presentation components.



### Tab

A `Tab` component is almost identical to a `Radio` component, except its *values* are events and each tab will have its own `event`, rather than share a single event such as `edit` in the `Radio`:

```js
const TabBar = (props, { events, curr }) =>
  Tabs({
    value: curr.event,
    tabs: [
      { title: 'Friends', value: events.friends },
      { title: 'Feed', event: events.feed },
      { title: 'My Profile', value: events.profile },
    ],
  })
```

The selected tab will be the value of the `curr` reducer's `event` property, which will match, eg, `events.friends`.

You can also come up with more complicated ways to match values, including other values from state, but the principle of matching one selected *option* from an array is the same.

If you wanted to systemitize further, you could grab the titles from the `event` itself:

```js
export default {
  friends: {
    pattern: '/friends',
    title: 'Friends',
  },
  feed: {
    pattern: '/feed',
    title: 'Feed',
  },
  profile: {
    pattern: '/profile',
    title: 'My Profile',
  },
}
```

```js
Tabs({
  value: curr.event,
  tabs: [
    events.friends,
    events.feed,
    events.profile,
  ]
})
```

This hypothetical `Tabs` component accepts `props.tabs` as the tabs array, and grabs title from each, falling back to `event.name`:


```js
const Tabs = ({ value, children }) => {
  const tabs = children.map(event => {
    const title = event.title ?? event.name // fallback to event.name
    const active = value === event

    return Tab({ title, active, key: title })
  })

  return Container(tabs)
}
```

Now while prototyping your app, you don't need to bother providing titles until you get around to it.



### Dropdown

Usage:
```js
Dropdown({
  event: state.events.edit,
  name: 'status',
  value: state.form.status,
  options: [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
  ],
})
```

Implementation:
```js
const Dropdown = ({
  event,
  name,
  value,
  options = [],
  disabled,
  createLabel = o => name + ': ' + (o?.label || o?.value || 'none'),
  selectedOption = (opts, v) => opts.find(o => o.value === v) ?? opts[0],
  style,
  styleLabel,
  styleMenu,
  styleOption,
  styleOptionLabel,
  styleDefaultOption,
  styleDisabled,
}) => {
  const [open, set] = useState(false)
  const onPress = useCallback(() => set(open => !open), [set])

  const selected = selectedOption(options, value)
  const label = createLabel(selected)

  const ref = useClickOut(set, open) // close menu on click out

  const menu = open && Menu(styleMenu,
    options.map((o, i) => 
      Option({
        ...o,
        key: o.value,
        name,
        event,
        onPress,
        styleOption,
        styleOptionLabel,
      })
    )
  )
  
  return Pressable({ onPress, disabled, ref }, { // traditional onPress triggering component level state
      ...style,
      ...(disabled && styleDisabled),
      zIndex,
    },
    Label({ ...styleLabel, ...(!selected && styleDefaultOption) }, label),
    Caret(),
    menu
  )
}

const Option = ({
  event,
  name,
  value,
  label,
  onPress,
  styleOption,
  styleOptionLabel
}) => {
  const arg = { [name]: value }

  return OptionPressable({ event, arg, onPress, name },
    styleOption,
    OptionLabel(styleOptionLabel, label ?? value)
  )
}
```

Here is your first encounter with `useState` in combination with Respond's global modular state. It's essentially a local "decoration" to display a small view for the opened menu.

> In this case, we can say the *component level* state is a "decoration" that won't cause problems. But it's not ideal, as it's not triggered by a Respond state change, and therefore requires a manual test.

> In the **Replays** doc, you will learn how Respond automatically snapshots the component tree after each trigger event settles. More specifically: after its callbacks and the plugin pipeline have settled, including animations and timers triggered in components.

The `value` however is the real state that matters in this case. And it's handled in a way that is automatically tested by Respond replays.

It can be said that the selected `value` is **driven** by Respond state. That is to say it respects the "unidirectional data flow" of triggered events -> global state -> components.

The "state-driven pattern" for components is what keeps standard isolated *widgets* much easier to deal with in Respond

> Here "`state`" refers to Respond's global modular state.

**Driving widgets with respond state** creates a clear interface between component level state and Respond state. Knowing how to drive widgets like this gives you the ability to build your app in a truly modular way, ***making use of both what React and Respond each do best***. It gives you automatic replay tests and it gives you a path to clearly separate concerns:

- state that truly belongs at the component level
- **and global respond state that drives it**

Respond state is easy to reason about because instead of being duplicated in several places in a component tree, it exists as a **single source of truth** inspectable within the Respond Inspection Tools.


#### Unidirectional Data Flow

Originally React was heavily focused on "unidirectional data flow." But in practice -- as global state was demoted -- what you experience is *cyclical* where a state change can trigger `useEffect` in both children and parents, triggering a new state change, and so on -- perhaps causing ancestors to re-render multiple times -- until the state is stable. That becomes very hard to debug and reason about, as well as slow to render.

Since Respond uses `useEffect` sparsely, cycles are mitigated. You also avoid having to *duplicate* the same state throughout the component tree, which is necessary when you want each component to be a boundary of modularity. 

For example, you might have a 3rd party `Dropdown` component inside your own reusable `MyDropdown` component inside a reusable `Modal` component inside yet another `Component`. And you want all to be modular, accepting an `open` prop, so they can be used in other scenarios without each other. In other words, you want them -- and often need them -- each to be *composable*.

In *all these components* -- if you want them to be able to operate independently -- you will need to use `useState` to store whether the dropdown is `open`. And you also need `useEffect` to change the state when the corresponding `open` prop changes.

Instead with Respond, you'll only use `useState` once in the leaf widget, and *drive that component level state* from your single source of truth in respond state.

React without Respond essentially violates the "single source of truth" principle as well as the "unidirectional data flow" principle.

In theory, React looks like it's honoring them. But in practice, `useEffect` in combination with `useState` causes re-renders that go in circles via ***unnecessary repeated cycles*** through the supposed "unidirectional flow".



### Navigator

Coming from component-centric solutions like *React Navigation*, the `Navigator` component is suprisingly simple in Respond, as **nested components have access to the entire state of the module**.

That means you don't need a giant `props` API to pass things like the `back` button, header titles, styles, etc. 

Instead, it can easily be accessed by nested components (no matter how deep) by simply requesting the corresponding state:


Usage:
```js
const Drawer = (props, state) => {
  return Navigator({ screens, duration: 500 })
}

const screens = {
  home: Home,
  settings: Settings,
  editProfile: EditProfile,
}

const Settings = (props, state) => {
  const event = state.events.back // no prop drilling!

  return Container(
    Header(
      BackButton({ event }),
      Title('Settings')
    ),
    SettingsForm()
  )
}
```

The implementation itself is suprisingly simple, and just what you would expect when having to manage so few component implementation details:



Implementation:

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


All we're doing is rendering an array of `screens` using `e.event.name` to select a screen, as we've seen many times before.

The only difference is that we're using `useTransition` and the current `state.index` to animate the transitions between entries. `interpolateEntry` can be implemented however you want. It just has to return a `style` object that conforms to what `Animated.View` can animate. 

> You can look into the React Native documentation for animations and interpolations.

If we want to optimize for possibly large stacks, we can remove non-adjacent entries by updating local `index` state. We want to do so at just the right time **after animations complete** to prevent jank (i.e. dropping animation frames):


```js
export default (next, isTrans) => {
  const [index, setIndex] = useState(next)

  useEffect(() => {
    if (isTrans || index === next) return
    setIndex(next) // when transition complete, update index
  }, [isTrans, next])

  return index
}
```
> `./src/hooks/useNavigatorIndex.js`


```js
export default ({ screens }, { stack, events }) => {
  const [anim, isTrans] = useTransition(stack.index)    // isTrans is true during animations
  const index = useNavigatorIndex(stack.index, isTrans) // index updated after animations complete

  return stack.entries.map((e, i) => {
    if (index - i > 1 || i - index > 1) return // DESIRED OPTIMIZATION: remove non-adjacent entries

    const style = interpolateEntry(anim, i)
    const Screen = screens[e.event.name]

    return AnimatedView({ key: i }, style, Screen(e))
  })
}
```
> `./src/components/Navigator.js`

We won't look into `interpolateEntry` as there many suitable examples of React Native interpolations across the web.

However to bring this all together, we need to tween an `Animated.Value` in a very standard way that you will be using over and over again with Respond.

We will use it as a full-fledged example of using Respond state to **"drive"** component state:

```js
export default (next, duration = 300) => {
  const anim = useRef(new Animated.Value(next)).current        
  const [val, set] = useState(next) 

  useEffect(() => {
    if (val === next) return // not transitioning
                                                                                         
    Animated.timing(anim, {
      toValue: next,
      duration,
      easing: Easing.sin,
    }).start(() => set(next))
  }, [val, next])

  return [anim, val !== next] // anim, isTransitioning
}
```
> `./src/hooks/useTransition.js`

The `useTransition` hook is our first encounter with `useEffect`. We use it to power animations and timer-delayed state changes.

When the `next` prop changes (in this case `stack.index`), `useEffect` will kickstart an animation sequence, ending with the **resolution of component state** *to the value received from Respond state*.

**What's great about this is that it is automatically covered in replay snapshot tests, as tests wait for timers + animations to settle and their corresponding components to render.**

This was not fully the case with the previous `Dropdown` example which had the `open` menu "decoration". We had to write manual tests for it because it called `setState` directly in `onPress` instead of `event.trigger`.

You might have originally been thinking that `useEffect` would be an anti-pattern with Respond. However, when used sparsely, the takeaway is actually this:

- `useEffect` is an excellent use case for a React hook -- *as long as its driven by Respond state*
- `onPress` calling `setState` directly is in fact what you don't want, as it means you must write a manual test

Respond's **component-to-widget interface** should now be clear: you can do all you want with timers and animations, as long as it's driven by Respond state. The formula is to compare incoming Respond state to local state in `useEffect` before doing things like opening and closing modals, transition animations, etc.




### Flash

Now that you're getting comfortable "driving" local component state, we're going to tackle perhaps the most common UI element all apps need: a `Flash`, aka `Modal`, popup.

Displaying a flash popup couldn't be easier with Respond. Since you have access to `state` anywhere in the module, just add a `Flash` component as an overlay at the end of your layout structure, *and it can grab its own state*.

Usage:

```js
const Layout = props =>
  Container(
    Drawer()
    Main()
    BottomTabBar()
    Flash() // make sure styles set it to a higher z-index
  )
```

Then simply `dispatch` an `error` or have one of your `db` table methods return an `{ error }` object, so that your `flash` reducer picks it up and displays it:

```js
export default (flash = null, e, { kinds, translations }) => {
  if (e.kind === kinds.navigation) return null // vanish when flash.ok triggers navigation event

  if (e.error) {
    const message = translations[e.error]
    return { message } // automatic handling of errors
  }

  switch (e.event) {
    case events.flash.create:
      return e

    case events.flash.edit:
      return { ...flash, value: e.payload.value }

    case events.flash.ok:
    case events.flash.cancel:
      return null
  }

  return e.flash ?? flash
}
```

To *trigger* an input prompt for example, just `trigger` the following:

```js
events.flash.create.trigger({
  type: 'prompt',
  title: 'Enter your name',
  inputProps: {
    placeholder: 'Your name',
  }
})
```
> You will want to create a simple `flash` events namespace, but you can structure it without it.

You can build the `flash` reducer and `Flash` component however you like. This is just a simplified example with a few frills. Use it for inspiration.


Implementation:

```js
const Flash = (props, { flash, events }) => {
  const { show, opacity, value: f } = useFadeInOut(flash, 300)
  if (!show) return

  const type = f.type ?? 'alert'

  const ok = f.ok ?? events.flash.ok
  const cancel = f.cancel ?? events.flash.cance

  const edit = events.flash.edit

  return Background({ opacity },
    Popup(
      Content(
        Title(f.title),
        Message(f.message),
        f.error             && Error(f.error),
        f.imageUrl          && Image({ source: f.imageUrl }),
        f.type === 'prompt' && Input({
          ...f.inputProps,
          event: edit,
          selectTextOnFocus: true,
          autoFocus: true,
          name: 'value',
          value: f.value,
        }),
      ),
      Buttons(
        type !== 'alert' && Pressable({ event: cancel, arg: f.cancelArg, },
          ButtonText(f.cancelText ?? 'Cancel')
        ),
        Pressable({ event: ok, arg: f.okArg, },
          ButtonText(f.okText ?? 'Okay')
        )
      )
    )
  )
}

```

As you can see, we use another hook, `useFadeInOut`, which provides the `opacity` Animated Value, while signaling when to remove itself via `show` which was like `isTrans` in `useTransition`.

Lastly, it performs another one of our go-to patterns: it memoizes state no longer living in Respond state, so that `Flash` can continue to display as it fades out.

In this case, it takes all of the `flash` object and returns `value`, which is the "last truthy value" of `flash`.

The implementation is very similar to `useTransition`, except the following mechanism to memoize and use "the last truthy value":

```js
export default next => {
  const [state, setState] = useState(next)

  useEffect(() => {
    if (next) setState(next) // won't setState when `flash` becomes null again
  }, [next])

  return state
}
```
> `./src/hooks/useLastTruthyValue.js`