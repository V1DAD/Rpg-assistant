import '@fontsource/pixelify-sans'
import './card.css'
import './styles.css'
import './card.css'
import './effects.css'
import './styles.css'
import App from './App.svelte'
import { applyNoise } from './lib/noise.js'
applyNoise()
import { mount } from 'svelte'

export default mount(App, { target: document.getElementById('app') })