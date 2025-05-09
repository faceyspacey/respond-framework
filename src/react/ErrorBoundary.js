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
    await this.props.state.respond.onError({ error, kind: 'render' })
  }

  render() {
    const { error } = this.state
    const { Error = DefaultError, children, state } = this.props
    
    const clear = () => this.setState({ error: null })
    
    const props = { children, error, clear, state }

    return !error ? children : React.createElement(Error, props)
  }
}


const DefaultError = ({ children, error, clear, state }) => {
  if (isProd) {
    console.warn('respond: supply an `Error` component in your top module, or as a prop to `render({ Error })` in production')
  }

  return children
}