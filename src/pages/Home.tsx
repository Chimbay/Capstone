import Library from '@library/Library'
import { Component } from 'solid-js'

const Home: Component = () => {
  return (
    <div class="grid p-3">
      <h1>Your documents:</h1>
      <hr/>
      <div class="flex flex-col">
        <Library />
      </div>
    </div>
  )
}

export default Home
