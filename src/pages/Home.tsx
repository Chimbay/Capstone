import FileDrop from '@components/FileDrop'
import Library from '@components/Library'
import { Component } from 'solid-js'

const Home: Component = () => {
  return (
    <div class="grid p-3">
      <div class="flex items-center justify-center flex-col">
        <FileDrop />
        <Library />
      </div>
    </div>
  )
}

export default Home
