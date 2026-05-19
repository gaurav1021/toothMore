import dragonSVG from "../dragons/dragon2.svg?raw"
import gsap from "gsap"

const DRAGON_COUNT = 5
const DRAGON_SIZE = 240
const SVG_VIEWBOX_WIDTH = 1000
const SVG_VIEWBOX_HEIGHT = 600
const SVG_ASPECT_RATIO = SVG_VIEWBOX_HEIGHT / SVG_VIEWBOX_WIDTH

const DRAGON_WRAP_POINTS = [
  { x: 88, y: 252 },
  { x: 126, y: 184 },
  { x: 180, y: 86 },
  { x: 314, y: 16 },
  { x: 474, y: 12 },
  { x: 676, y: 42 },
  { x: 782, y: 92 },
  { x: 720, y: 206 },
  { x: 964, y: 292 },
  { x: 980, y: 392 },
  { x: 842, y: 386 },
  { x: 612, y: 366 },
  { x: 356, y: 410 },
  { x: 182, y: 360 },
  { x: 74, y: 304 },
]

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function chooseTarget(viewportWidth, viewportHeight) {
  const paddingX = Math.min(120, Math.max(24, viewportWidth * 0.18))
  const paddingY = Math.min(120, Math.max(24, viewportHeight * 0.18))
  const minX = paddingX
  const maxX = Math.max(minX, viewportWidth - paddingX)
  const minY = paddingY
  const maxY = Math.max(minY, viewportHeight - paddingY)

  return {
    x: randomBetween(minX, maxX),
    y: randomBetween(minY, maxY),
  }
}

function applyDepthStyle(state) {
  const scale = 0.48 + state.depth * 1.08
  const blur = (1 - state.depth) * 1.4
  const opacity = 0.38 + state.depth * 0.58

  state.scale = scale
  state.el.style.zIndex = String(Math.floor(20 + state.depth * 60))
  state.el.style.opacity = opacity.toFixed(3)
  state.el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none"
}

function createDragonState(el, inner) {
  const depth = Math.random()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const target = chooseTarget(viewportWidth, viewportHeight)

  const state = {
    el,
    inner,
    depth,
    x: Math.random() * viewportWidth,
    y: Math.random() * viewportHeight,
    vx: randomBetween(-1.8, 1.8),
    vy: randomBetween(-1.6, 1.6),
    targetX: target.x,
    targetY: target.y,
    turnSpeed: 0.028,
    speed: 1.4 + depth * 2.6,
    displayRotation: 0,
    wrapRotation: 0,
    scale: 1,
    floatOffset: Math.random() * 5000,
    hoverAngle: Math.random() * 5000,
  }

  applyDepthStyle(state)
  return state
}

