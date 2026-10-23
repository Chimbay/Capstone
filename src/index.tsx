import { getCurrentWindow } from '@tauri-apps/api/window'
import { render } from 'solid-js/web'
import App from './App'
import './index.css'

// The window starts hidden (tauri.conf.json) to avoid a wrong-theme flash; show it once painted.
// Rust shows it anyway after 2s if this never runs.
const show = () => void getCurrentWindow().show().catch(console.error)

try {
  render(() => <App />, document.getElementById('root'))
} finally {
  requestAnimationFrame(() => requestAnimationFrame(show))
}
