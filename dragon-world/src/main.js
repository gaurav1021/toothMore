import "./style.css"
import { createDragons } from "./engine/dragons"
import { createTypography } from "./engine/pretext"

document.querySelector("#app").innerHTML = `
  <div id="scene">
    <div id="sky"></div>
    <div id="fog"></div>
    <div id="dragon-layer"></div>
    <div id="text-layer"></div>
  </div>
`

const scene = document.getElementById("scene")
const dragonLayer = document.getElementById("dragon-layer")

const dragonSystem = createDragons(dragonLayer)
const typography = createTypography()

const TYPOGRAPHY_INTERVAL_MS = 1000 / 8

let cameraAngle = 0
let lastFrameTime = performance.now()
let lastTypographyUpdate = -Infinity

function updateCamera(deltaMs) {
  cameraAngle += deltaMs * 0.00009

  const x = Math.cos(cameraAngle) * 18
  const y = Math.sin(cameraAngle * 1.3) * 10

  scene.style.transform = `translate3d(${x}px, ${y}px, 0)`
}

function frame(now) {
  const deltaMs = Math.min(32, now - lastFrameTime || 16.67)
  lastFrameTime = now

  updateCamera(deltaMs)
  dragonSystem.update(now, deltaMs)

  if (now - lastTypographyUpdate >= TYPOGRAPHY_INTERVAL_MS) {
    typography.render(dragonSystem.getTypographySnapshot())
    lastTypographyUpdate = now
  }

  requestAnimationFrame(frame)
}

function handleResize() {
  dragonSystem.resize(window.innerWidth, window.innerHeight)
  typography.invalidate()
  lastTypographyUpdate = -Infinity
}

window.addEventListener("resize", handleResize)

requestAnimationFrame(frame)
