import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export type BagPanelKey = 'front' | 'right' | 'back' | 'left'
export type BagPoint = { row: number; col: number }
export type BagRect = { top: number; left: number; bottom: number; right: number }

export type BagSponsorArtwork = {
  id: string
  panel: BagPanelKey
  topRow: number
  leftCol: number
  widthCells: number
  heightCells: number
  artworkUrl: string
}

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
  sponsorArtwork: BagSponsorArtwork[]
  brandRowsByPanel: Record<BagPanelKey, number[]>
  brandGapAfterRowByPanel: Record<BagPanelKey, number | null>
  brandLogoUrl: string
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
const CELL_MM = 30
const GAP_MM = 3
const SAFE_MARGIN_MM = 10
const VERTICAL_EDGE_MARGIN_MM = 6
const BRAND_TO_AD_GAP_MM = 3

function panelLayout(
  config: BagPanelConfig,
  heightMm: number,
  brandRows: number[] = [],
  brandGapAfterRow: number | null = null,
) {
  const horizontalGapMm = config.cols <= 1
    ? 0
    : config.cols === 6 && config.widthMm <= 200
      ? 1
      : Math.min(
          GAP_MM,
          Math.max(
            0,
            (config.widthMm - SAFE_MARGIN_MM * 2 - config.cols * CELL_MM) / (config.cols - 1),
          ),
        )
  const stepXmm = CELL_MM + horizontalGapMm
  const gridWidthMm = config.cols * CELL_MM + Math.max(0, config.cols - 1) * horizontalGapMm
  const offsetXmm = config.cols === 6 && config.widthMm <= 200
    ? Math.max(0, (config.widthMm - gridWidthMm) / 2)
    : Math.max(SAFE_MARGIN_MM, (config.widthMm - gridWidthMm) / 2)
  const rowYmm = Array.from({ length: config.rows }, () => 0)

  if (!brandRows.length && brandGapAfterRow === null) {
    const gridHeightMm = config.rows * CELL_MM + Math.max(0, config.rows - 1) * GAP_MM
    const offsetYmm = Math.max(VERTICAL_EDGE_MARGIN_MM, (heightMm - gridHeightMm) / 2)
    for (let row = 0; row < config.rows; row += 1) {
      rowYmm[row] = offsetYmm + row * (CELL_MM + GAP_MM)
    }

    return {
      gridWidthMm,
      gridHeightMm,
      offsetXmm,
      offsetYmm,
      stepMm: stepXmm,
      horizontalGapMm,
      rowYmm,
      brandZoneTopMm: null as number | null,
      brandZoneHeightMm: 0,
    }
  }

  const sortedBrandRows = [...brandRows].sort((a, b) => a - b)
  const brandZoneHeightMm = sortedBrandRows.length > 1 ? 48 : 22
  const brandZoneTopMm = (heightMm - brandZoneHeightMm) / 2
  const brandZoneBottomMm = brandZoneTopMm + brandZoneHeightMm

  let topRows: number[]
  let bottomRows: number[]

  if (sortedBrandRows.length) {
    const firstBrandRow = sortedBrandRows[0]
    const lastBrandRow = sortedBrandRows[sortedBrandRows.length - 1]
    topRows = Array.from({ length: firstBrandRow }, (_, index) => index)
    bottomRows = Array.from(
      { length: config.rows - lastBrandRow - 1 },
      (_, index) => lastBrandRow + 1 + index,
    )
  } else {
    const splitAfter = Math.max(0, Math.min(config.rows - 2, brandGapAfterRow ?? 0))
    topRows = Array.from({ length: splitAfter + 1 }, (_, index) => index)
    bottomRows = Array.from(
      { length: config.rows - splitAfter - 1 },
      (_, index) => splitAfter + 1 + index,
    )
  }

  function fitGap(rowCount: number, availableHeight: number) {
    if (rowCount <= 1) return 0
    return Math.min(
      GAP_MM,
      Math.max(0, (availableHeight - rowCount * CELL_MM) / (rowCount - 1)),
    )
  }

  if (topRows.length) {
    const topEndMm = brandZoneTopMm - BRAND_TO_AD_GAP_MM
    const availableHeight = topEndMm - VERTICAL_EDGE_MARGIN_MM
    const gap = fitGap(topRows.length, availableHeight)
    const blockHeight = topRows.length * CELL_MM + (topRows.length - 1) * gap
    const startMm = topEndMm - blockHeight

    topRows.forEach((row, index) => {
      rowYmm[row] = startMm + index * (CELL_MM + gap)
    })
  }

  if (bottomRows.length) {
    const bottomStartMm = brandZoneBottomMm + BRAND_TO_AD_GAP_MM
    const availableHeight = heightMm - VERTICAL_EDGE_MARGIN_MM - bottomStartMm
    const gap = fitGap(bottomRows.length, availableHeight)

    bottomRows.forEach((row, index) => {
      rowYmm[row] = bottomStartMm + index * (CELL_MM + gap)
    })
  }

  const visibleRows = rowYmm.filter((_, row) => !sortedBrandRows.includes(row))

  return {
    gridWidthMm,
    gridHeightMm: heightMm - VERTICAL_EDGE_MARGIN_MM * 2,
    offsetXmm,
    offsetYmm: visibleRows.length ? Math.min(...visibleRows) : VERTICAL_EDGE_MARGIN_MM,
    stepMm: stepXmm,
      horizontalGapMm,
    rowYmm,
    brandZoneTopMm,
    brandZoneHeightMm,
  }
}

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

