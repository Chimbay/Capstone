import Home from '@pages/Home'
import View from '@pages/View'
import { Route, Router } from '@solidjs/router'
import ToastProvider from '@ui/toast/ToastProvider'
import { type ParentComponent } from 'solid-js'
import Nav from './components/Nav'

const App: ParentComponent = () => {
  return (
    <ToastProvider>
      <Router
        root={props => (
          <div class="flex flex-row">
            <Nav />
            <main class="relative flex-1 bg-white">{props.children}</main>
          </div>
        )}
      >
        <Route path="/" component={Home} />
        <Route path="/view/:uuid" component={View} />
      </Router>
    </ToastProvider>
  )
}

export default App
