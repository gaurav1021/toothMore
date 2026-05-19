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
const ambientAudio = createAmbientAudio()

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

function createAmbientAudio() {
  const control = document.querySelector(".sound-toggle")

  if (control === null) {
    return null
  }

  const audio = new Audio(`${import.meta.env.BASE_URL}binks_sake.mp3`)
  audio.loop = true
  audio.preload = "metadata"
  audio.volume = 0.18

  let wantsPlayback = true
  let hasInteracted = false

  function syncControl() {
    const isPlaying = !audio.paused && !audio.ended
    control.textContent = wantsPlayback ? (isPlaying ? "Music On" : "Music Ready") : "Music Off"
    control.setAttribute("aria-pressed", String(wantsPlayback))
  }

  async function playAudio() {
    if (!wantsPlayback) {
      syncControl()
      return
    }

    try {
      await audio.play()
    } catch {
      // Browser autoplay rules can still block playback until a gesture.
    }

    syncControl()
  }

  function stopAudio() {
    audio.pause()
    syncControl()
  }

  function unlockAudio() {
    if (hasInteracted) {
      return
    }

    hasInteracted = true
    playAudio()
  }

  control.addEventListener("click", () => {
    wantsPlayback = !wantsPlayback

    if (!wantsPlayback) {
      stopAudio()
      return
    }

    playAudio()
  })

  document.addEventListener("pointerdown", unlockAudio, { once: true })
  document.addEventListener("keydown", unlockAudio, { once: true })

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      audio.pause()
      syncControl()
      return
    }

    if (wantsPlayback && hasInteracted) {
      playAudio()
    }
  })

  syncControl()

  return {
    audio,
  }
}

window.addEventListener("resize", handleResize)

requestAnimationFrame(frame)
