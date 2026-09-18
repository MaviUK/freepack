import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export type BagPanelKey = 'front' | 'right' | 'back' | 'left'
export type BagPoint = { row: number; col: number }
export type BagRect = { top: number; left: number; bottom: number; right: number }

export type BagPanelConfig = {
  label: string
  cols: number
  rows: number
  widthMm: number
}

type Bag3DProps = {
  widthMm: number
  depthMm: number
  heightMm: number
  panels: Record<BagPanelKey, BagPanelConfig>
  soldByPanel: Record<BagPanelKey, string[]>
  activePanel: BagPanelKey
  selection: BagRect | null
  artwork: string | null
  onCellSelect: (panel: BagPanelKey, point: BagPoint) => void
  onPanelChange: (panel: BagPanelKey) => void
}

type OverlayFace = {
  panel: BagPanelKey
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  texture: THREE.CanvasTexture
}

const PANEL_ORDER: BagPanelKey[] = ['front', 'right', 'back', 'left']

function cellKey(row: number, col: number) {
  return `${row}-${col}`
}

function selectionContains(selection: BagRect | null, row: number, col: number) {
  if (!selection) return false
  return (
    row >= selection.top &&
    row <= selection.bottom &&
    col >= selection.left &&
    col <= selection.right
  )
}

