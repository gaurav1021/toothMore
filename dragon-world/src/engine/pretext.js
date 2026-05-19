import {
  layoutNextLineRange,
  materializeLineRange,
  prepareWithSegments,
} from "@chenglou/pretext"

const STORY_TEXT = [
  "In the deepest hollow of a forgotten mountain range, beneath stone older than kingdoms and rivers older than memory, a dragon cracked through the shell of its obsidian egg into a world that feared it before it even breathed its first flame.",
  "The hatchling opened molten-gold eyes to darkness lit only by the dying embers of its mother's final fire. Its first days were cruel; hunger gnawed through its tiny ribs while icy winds tore through the cave mouth.",
  "As seasons passed, the dragon grew larger, scales hardening like forged armor. Villagers in the valleys below spoke its existence like a curse, teaching their children to hide whenever shadows crossed the sun.",
  "One winter, starving beyond reason, the dragon descended into a village for food and found not monsters, but frightened people clutching one another beside fading fires.",
  "From that night onward, it wandered alone across continents, carrying the weight of destruction it never intended.",
].join(" ")

const START_CURSOR = {
  segmentIndex: 0,
  graphemeIndex: 0,
}

export function createTypography() {
  const textLayer = document.getElementById("text-layer")
  textLayer.innerHTML = `
    <div class="text-header">
      <div class="text-eyebrow">Toothmore's Chronicle</div>
      <div class="text-actions">
        <a
          class="text-action"
          href="https://gaurav1021.github.io/me/"
          target="_blank"
          rel="noreferrer"
        >
          Portfolio
        </a>
        <a
          class="text-action"
          href="https://www.linkedin.com/in/developer-by-choice"
          target="_blank"
          rel="noreferrer"
        >
          LinkedIn
        </a>
        <button
          class="text-action sound-toggle"
          type="button"
          aria-pressed="true"
        >
          Music On
        </button>
      </div>
    </div>
    <div class="text-body"></div>
  `

  const header = textLayer.querySelector(".text-header")
  const body = textLayer.querySelector(".text-body")

  const linePool = []

  let prepared = null
  let metrics = null
  let dirty = true
  let lastLayoutKey = ""

  function invalidate() {
    dirty = true
    lastLayoutKey = ""
  }

  function render(dragons) {
    const nextMetrics = getMetrics(window.innerWidth, window.innerHeight)

    if (metricsChanged(metrics, nextMetrics)) {
      metrics = nextMetrics
      prepared = prepareWithSegments(STORY_TEXT, metrics.font, {
        letterSpacing: metrics.letterSpacing,
      })
      syncLayerMetrics(textLayer, header, metrics)
      dirty = true
    }

    const layoutKey = getLayoutKey(metrics, dragons)

    if (!dirty && layoutKey === lastLayoutKey) {
      return
    }

    const fragments = layoutFragments(prepared, metrics, dragons)
    commitFragments(body, linePool, fragments)

    lastLayoutKey = layoutKey
    dirty = false
  }

  return {
    invalidate,
    render,
  }
}

function getMetrics(viewportWidth, viewportHeight) {
  const fontSize = Math.round(clamp(viewportWidth * 0.021, 19, 30))
  const lineHeight = Math.round(fontSize * 1.52)
  const letterSpacing = Number((fontSize * 0.012).toFixed(2))
  const insetX = Math.round(clamp(viewportWidth * 0.08, 48, 120))
  const insetTop = Math.round(clamp(viewportHeight * 0.11, 58, 118))
  const insetBottom = Math.round(clamp(viewportHeight * 0.11, 54, 104))
  const eyebrowOffset = Math.round(fontSize * 2.05)
  const minSlotWidth = Math.round(clamp(fontSize * 5.4, 110, 180))
  const fontFamily = '"Palatino Linotype", "Book Antiqua", Baskerville, Georgia, serif'

  return {
    viewportWidth,
    viewportHeight,
    fontSize,
    lineHeight,
    letterSpacing,
    insetX,
    insetTop,
    insetBottom,
    eyebrowOffset,
    minSlotWidth,
    fontFamily,
    font: `400 ${fontSize}px ${fontFamily}`,
  }
}

function syncLayerMetrics(textLayer, header, metrics) {
  textLayer.style.setProperty("--text-inset-left", `${metrics.insetX}px`)
  textLayer.style.setProperty("--text-inset-top", `${metrics.insetTop}px`)
  textLayer.style.setProperty("--text-font-size", `${metrics.fontSize}px`)
  textLayer.style.setProperty("--text-line-height", `${metrics.lineHeight}px`)
  textLayer.style.setProperty("--text-letter-spacing", `${metrics.letterSpacing}px`)
  textLayer.style.setProperty("--text-font-family", metrics.fontFamily)

  header.style.maxWidth = `${metrics.viewportWidth - metrics.insetX * 2}px`
}

function metricsChanged(current, next) {
  if (current === null) return true

  return (
    current.viewportWidth !== next.viewportWidth ||
    current.viewportHeight !== next.viewportHeight ||
    current.fontSize !== next.fontSize ||
    current.lineHeight !== next.lineHeight ||
    current.letterSpacing !== next.letterSpacing
  )
}

