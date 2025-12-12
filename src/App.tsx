import { Route } from '@solidjs/router'
import type { Component } from 'solid-js'
import Home from '@pages/Home'

const App: Component = () => {
  return (
    <>
    <Route path="/" component={Home}/>
    </>
  )
}

export default App