export default function Bag3D({
  widthMm,
  depthMm,
  heightMm,
  panels,
  soldByPanel,
  activePanel,
  selection,
  artwork,
  onCellSelect,
  onPanelChange,
}: Bag3DProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const bagGroupRef = useRef<THREE.Group | null>(null)
  const overlaysRef = useRef<Record<BagPanelKey, OverlayFace> | null>(null)
  const animationRef = useRef<number | null>(null)
  const onCellSelectRef = useRef(onCellSelect)
  const onPanelChangeRef = useRef(onPanelChange)
  const dragStateRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  })

  useEffect(() => {
    onCellSelectRef.current = onCellSelect
    onPanelChangeRef.current = onPanelChange
  }, [onCellSelect, onPanelChange])

  const soldSignature = useMemo(
    () => PANEL_ORDER.map((key) => `${key}:${soldByPanel[key].join(',')}`).join('|'),
    [soldByPanel],
  )

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    scene.background = null
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(4.8, 2.8, 6.7)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    host.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambient = new THREE.HemisphereLight(0xfff7e7, 0x4b3a28, 2.0)
    scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.1)
    keyLight.position.set(4.5, 6.5, 5.5)
    keyLight.castShadow = true
    scene.add(keyLight)

    const fill = new THREE.DirectionalLight(0xffe3b5, 1.4)
    fill.position.set(-4, 2, -3)
    scene.add(fill)

    const scale = 3.8 / heightMm
    const w = widthMm * scale
    const d = Math.max(depthMm * scale, 0.5)
    const h = heightMm * scale

    const bagGroup = new THREE.Group()
    bagGroup.rotation.x = -0.12
    bagGroup.rotation.y = -0.38
    scene.add(bagGroup)
    bagGroupRef.current = bagGroup

    const paperMaterial = new THREE.MeshStandardMaterial({
      color: 0xc3a16c,
      roughness: 0.94,
      metalness: 0,
      side: THREE.DoubleSide,
    })
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: 0xb18d5d,
      roughness: 0.96,
      metalness: 0,
      side: THREE.DoubleSide,
    })
    const insideMaterial = new THREE.MeshStandardMaterial({
      color: 0x9f7c50,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
    })

    function addPanel(
      width: number,
      height: number,
      position: THREE.Vector3,
      rotation: THREE.Euler,
      material: THREE.Material,
    ) {
      const geometry = new THREE.PlaneGeometry(width, height)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(position)
      mesh.rotation.copy(rotation)
      mesh.castShadow = true
      mesh.receiveShadow = true
      bagGroup.add(mesh)
      return mesh
    }

    // Main paper shell: four open faces + bottom.
    addPanel(w, h, new THREE.Vector3(0, 0, d / 2), new THREE.Euler(0, 0, 0), paperMaterial)
    addPanel(w, h, new THREE.Vector3(0, 0, -d / 2), new THREE.Euler(0, Math.PI, 0), paperMaterial)
    addPanel(d, h, new THREE.Vector3(w / 2, 0, 0), new THREE.Euler(0, Math.PI / 2, 0), sideMaterial)
    addPanel(d, h, new THREE.Vector3(-w / 2, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0), sideMaterial)

    const bottom = new THREE.Mesh(new THREE.PlaneGeometry(w, d), insideMaterial)
    bottom.rotation.x = -Math.PI / 2
    bottom.position.y = -h / 2
    bottom.receiveShadow = true
    bagGroup.add(bottom)

    // Folded top rim for a more bag-like silhouette.
    const rimHeight = Math.min(0.16, h * 0.045)
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xb99664,
      roughness: 0.97,
      side: THREE.DoubleSide,
    })
    addPanel(w, rimHeight, new THREE.Vector3(0, h / 2 - rimHeight / 2, d / 2 + 0.006), new THREE.Euler(0, 0, 0), rimMaterial)
    addPanel(w, rimHeight, new THREE.Vector3(0, h / 2 - rimHeight / 2, -d / 2 - 0.006), new THREE.Euler(0, Math.PI, 0), rimMaterial)
    addPanel(d, rimHeight, new THREE.Vector3(w / 2 + 0.006, h / 2 - rimHeight / 2, 0), new THREE.Euler(0, Math.PI / 2, 0), rimMaterial)
    addPanel(d, rimHeight, new THREE.Vector3(-w / 2 - 0.006, h / 2 - rimHeight / 2, 0), new THREE.Euler(0, -Math.PI / 2, 0), rimMaterial)

    // Subtle vertical gusset creases on the side walls.
    const creaseMaterial = new THREE.LineBasicMaterial({
      color: 0x7f613e,
      transparent: true,
      opacity: 0.35,
    })
    ;[-1, 1].forEach((side) => {
      const x = side * (w / 2 + 0.01)
      const pts = [
        new THREE.Vector3(x, -h / 2 + 0.12, 0),
        new THREE.Vector3(x, h / 2 - 0.16, 0),
      ]
      const geom = new THREE.BufferGeometry().setFromPoints(pts)
      const line = new THREE.Line(geom, creaseMaterial)
      bagGroup.add(line)
    })

    const overlayFaces = {} as Record<BagPanelKey, OverlayFace>

    function createOverlay(
      panel: BagPanelKey,
      planeWidth: number,
      planeHeight: number,
      position: THREE.Vector3,
      rotation: THREE.Euler,
    ) {
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = Math.max(640, Math.round((planeHeight / planeWidth) * 640))
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D context unavailable')

      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })

      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeWidth, planeHeight), material)
      mesh.position.copy(position)
      mesh.rotation.copy(rotation)
      mesh.userData.panel = panel
      mesh.renderOrder = 10
      bagGroup.add(mesh)

      overlayFaces[panel] = { panel, mesh, canvas, ctx, texture }
    }

    const eps = 0.018
    createOverlay('front', w, h, new THREE.Vector3(0, 0, d / 2 + eps), new THREE.Euler(0, 0, 0))
    createOverlay('back', w, h, new THREE.Vector3(0, 0, -d / 2 - eps), new THREE.Euler(0, Math.PI, 0))
    createOverlay('right', d, h, new THREE.Vector3(w / 2 + eps, 0, 0), new THREE.Euler(0, Math.PI / 2, 0))
    createOverlay('left', d, h, new THREE.Vector3(-w / 2 - eps, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0))

    overlaysRef.current = overlayFaces

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.8, Math.max(w, d) * 1.8),
      new THREE.ShadowMaterial({ opacity: 0.22 }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -h / 2 - 0.28
    shadow.receiveShadow = true
    scene.add(shadow)

    function resize() {
      if (!host || !rendererRef.current || !cameraRef.current) return
      const rect = host.getBoundingClientRect()
      const width = Math.max(1, rect.width)
      const height = Math.max(1, rect.height)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    function panelPointFromEvent(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)

      const targets = PANEL_ORDER.map((key) => overlayFaces[key].mesh)
      const hit = raycaster.intersectObjects(targets, false)[0]
      if (!hit?.uv) return null

      const panel = hit.object.userData.panel as BagPanelKey
      const config = panels[panel]
      const u = THREE.MathUtils.clamp(hit.uv.x, 0, 0.999999)
      const v = THREE.MathUtils.clamp(hit.uv.y, 0, 0.999999)
      const col = Math.floor(u * config.cols)
      const row = Math.floor((1 - v) * config.rows)

      return { panel, point: { row, col } }
    }

    function onPointerDown(event: PointerEvent) {
      dragStateRef.current = {
        active: true,
        moved: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
      }
      renderer.domElement.setPointerCapture(event.pointerId)
    }

    function onPointerMove(event: PointerEvent) {
      const drag = dragStateRef.current
      if (!drag.active || drag.pointerId !== event.pointerId) return

      const dx = event.clientX - drag.lastX
      const dy = event.clientY - drag.lastY
      drag.lastX = event.clientX
      drag.lastY = event.clientY

      if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 6) {
        drag.moved = true
      }

      if (!drag.moved || !bagGroupRef.current) return

      bagGroupRef.current.rotation.y += dx * 0.0085
      bagGroupRef.current.rotation.x = THREE.MathUtils.clamp(
        bagGroupRef.current.rotation.x + dy * 0.0065,
        -0.82,
        0.82,
      )
    }

    function onPointerUp(event: PointerEvent) {
      const drag = dragStateRef.current
      if (!drag.active || drag.pointerId !== event.pointerId) return

      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId)
      }

      if (!drag.moved) {
        const hit = panelPointFromEvent(event)
        if (hit) {
          onPanelChangeRef.current(hit.panel)
          onCellSelectRef.current(hit.panel, hit.point)
        }
      }

      drag.active = false
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault()
      const direction = Math.sign(event.deltaY)
      camera.position.multiplyScalar(direction > 0 ? 1.05 : 0.95)
      const distance = camera.position.length()
      if (distance < 5.1) camera.position.setLength(5.1)
      if (distance > 10) camera.position.setLength(10)
      camera.lookAt(0, 0, 0)
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })

    function render() {
      renderer.render(scene, camera)
      animationRef.current = requestAnimationFrame(render)
    }
    render()

    return () => {
      resizeObserver.disconnect()
      if (animationRef.current) cancelAnimationFrame(animationRef.current)

      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)
      renderer.domElement.removeEventListener('wheel', onWheel)

      Object.values(overlayFaces).forEach((face) => {
        face.mesh.geometry.dispose()
        face.mesh.material.dispose()
        face.texture.dispose()
      })

      bagGroup.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) object.material.forEach((m) => m.dispose())
          else object.material.dispose()
        }
      })

      renderer.dispose()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
      scene.clear()
      rendererRef.current = null
      sceneRef.current = null
      cameraRef.current = null
      bagGroupRef.current = null
      overlaysRef.current = null
    }
  }, [widthMm, depthMm, heightMm, panels])

  useEffect(() => {
    const overlays = overlaysRef.current
    if (!overlays) return
    const overlayFaces = overlays

    let cancelled = false
    let artworkImage: HTMLImageElement | null = null

    function paint() {
      PANEL_ORDER.forEach((panel) => {
        const overlay = overlayFaces[panel]
        const config = panels[panel]
        const { canvas, ctx, texture } = overlay
        const cols = config.cols
        const rows = config.rows
        const cellW = canvas.width / cols
        const cellH = canvas.height / rows

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const x = col * cellW
            const y = row * cellH
            const sold = soldByPanel[panel].includes(cellKey(row, col))
            const selected = panel === activePanel && selectionContains(selection, row, col)

            ctx.fillStyle = sold
              ? 'rgba(244,239,229,0.88)'
              : selected
                ? 'rgba(113,145,102,0.78)'
                : 'rgba(255,255,255,0.055)'
            ctx.fillRect(x + 1.5, y + 1.5, cellW - 3, cellH - 3)

            ctx.strokeStyle = selected
              ? 'rgba(43,70,37,0.95)'
              : sold
                ? 'rgba(96,84,63,0.75)'
                : 'rgba(65,45,22,0.55)'
            ctx.lineWidth = selected ? 2.5 : 1.2
            ctx.setLineDash(selected || sold ? [] : [5, 5])
            ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4)
            ctx.setLineDash([])

            if (sold && cellW > 36 && cellH > 28) {
              ctx.fillStyle = 'rgba(79,73,61,0.88)'
              ctx.font = `700 ${Math.max(9, Math.min(14, cellH * 0.16))}px system-ui, sans-serif`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText('SOLD', x + cellW / 2, y + cellH / 2)
            }
          }
        }

        if (panel === activePanel && selection) {
          const x = selection.left * cellW
          const y = selection.top * cellH
          const width = (selection.right - selection.left + 1) * cellW
          const height = (selection.bottom - selection.top + 1) * cellH

          if (artworkImage && artworkImage.complete) {
            ctx.save()
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(x + 3, y + 3, width - 6, height - 6)

            const scale = Math.min(
              (width - 10) / artworkImage.naturalWidth,
              (height - 10) / artworkImage.naturalHeight,
            )
            const drawW = artworkImage.naturalWidth * scale
            const drawH = artworkImage.naturalHeight * scale
            ctx.drawImage(
              artworkImage,
              x + (width - drawW) / 2,
              y + (height - drawH) / 2,
              drawW,
              drawH,
            )
            ctx.restore()
          }

          ctx.strokeStyle = '#29472a'
          ctx.lineWidth = 5
          ctx.strokeRect(x + 2.5, y + 2.5, width - 5, height - 5)
        }

        texture.needsUpdate = true
      })
    }

    if (artwork) {
      artworkImage = new Image()
      artworkImage.onload = () => {
        if (!cancelled) paint()
      }
      artworkImage.src = artwork
    }

    paint()

    return () => {
      cancelled = true
    }
  }, [activePanel, artwork, panels, selection, soldByPanel, soldSignature])

  function rotate(horizontal: number, vertical: number) {
    const bag = bagGroupRef.current
    if (!bag) return

    bag.rotation.y += horizontal
    bag.rotation.x = THREE.MathUtils.clamp(bag.rotation.x + vertical, -0.82, 0.82)
  }

  return (
    <div className="bag3d-shell">
      <div className="bag3d-canvas" ref={hostRef} />

      <button
        type="button"
        className="bag3d-control bag3d-up"
        aria-label="Rotate bag up"
        onClick={() => rotate(0, -0.18)}
      >
        ↑
      </button>
      <button
        type="button"
        className="bag3d-control bag3d-down"
        aria-label="Rotate bag down"
        onClick={() => rotate(0, 0.18)}
      >
        ↓
      </button>
      <button
        type="button"
        className="bag3d-control bag3d-left"
        aria-label="Rotate bag left"
        onClick={() => rotate(-0.22, 0)}
      >
        ←
      </button>
      <button
        type="button"
        className="bag3d-control bag3d-right"
        aria-label="Rotate bag right"
        onClick={() => rotate(0.22, 0)}
      >
        →
      </button>

      <div className="bag3d-hint">
        Drag to rotate · scroll/pinch to zoom · tap a grid square to select
      </div>
    </div>
  )
}
