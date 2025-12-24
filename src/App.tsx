import Editor from '@components/Editor'
import DebugPanel from '@debug/Panel'
import Home from '@pages/Home'
import { A, Route, Router } from '@solidjs/router'
import ToastProvider from '@ui/toast/ToastProvider'
import type { ParentComponent } from 'solid-js'

function NavBar() {
  return (
    <nav class="bg-gray-800 text-white p-4 flex space-x-4">
      <A href="/" end class="hover:underline">
        Home
      </A>
      {/* <DebugPanel/> */}
    </nav>
  )
}

const App: ParentComponent = () => {
  return (
    <ToastProvider>
      <Router
        root={props => (
          <>
            <NavBar />
            <main>{props.children}</main>
          </>
        )}
      >
        <Route path="/" component={Home} />
        <Route path="/editor/:file_name" component={Editor} />
      </Router>
    </ToastProvider>
  )
}

export default App