function getLayoutKey(metrics, dragons) {
  const parts = [
    metrics.viewportWidth,
    metrics.viewportHeight,
    metrics.fontSize,
    metrics.lineHeight,
  ]

  for (const dragon of dragons) {
    const bounds = getPolygonBounds(dragon.polygon)
    parts.push(
      Math.round(bounds.left / 14),
      Math.round(bounds.top / 10),
      Math.round(bounds.right / 14),
      Math.round(bounds.bottom / 10),
    )
  }

  return parts.join("|")
}

function layoutFragments(prepared, metrics, dragons) {
  const fragments = []
  const baseSlot = {
    left: metrics.insetX,
    right: metrics.viewportWidth - metrics.insetX,
  }
  const bottom = metrics.viewportHeight - metrics.insetBottom

  let cursor = { ...START_CURSOR }
  let y = metrics.insetTop + metrics.eyebrowOffset

  while (y + metrics.lineHeight <= bottom) {
    const blocked = []
    const bandTop = y - metrics.lineHeight * 0.2
    const bandBottom = y + metrics.lineHeight * 0.82

    for (const dragon of dragons) {
      const interval = getPolygonIntervalForBand(
        dragon.polygon,
        bandTop,
        bandBottom,
        16 + dragon.scale * 9,
        10 + dragon.scale * 4,
      )

      if (interval !== null) {
        blocked.push(interval)
      }
    }

    const slots = carveTextLineSlots(baseSlot, blocked, metrics.minSlotWidth)

    for (const slot of slots) {
      const range = layoutNextLineRange(prepared, cursor, slot.right - slot.left)

      if (range === null) {
        return fragments
      }

      const line = materializeLineRange(prepared, range)

      fragments.push({
        text: line.text,
        width: slot.right - slot.left,
        x: slot.left,
        y,
      })

      cursor = range.end
    }

    y += metrics.lineHeight
  }

  return fragments
}

function commitFragments(body, linePool, fragments) {
  ensureLinePool(body, linePool, fragments.length)

  for (let index = 0; index < linePool.length; index++) {
    const line = linePool[index]
    const fragment = fragments[index]

    if (fragment === undefined) {
      line.hidden = true
      continue
    }

    line.hidden = false

    if (line.textContent !== fragment.text) {
      line.textContent = fragment.text
    }

    line.style.width = `${fragment.width}px`
    line.style.transform = `translate3d(${fragment.x}px, ${fragment.y}px, 0)`
  }
}

function ensureLinePool(body, linePool, count) {
  while (linePool.length < count) {
    const line = document.createElement("div")
    line.className = "line"
    body.appendChild(line)
    linePool.push(line)
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getPolygonBounds(points) {
  let left = Infinity
  let right = -Infinity
  let top = Infinity
  let bottom = -Infinity

  for (const point of points) {
    if (point.x < left) left = point.x
    if (point.x > right) right = point.x
    if (point.y < top) top = point.y
    if (point.y > bottom) bottom = point.y
  }

  return { left, right, top, bottom }
}

function getPolygonIntervalForBand(points, bandTop, bandBottom, horizontalPadding, verticalPadding) {
  const sampleTop = bandTop - verticalPadding
  const sampleBottom = bandBottom + verticalPadding
  const startY = Math.floor(sampleTop)
  const endY = Math.ceil(sampleBottom)

  let left = Infinity
  let right = -Infinity

  for (let y = startY; y <= endY; y++) {
    const xs = getPolygonXsAtY(points, y + 0.5)

    for (let index = 0; index + 1 < xs.length; index += 2) {
      const runLeft = xs[index]
      const runRight = xs[index + 1]

      if (runLeft < left) left = runLeft
      if (runRight > right) right = runRight
    }
  }

  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return null
  }

  return {
    left: left - horizontalPadding,
    right: right + horizontalPadding,
  }
}

function getPolygonXsAtY(points, y) {
  const xs = []

  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const point = points[index]
    const prior = points[previous]

    if ((point.y > y) === (prior.y > y) || point.y === prior.y) {
      continue
    }

    xs.push(point.x + ((y - point.y) * (prior.x - point.x)) / (prior.y - point.y))
  }

  xs.sort((a, b) => a - b)
  return xs
}

function carveTextLineSlots(base, blocked, minWidth) {
  let slots = [base]

  for (const interval of blocked) {
    const nextSlots = []

    for (const slot of slots) {
      if (interval.right <= slot.left || interval.left >= slot.right) {
        nextSlots.push(slot)
        continue
      }

      if (interval.left > slot.left) {
        nextSlots.push({
          left: slot.left,
          right: interval.left,
        })
      }

      if (interval.right < slot.right) {
        nextSlots.push({
          left: interval.right,
          right: slot.right,
        })
      }
    }

    slots = nextSlots
  }

  return slots.filter(slot => slot.right - slot.left >= minWidth)
}
