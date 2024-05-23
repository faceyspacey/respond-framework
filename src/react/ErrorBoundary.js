import * as React from 'react'
import { isProd } from '../utils.js'


export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  async componentDidCatch(error, errorInfo) {
    await this.props.store.onError({ error, kind: 'render' })
  }

  render() {
    const { error } = this.state
    const { Error = DefaultError, children, store } = this.props
    
    const clear = () => this.setState({ error: null })

    return !error ? children : React.createElement(Error, { children, error, clear, store })
  }
}


const DefaultError = ({ children, error, clear, store }) => {
  if (isProd) {
    console.warn('respond: supply an `Error` component, either in your top module or to Provider: <Provider store={store} Error={Error} />')
  }

  return children
}