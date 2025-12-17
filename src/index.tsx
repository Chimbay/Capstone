import Home from '@pages/Home'
import { Route, Router } from '@solidjs/router'
import { render } from 'solid-js/web'
import App from './App'
import './index.css'

render(
  () => (
    <Router>
      <Route
        path="/"
        component={() => (
          <App>
            <Home />
          </App>
        )}
      />
    </Router>
  ),
  document.getElementById('root')
)
