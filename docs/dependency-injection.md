# Dependency Injection

It's common to want to make available additional tools and data in middleware and callbacks. This is called "dependency injection." The `inject` option serves this purpose:

```js
import { isMobile } from './helpers'

createModule({
  options: {
    inject: {
      context: { isMobile: isMobile() },
    }
  }
})
```

Events that makes use of this `context` object might look like this:

```js
events: {
  home: {
    path: '/',
    beforeEnter: ({ context: { isMobile }, types }) => {
      if (isMobile()) return { type: types.mobile } // redirect
    }
  },
  mobile: '/mobile',
},
```

## Api Example

The most common use case is an `api` instance, which stores user tokens for use across multiple route transtions. On the server, this design is required because multiple tokens would end be up shared between requests:

*src/app.js*

```js
import Api from './Api'

export default (request, response) => createModule({
  routes,
  components,
  reducers,
  etc,
  options: {
    inject: {
      api: new Api(request, response),
    }
  }
})
```

*server/render.js*

```js
import ReactDOM from 'react-dom'
import { Provider } from 'respond-framework'
import createApp from '../src/app'
import App from '../src/components/App'

export default ({ clientStats }) => async (req, res) => {
  const { app } = createApp(req, res)
  
  const { state } = await app.start()
  const { redirect, status, url } = state.location

  if (redirect) return res.redirect(status, url)

  return res.send(
    `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${state.title}</title>
        </head>
        <body>
          <script>window.RESPOND_STATE = ${JSON.stringify(state)}</script>
          <div id="root">
            ${ReactDOM.renderToString(<Provider app={app}><App /></Provider>)}
          </div>
          <script type='text/javascript' src='/static/vendor.js'></script>
          ${app.flushChunks(clientStats)}
        </body>
      </html>`
  )
}

```

> in *render.js*, `req` and `res` are Express instances. They are needed to access to the Express APIs for cookie handling.

Now, in your route callbacks, the `api` instance made available by inject will already have a token from cookies associated with it:

```js
MY_POSTS: {
  path: '/my-posts',
  thunk: async (request, action) => {
    const { api, actions } = request
    const { posts } = await api.get('post/list') // token

    return posts
  }
}
```

On login client side an `api.login` method would initially generate a token and store it within your `api` instance:

```js
SUBMIT_LOGIN: {
  thunk: async (request, action) => {
    const { api } = request
    const { email, password } = action.payload
    const { success, message } = await api.login(email, password) // token received

    return success ? actions.dashboard() : actions.flash(message)
  }
}
```

## Api Class


An `Api` class to universally handle token acceptance and application to requests might look like this:

```js
import axios from 'axios' // popular data fetching library
import Cookies from './cookies'
import config from '../config'

axios.defaults.baseURL = `${config.rootUrl}/`

export default class Api {
  constructor(req, res) {
    this._cookies = req
      ? new Cookies(req.headers.cookie, this.createHooks(req, res)) // server
      : new Cookies() // client (cookies discovered client-side by this class)
  }

  createHooks(req, res) {
    return {
      onSet(name, value, opts) {
        if (!res.cookie || res.headersSent) return

        const options = {
          path: '/',
          expires: new Date(2080, 1, 1, 0, 0, 1),
          maxAge: opts.maxAge || 2147483647,
          ...opts
        }

        res.cookie(name, value, options)
      },
      onRemove(name, opts) {
        if (!res.clearCookie || res.headersSent) return

        const options = {
          path: '/',
          maxAge: 0,
          ...opts
        }

        res.clearCookie(name, options)
      }
    }
  }

  setCookie(name, value) {
    this._cookies.set(name, value)
  }

  getCookie(name) {
    return this._cookies.get(name)
  }

  removeCookie(name) {
    this._cookies.remove(name)
  }

  config() {
    return (
      this.getCookie('token') && {
        headers: {
          Authorization: `Bearer ${this.getCookie('token')}`
        }
      }
    )
  }

  get(url, params, conf) {
    const config = { ...this.config(), params, ...conf }
    return axios.get(url, config)
  }

  post(url, data, conf) {
    const config = { ...this.config(), ...conf }
    return axios.post(url, data, config)
  }

  async login(email, password) {
    const { token, message } = await axios.post('login', { email, password })

    if (token) {
      this.setCookie('token', token)
      return { success: true }
    }

    return { error: true, message }
  }
}
```


## Cookie Class

And for the `Cookie` class you might have something like this using the [universal-cookies](https://www.npmjs.com/package/universal-cookie) package on npm:

```js
import UniversalCookie from 'universal-cookie'

export default class Cookie extends UniversalCookie {
  set(name, value, opts) {
    const options = {
      ...opts,
      path: '/',
      expires: new Date(2080, 1, 1, 0, 0, 1),
      maxAge: 2147483647
    }

    return super.set(name, value, options)
  }

  remove(name, opts) {
    const options = {
      ...opts,
      path: '/',
      maxAge: 0
    }

    return super.remove(name, options)
  }
}
```

The reason you use cookies is because `localStorage` isn't available server-side. Therefore, cookies are the ***only universal solution*** available on both the client *and* the server. 

Client-only single page apps could just as well use `localStorage`, of which there are many similar examples on the web you can learn from. If you'd like to supply a client-only example, a PR to this page would likely be accepted.