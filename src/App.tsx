import Home from '@pages/Home'
import BoardView from '@pages/BoardView'
import View from '@pages/View'
import { Route, Router } from '@solidjs/router'
import ToastProvider from '@ui/toast/ToastProvider'
import { DocumentAPI } from '@api/document'
import ChooseLibrary from '@library/ChooseLibrary'
import { createResource, Show, type ParentComponent } from 'solid-js'
import Nav from '@ui/Nav'

const App: ParentComponent = () => {
  const [location] = createResource(() => DocumentAPI.library_location())
  return (
    <ToastProvider>
      <Router
        root={props => (
          // Nothing to show until a library folder is chosen
          <Show when={!location.loading}>
            <Show when={location()} fallback={<ChooseLibrary />}>
              <div class="flex flex-row">
                <Nav />
                <main class="relative min-w-0 flex-1 bg-white">{props.children}</main>
              </div>
            </Show>
          </Show>
        )}
      >
        <Route path="/" component={Home} />
        <Route path="/view/:uuid" component={View} />
        <Route path="/board/:uuid" component={BoardView} />
      </Router>
    </ToastProvider>
  )
}

export default App
