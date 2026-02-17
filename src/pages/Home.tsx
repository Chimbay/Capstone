import FileDrop from '@library/DropBox'
import Library from '@library/Library'
import { Component } from 'solid-js'

const Home: Component = () => {
  return (
    <div class="grid p-3">
      <div class="flex items-center justify-center flex-col">
        <Library />
      </div>
    </div>
  )
}

export default Home
