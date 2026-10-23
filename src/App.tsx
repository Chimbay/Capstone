import { DocumentAPI } from '@api/document'
import ChooseLibrary from '@library/ChooseLibrary'
import Library from '@library/Library'
import BoardView from '@pages/BoardView'
import Home from '@pages/Home'
import View from '@pages/View'
import { Route, Router } from '@solidjs/router'
import ErrorPanel from '@ui/ErrorPanel'
import ToastProvider from '@ui/toast/ToastProvider'
import { PanelLeftClose, PanelLeftOpen, Settings as SettingsIcon } from 'lucide-solid'
import {
  createResource,
  createSignal,
  ErrorBoundary,
  Show,
  type ParentComponent
} from 'solid-js'
import SettingsDialog from './settings/SettingsDialog'

const SIDEBAR_KEY = 'sidebarCollapsed'
const readCollapsed = () => {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  } catch {
    return false // storage blocked
  }
}

const App: ParentComponent = () => {
  const [location] = createResource(() => DocumentAPI.library_location())
  const [settings, setSettings] = createSignal(false)
  const [collapsed, setCollapsed] = createSignal(readCollapsed())
  const toggleSidebar = () => {
    setCollapsed(c => !c)
    try {
      localStorage.setItem(SIDEBAR_KEY, String(collapsed()))
    } catch {
      // storage blocked: the choice lasts until reload
    }
  }
  return (
    <ToastProvider>
      <Router
        root={props => (
          // Nothing to show until a library folder is chosen
          <Show when={!location.loading}>
            <Show when={location()} fallback={<ChooseLibrary />}>
              <div class="flex flex-row">
                <aside
                  class="flex h-dvh shrink-0 flex-col border-r border-gray-200 p-2 dark:border-zinc-700"
                  classList={{ 'w-64': !collapsed(), 'w-12': collapsed() }}
                >
                  <button
                    aria-label={collapsed() ? 'Expand sidebar' : 'Collapse sidebar'}
                    title={collapsed() ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-expanded={!collapsed()}
                    class="self-start rounded-md px-2 py-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    onClick={toggleSidebar}
                  >
                    {collapsed() ? (
                      <PanelLeftOpen size={16} />
                    ) : (
                      <PanelLeftClose size={16} />
                    )}
                  </button>
                  {/* Hidden, not unmounted, so open folders and the selection survive a collapse */}
                  <div
                    class="min-h-0 flex-1 overflow-y-auto"
                    classList={{ invisible: collapsed() }}
                  >
                    <Library />
                  </div>
                  <button
                    aria-label="Settings"
                    title="Settings"
                    aria-pressed={settings()}
                    class="self-start rounded-md px-2 py-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    classList={{ 'bg-gray-200 dark:bg-zinc-700': settings() }}
                    onClick={() => setSettings(open => !open)}
                  >
                    <SettingsIcon size={16} />
                  </button>
                  <Show when={settings()}>
                    <SettingsDialog onClose={() => setSettings(false)} />
                  </Show>
                </aside>
                <main class="relative min-w-0 flex-1 bg-white dark:bg-zinc-900">
                  {/* A crash in one page shows an error instead of a blank window; the sidebar stays usable */}
                  <ErrorBoundary
                    fallback={(err: unknown, reset) => (
                      <ErrorPanel
                        title="Something went wrong"
                        message={
                          err instanceof Error ? err.message : String(err as string)
                        }
                        onRetry={reset}
                      />
                    )}
                  >
                    {props.children}
                  </ErrorBoundary>
                </main>
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
