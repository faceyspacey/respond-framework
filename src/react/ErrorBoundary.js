import * as React from 'react'


export default class ErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  
  static getDerivedStateFromError(error) {
    return { error }
  }

  async componentDidCatch(error, errorInfo) {
    await this.props.store.options.onError?.(error, 'render')
  }

  render() {
    const { Error = DefaultError } = this.props

    return this.state.error
      ? <Error error={this.state.error} />
      : this.props.children
  }
}


const DefaultError = props => {
  console.warn(`respond: supply an Error component as a prop to Provider: <Provider store={store} Error={Error} />`)
  console.error(props.error)
}