function panelRotationY(panel: BagPanelKey) {
  if (panel === 'right') return -Math.PI / 2
  if (panel === 'back') return Math.PI
  if (panel === 'left') return Math.PI / 2
  return 0
}

export default function Bag3D({
  widthMm,
  depthMm,
  heightMm,
  panels,
  soldByPanel,
  sponsorArtwork,
  brandRowsByPanel,
  brandGapAfterRowByPanel,
  brandLogoUrl,
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
  const focusAnimationRef = useRef<number | null>(null)
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

  const sponsorSignature = useMemo(
    () => sponsorArtwork
      .map((item) => `${item.id}:${item.panel}:${item.topRow}:${item.leftCol}:${item.widthCells}:${item.heightCells}:${item.artworkUrl}`)
      .join('|'),
    [sponsorArtwork],
  )

  const brandSignature = useMemo(
    () => PANEL_ORDER
      .map((key) => `${key}:${brandRowsByPanel[key].join(',')}:${brandGapAfterRowByPanel[key] ?? 'none'}`)
      .join('|'),
    [brandGapAfterRowByPanel, brandRowsByPanel],
  )

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    scene.background = null
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    // Keep the camera centred horizontally so whichever face is selected can
    // rotate square-on to the viewer instead of remaining at a perspective angle.
    camera.position.set(0, 2.8, 8.2)
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
    bagGroup.rotation.y = panelRotationY(activePanel)
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
      const panelBrandRows = brandRowsByPanel[panel]
      const panelBrandGapAfterRow = brandGapAfterRowByPanel[panel]
      const layout = panelLayout(config, heightMm, panelBrandRows, panelBrandGapAfterRow)
      const u = THREE.MathUtils.clamp(hit.uv.x, 0, 0.999999)
      const v = THREE.MathUtils.clamp(hit.uv.y, 0, 0.999999)

      const xMm = u * config.widthMm
      const yMm = (1 - v) * heightMm
      const localX = xMm - layout.offsetXmm

      if (localX < 0 || localX > layout.gridWidthMm) return null

      const col = Math.floor(localX / layout.stepMm)
      if (col < 0 || col >= config.cols) return null

      const withinCellX = localX - col * layout.stepMm
      if (withinCellX > CELL_MM) return null

      const row = layout.rowYmm.findIndex((rowY, rowIndex) => (
        !panelBrandRows.includes(rowIndex) &&
        yMm >= rowY &&
        yMm <= rowY + CELL_MM
      ))

      if (row < 0) return null

      return { panel, point: { row, col } }
    }

    function onPointerDown(event: PointerEvent) {
      if (focusAnimationRef.current) {
        cancelAnimationFrame(focusAnimationRef.current)
        focusAnimationRef.current = null
      }

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
      bagGroupRef.current.rotation.x += dy * 0.0065
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
      if (focusAnimationRef.current) {
        cancelAnimationFrame(focusAnimationRef.current)
        focusAnimationRef.current = null
      }

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
  }, [widthMm, depthMm, heightMm, panels, brandSignature])

  useEffect(() => {
    const bag = bagGroupRef.current
    if (!bag) return

    if (focusAnimationRef.current) {
      cancelAnimationFrame(focusAnimationRef.current)
      focusAnimationRef.current = null
    }

    const startY = bag.rotation.y
    let targetY = panelRotationY(activePanel)

    while (targetY - startY > Math.PI) targetY -= Math.PI * 2
    while (targetY - startY < -Math.PI) targetY += Math.PI * 2

    const startX = bag.rotation.x
    const targetX = -0.12
    const duration = 360
    const startedAt = performance.now()

    function animate(now: number) {
      const currentBag = bagGroupRef.current
      if (!currentBag) return

      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)

      currentBag.rotation.y = startY + (targetY - startY) * eased
      currentBag.rotation.x = startX + (targetX - startX) * eased

      if (progress < 1) {
        focusAnimationRef.current = requestAnimationFrame(animate)
      } else {
        focusAnimationRef.current = null
      }
    }

    focusAnimationRef.current = requestAnimationFrame(animate)

    return () => {
      if (focusAnimationRef.current) {
        cancelAnimationFrame(focusAnimationRef.current)
        focusAnimationRef.current = null
      }
    }
  }, [activePanel, widthMm, depthMm, heightMm])

  useEffect(() => {
    const overlays = overlaysRef.current
    if (!overlays) return
    const overlayFaces = overlays

    let cancelled = false
    let artworkImage: HTMLImageElement | null = null
    let brandImage: HTMLImageElement | null = null
    const sponsorImages = new Map<string, HTMLImageElement>()

    function drawContainedImage(
      ctx: CanvasRenderingContext2D,
      image: HTMLImageElement,
      x: number,
      y: number,
      width: number,
      height: number,
      padding: number,
    ) {
      const availableWidth = Math.max(1, width - padding * 2)
      const availableHeight = Math.max(1, height - padding * 2)
      const scale = Math.min(
        availableWidth / image.naturalWidth,
        availableHeight / image.naturalHeight,
      )
      const drawW = image.naturalWidth * scale
      const drawH = image.naturalHeight * scale
      ctx.drawImage(
        image,
        x + (width - drawW) / 2,
        y + (height - drawH) / 2,
        drawW,
        drawH,
      )
    }

    function paint() {
      PANEL_ORDER.forEach((panel) => {
        const overlay = overlayFaces[panel]
        const config = panels[panel]
        const { canvas, ctx, texture } = overlay
        const cols = config.cols
        const rows = config.rows
        const panelBrandRows = brandRowsByPanel[panel]
        const panelBrandGapAfterRow = brandGapAfterRowByPanel[panel]
        const layout = panelLayout(config, heightMm, panelBrandRows, panelBrandGapAfterRow)
        const pxPerMmX = canvas.width / config.widthMm
        const pxPerMmY = canvas.height / heightMm
        const cellW = CELL_MM * pxPerMmX
        const cellH = CELL_MM * pxPerMmY
        const stepX = layout.stepMm * pxPerMmX
        const originX = layout.offsetXmm * pxPerMmX

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw the 10mm minimum safe-print boundary at real scale.
        ctx.save()
        ctx.strokeStyle = 'rgba(67,48,26,0.16)'
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])
        ctx.strokeRect(
          SAFE_MARGIN_MM * pxPerMmX,
          SAFE_MARGIN_MM * pxPerMmY,
          canvas.width - SAFE_MARGIN_MM * 2 * pxPerMmX,
          canvas.height - SAFE_MARGIN_MM * 2 * pxPerMmY,
        )
        ctx.restore()

        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const x = originX + col * stepX
            const y = layout.rowYmm[row] * pxPerMmY
            const branded = panelBrandRows.includes(row)
            if (branded) continue

            const sold = soldByPanel[panel].includes(cellKey(row, col))

            ctx.fillStyle = sold
              ? 'rgba(244,239,229,0.90)'
              : 'rgba(255,255,255,0.055)'
            ctx.fillRect(x, y, cellW, cellH)

            ctx.strokeStyle = sold
              ? 'rgba(96,84,63,0.78)'
              : 'rgba(65,45,22,0.55)'
            ctx.lineWidth = sold ? 1.8 : 1.15
            ctx.setLineDash(sold ? [] : [5, 5])
            ctx.strokeRect(x, y, cellW, cellH)
            ctx.setLineDash([])

            if (sold && cellW > 34 && cellH > 26) {
              ctx.fillStyle = 'rgba(79,73,61,0.88)'
              ctx.font = `700 ${Math.max(9, Math.min(14, cellH * 0.16))}px system-ui, sans-serif`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText('SOLD', x + cellW / 2, y + cellH / 2)
            }
          }
        }

        const brandRows = panelBrandRows
        const hasBrandZone = brandRows.length > 0 || panelBrandGapAfterRow !== null
        if (hasBrandZone && layout.brandZoneTopMm !== null) {
          const bandY = layout.brandZoneTopMm * pxPerMmY
          const bandHeight = layout.brandZoneHeightMm * pxPerMmY
          const bandX = originX
          const bandWidth = layout.gridWidthMm * pxPerMmX

          ctx.save()

          if (brandImage?.complete && brandImage.naturalWidth && brandImage.naturalHeight) {
            drawContainedImage(
              ctx,
              brandImage,
              bandX,
              bandY,
              bandWidth,
              bandHeight,
              Math.max(8, Math.min(bandWidth, bandHeight) * 0.14),
            )
          }

          ctx.restore()
        }

        for (const sponsor of sponsorArtwork) {
          if (sponsor.panel !== panel) continue

          const sponsorImage = sponsorImages.get(sponsor.id)
          if (!sponsorImage?.complete || !sponsorImage.naturalWidth || !sponsorImage.naturalHeight) continue

          const x = originX + sponsor.leftCol * stepX
          const sponsorBottomRow = sponsor.topRow + sponsor.heightCells - 1
          const yMm = layout.rowYmm[sponsor.topRow]
          const bottomMm = layout.rowYmm[sponsorBottomRow] + CELL_MM
          const y = yMm * pxPerMmY
          const widthMm = sponsor.widthCells * CELL_MM + Math.max(0, sponsor.widthCells - 1) * layout.horizontalGapMm
          const width = widthMm * pxPerMmX
          const height = (bottomMm - yMm) * pxPerMmY

          ctx.save()
          drawContainedImage(
            ctx,
            sponsorImage,
            x,
            y,
            width,
            height,
            Math.max(3, Math.min(width, height) * 0.025),
          )
          ctx.strokeStyle = 'rgba(46,55,40,0.72)'
          ctx.lineWidth = 2
          ctx.strokeRect(x + 1, y + 1, width - 2, height - 2)
          ctx.restore()
        }

        if (panel === activePanel && selection) {
          const selectedCols = selection.right - selection.left + 1
          const x = originX + selection.left * stepX
          const selectionTopMm = layout.rowYmm[selection.top]
          const selectionBottomMm = layout.rowYmm[selection.bottom] + CELL_MM
          const y = selectionTopMm * pxPerMmY
          const widthMm = selectedCols * CELL_MM + Math.max(0, selectedCols - 1) * layout.horizontalGapMm
          const width = widthMm * pxPerMmX
          const height = (selectionBottomMm - selectionTopMm) * pxPerMmY

          // One advertiser gets one continuous rectangle: no internal 3mm gaps.
          // Never paint a background behind advertiser artwork. Transparent
          // pixels must reveal the kraft bag underneath; the border alone
          // indicates the selected advertising area.
          ctx.save()

          if (artworkImage && artworkImage.complete && artworkImage.naturalWidth && artworkImage.naturalHeight) {
            drawContainedImage(
              ctx,
              artworkImage,
              x,
              y,
              width,
              height,
              Math.max(5, Math.min(width, height) * 0.035),
            )
          }

          ctx.strokeStyle = '#29472a'
          ctx.lineWidth = 4
          ctx.strokeRect(x + 2, y + 2, width - 4, height - 4)
          ctx.restore()
        }

        texture.needsUpdate = true
      })
    }

    for (const sponsor of sponsorArtwork) {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.onload = () => {
        if (!cancelled) paint()
      }
      image.onerror = () => {
        if (!cancelled) paint()
      }
      sponsorImages.set(sponsor.id, image)
      image.src = sponsor.artworkUrl
    }

    if (brandLogoUrl) {
      brandImage = new Image()
      brandImage.crossOrigin = 'anonymous'
      brandImage.onload = () => {
        if (!cancelled) paint()
      }
      brandImage.onerror = () => {
        if (!cancelled) paint()
      }
      brandImage.src = brandLogoUrl
    }

    if (artwork) {
      artworkImage = new Image()
      artworkImage.crossOrigin = 'anonymous'
      artworkImage.onload = () => {
        if (!cancelled) paint()
      }
      artworkImage.src = artwork
    }

    paint()

    return () => {
      cancelled = true
    }
  }, [activePanel, artwork, brandGapAfterRowByPanel, brandLogoUrl, brandRowsByPanel, brandSignature, panels, selection, soldByPanel, soldSignature, sponsorArtwork, sponsorSignature])

  function rotate(horizontal: number, vertical: number) {
    const bag = bagGroupRef.current
    if (!bag) return

    bag.rotation.y += horizontal
    bag.rotation.x += vertical
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
        3cm advert units · tighter spacing around centred Freepack branding · drag to rotate · tap to select
      </div>
    </div>
  )
}
