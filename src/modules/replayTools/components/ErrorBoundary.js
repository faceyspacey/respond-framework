import * as React from 'react'


export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  async componentDidCatch(error, errorInfo) {
    console.error(`ReplayTools: there's an error in ReplayTools. Call localStorage.clear() to remove replay settings that may be causing it.`)
  }

  render() {
    const { error } = this.state
    const { children } = this.props
    
    return !error ? children : null
  }
}