export function createDragons(layer) {
  const dragonStates = []

  for (let index = 0; index < DRAGON_COUNT; index++) {
    const dragon = document.createElement("div")
    dragon.className = "dragon"
    dragon.innerHTML = `
      <div class="dragon-inner">
        ${dragonSVG}
      </div>
    `

    layer.appendChild(dragon)

    const inner = dragon.querySelector(".dragon-inner")
    const state = createDragonState(dragon, inner)

    dragonStates.push(state)
    animateWings(dragon, inner)
  }

  return {
    update(now, deltaMs) {
      updateDragons(dragonStates, now, deltaMs)
    },

    resize(viewportWidth, viewportHeight) {
      for (const dragon of dragonStates) {
        dragon.x = clamp(dragon.x, -DRAGON_SIZE, viewportWidth)
        dragon.y = clamp(dragon.y, -DRAGON_SIZE, viewportHeight)

        if (
          dragon.targetX < 0 ||
          dragon.targetX > viewportWidth ||
          dragon.targetY < 0 ||
          dragon.targetY > viewportHeight
        ) {
          const target = chooseTarget(viewportWidth, viewportHeight)
          dragon.targetX = target.x
          dragon.targetY = target.y
        }
      }
    },

    getTypographySnapshot() {
      return dragonStates.map(dragon => ({
        polygon: buildWrapPolygon(dragon),
        scale: dragon.scale,
      }))
    },
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function animateWings(dragon, inner) {
  const leftWing = dragon.querySelector(".left-wing")
  const rightWing = dragon.querySelector(".right-wing")
  const tail = dragon.querySelector(".tail")
  const neck = dragon.querySelector(".neck")

  gsap.to(tail, {
    skewY: 3,
    x: -6,
    duration: 2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
    transformOrigin: "500px 330px",
  })

  gsap.to(neck, {
    rotation: -3,
    y: -2,
    duration: 2.5,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
    transformOrigin: "350px 330px",
  })

  gsap.to(leftWing, {
    rotation: -12,
    y: -8,
    duration: 0.45 + Math.random() * 0.2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
    transformOrigin: "360px 340px",
  })

  gsap.to(rightWing, {
    rotation: 12,
    y: -8,
    duration: 0.45 + Math.random() * 0.2,
    delay: 0.08,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
    transformOrigin: "400px 320px",
  })

  gsap.to(inner, {
    y: "+=4",
    duration: 0.5,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  })
}

function updateDragons(dragonStates, now, deltaMs) {
  const deltaScale = deltaMs / 16.67
  const time = now * 0.001
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  for (const dragon of dragonStates) {
    const dx = dragon.targetX - dragon.x
    const dy = dragon.targetY - dragon.y
    const angle = Math.atan2(dy, dx)

    dragon.vx += Math.cos(angle) * dragon.turnSpeed * deltaScale
    dragon.vy += Math.sin(angle) * dragon.turnSpeed * deltaScale

    const length = Math.hypot(dragon.vx, dragon.vy) || 1

    dragon.vx = (dragon.vx / length) * dragon.speed
    dragon.vy = (dragon.vy / length) * dragon.speed

    dragon.x += dragon.vx * deltaScale
    dragon.y += dragon.vy * deltaScale

    dragon.x += Math.sin(time * 0.7 + dragon.floatOffset) * 0.2
    dragon.y += Math.sin(time * 1.4 + dragon.floatOffset) * 0.35

    if (
      Math.hypot(dx, dy) < 110 ||
      dragon.x < -DRAGON_SIZE * 1.5 ||
      dragon.x > viewportWidth + DRAGON_SIZE * 0.5 ||
      dragon.y < -DRAGON_SIZE * 1.5 ||
      dragon.y > viewportHeight + DRAGON_SIZE * 0.5
    ) {
      const target = chooseTarget(viewportWidth, viewportHeight)
      dragon.targetX = target.x
      dragon.targetY = target.y
    }

    const targetRotation = (Math.atan2(dragon.vy, dragon.vx) * 180) / Math.PI + 180
    dragon.displayRotation += (targetRotation - dragon.displayRotation) * 0.08

    const hoverRotation = Math.sin(time + dragon.hoverAngle) * 4
    dragon.wrapRotation = dragon.displayRotation + dragon.vx * 2 + hoverRotation

    dragon.el.style.transform = `translate3d(${dragon.x}px, ${dragon.y}px, 0) scale(${dragon.scale})`
    dragon.inner.style.transform = `rotate(${dragon.wrapRotation}deg)`
  }
}

function buildWrapPolygon(dragon) {
  const width = DRAGON_SIZE * dragon.scale
  const height = DRAGON_SIZE * dragon.scale
  const contentHeight = width * SVG_ASPECT_RATIO
  const padY = (height - contentHeight) * 0.5
  const centerX = dragon.x + width * 0.5
  const centerY = dragon.y + height * 0.5
  const angle = (dragon.wrapRotation * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return DRAGON_WRAP_POINTS.map(point => {
    const pointX = dragon.x + (point.x / SVG_VIEWBOX_WIDTH) * width
    const pointY = dragon.y + padY + (point.y / SVG_VIEWBOX_HEIGHT) * contentHeight
    const localX = pointX - centerX
    const localY = pointY - centerY

    return {
      x: centerX + localX * cos - localY * sin,
      y: centerY + localX * sin + localY * cos,
    }
  })
}
