import DebugPanel from '@debug/Panel'
import FileDrop from '@components/FileDrop'
import Library from '@components/Library'
import { Component } from 'solid-js'

const Home: Component = () => {
  return (
    <div class="grid p-3">
      <div class="flex items-center justify-center flex-col">
        <FileDrop/>
        <Library/>
        <DebugPanel/>
      </div>
    </div>
  )
}

export default Home
