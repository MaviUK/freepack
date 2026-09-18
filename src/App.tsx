import { useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Box,
  CalendarDays,
  Check,
  ImagePlus,
  Megaphone,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react'

const DEMO_SQUARE_PRICE = 192

type Point = { row: number; col: number }
type Rect = { top: number; left: number; bottom: number; right: number }
type PanelKey = 'front' | 'right' | 'back' | 'left'

type PanelConfig = {
  label: string
  shortLabel: string
  cols: number
  rows: number
  widthMm: number
}

type BagRun = {
  id: string
  size: 'Small' | 'Medium' | 'Large' | 'XL'
  dimensions: string
  faceWidth: number
  sideWidth: number
  height: number
  totalBagSquares: number
  estimatedStart: string
  soldByPanel: Record<PanelKey, string[]>
}

const PANEL_ORDER: PanelKey[] = ['front', 'right', 'back', 'left']

const BAG_RUNS: BagRun[] = [
  {
    id: 'S-001',
    size: 'Small',
    dimensions: '150 × 215 × 300 mm',
    faceWidth: 150,
    sideWidth: 65,
    height: 300,
    totalBagSquares: 80,
    estimatedStart: 'December 2026',
    soldByPanel: {
      front: ['0-2', '0-3', '1-2', '1-3', '4-0', '5-0'],
      right: ['1-0', '2-0'],
      back: ['2-0', '2-1', '3-0', '3-1'],
      left: ['5-0', '6-0'],
    },
  },
  {
    id: 'M-001',
    size: 'Medium',
    dimensions: '175 × 288 × 350 mm',
    faceWidth: 175,
    sideWidth: 113,
    height: 350,
    totalBagSquares: 120,
    estimatedStart: 'December 2026',
    soldByPanel: {
      front: ['0-2', '0-3', '1-2', '1-3', '5-0', '5-1', '6-0', '6-1'],
      right: ['1-0', '1-1', '2-0', '2-1'],
      back: ['3-2', '3-3', '4-2', '4-3'],
      left: ['6-0', '7-0'],
    },
  },
  {
    id: 'L-001',
    size: 'Large',
    dimensions: '200 × 315 × 375 mm',
    faceWidth: 200,
    sideWidth: 115,
    height: 375,
    totalBagSquares: 140,
    estimatedStart: 'December 2026',
    soldByPanel: {
      front: ['0-3', '0-4', '1-3', '1-4', '4-0', '4-1', '5-0', '5-1', '8-3', '8-4', '9-3', '9-4'],
      right: ['1-0', '1-1', '2-0', '2-1', '7-0'],
      back: ['0-0', '0-1', '1-0', '1-1', '6-3', '6-4', '7-3', '7-4'],
      left: ['4-0', '5-0', '6-0'],
    },
  },
  {
    id: 'XL-001',
    size: 'XL',
    dimensions: '250 × 388 × 413 mm',
    faceWidth: 250,
    sideWidth: 138,
    height: 413,
    totalBagSquares: 240,
    estimatedStart: 'December 2026',
    soldByPanel: {
      front: ['0-5', '0-6', '1-5', '1-6', '4-0', '4-1', '5-0', '5-1', '9-4', '9-5', '10-4', '10-5'],
      right: ['1-0', '1-1', '2-0', '2-1', '6-2', '7-2'],
      back: ['2-3', '2-4', '2-5', '3-3', '3-4', '3-5', '8-0', '9-0'],
      left: ['4-0', '4-1', '5-0', '5-1'],
    },
  },
]

function makeRect(a: Point, b: Point): Rect {
  return {
    top: Math.min(a.row, b.row),
    left: Math.min(a.col, b.col),
    bottom: Math.max(a.row, b.row),
    right: Math.max(a.col, b.col),
  }
}

function rectCells(rect: Rect) {
  const result: string[] = []
  for (let row = rect.top; row <= rect.bottom; row += 1) {
    for (let col = rect.left; col <= rect.right; col += 1) {
      result.push(`${row}-${col}`)
    }
  }
  return result
}

function shapeLabel(rect: Rect | null) {
  if (!rect) return 'None selected'
  return `${rect.right - rect.left + 1} × ${rect.bottom - rect.top + 1}`
}

function gridCount(widthMm: number, heightMm: number) {
  const cols = Math.floor((widthMm - 20 + 3) / 33)
  const rows = Math.floor((heightMm - 20 + 3) / 33)
  return { cols: Math.max(1, cols), rows: Math.max(1, rows) }
}

function panelsForRun(run: BagRun): Record<PanelKey, PanelConfig> {
  const face = gridCount(run.faceWidth, run.height)
  const side = gridCount(run.sideWidth, run.height)

  return {
    front: { label: 'Front', shortLabel: 'Front', cols: face.cols, rows: face.rows, widthMm: run.faceWidth },
    right: { label: 'Right side', shortLabel: 'Right', cols: side.cols, rows: side.rows, widthMm: run.sideWidth },
    back: { label: 'Back', shortLabel: 'Back', cols: face.cols, rows: face.rows, widthMm: run.faceWidth },
    left: { label: 'Left side', shortLabel: 'Left', cols: side.cols, rows: side.rows, widthMm: run.sideWidth },
  }
}

export default function App() {
  const [runId, setRunId] = useState('L-001')
  const [panelKey, setPanelKey] = useState<PanelKey>('front')
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [preview, setPreview] = useState<Rect | null>(null)
  const [selection, setSelection] = useState<Rect | null>(null)
  const [artwork, setArtwork] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [bagBoxes, setBagBoxes] = useState<Record<string, number>>({
    'S-001': 0,
    'M-001': 0,
    'L-001': 0,
    'XL-001': 0,
  })
  const fileInput = useRef<HTMLInputElement>(null)

  const run = BAG_RUNS.find((item) => item.id === runId) ?? BAG_RUNS[2]
  const panels = useMemo(() => panelsForRun(run), [run])
  const panel = panels[panelKey]
  const soldCells = useMemo(() => new Set(run.soldByPanel[panelKey]), [run, panelKey])

  const panelSquares = panel.cols * panel.rows
  const panelSold = run.soldByPanel[panelKey].length
  const panelAvailable = panelSquares - panelSold
  const panelAvailability = Math.round((panelAvailable / panelSquares) * 100)

  const totalSold = PANEL_ORDER.reduce((sum, key) => sum + run.soldByPanel[key].length, 0)
  const totalAvailable = run.totalBagSquares - totalSold
  const totalAvailability = Math.round((totalAvailable / run.totalBagSquares) * 100)

  const previewBlocked = useMemo(
    () => Boolean(preview && rectCells(preview).some((key) => soldCells.has(key))),
    [preview, soldCells],
  )

  const selectedCount = selection
    ? (selection.right - selection.left + 1) * (selection.bottom - selection.top + 1)
    : 0

  const totalBoxes = Object.values(bagBoxes).reduce((sum, quantity) => sum + quantity, 0)
  const totalBags = totalBoxes * 250

  function changeBoxQuantity(id: string, delta: number) {
    setBagBoxes((current) => ({
      ...current,
      [id]: Math.max(0, (current[id] ?? 0) + delta),
    }))
  }

  function clearSelection() {
    setDragStart(null)
    setPreview(null)
    setSelection(null)
    setArtwork(null)
    setCheckoutOpen(false)
  }

  function changeRun(id: string) {
    setRunId(id)
    setPanelKey('front')
    clearSelection()
  }

  function changePanel(key: PanelKey) {
    setPanelKey(key)
    clearSelection()
  }

  function rotatePanel(direction: 1 | -1) {
    const index = PANEL_ORDER.indexOf(panelKey)
    const nextIndex = (index + direction + PANEL_ORDER.length) % PANEL_ORDER.length
    changePanel(PANEL_ORDER[nextIndex])
  }

  function startSelection(point: Point) {
    const key = `${point.row}-${point.col}`
    if (soldCells.has(key)) return
    const rect = makeRect(point, point)
    setDragStart(point)
    setPreview(rect)
  }

  function extendSelection(point: Point) {
    if (!dragStart) return
    setPreview(makeRect(dragStart, point))
  }

  function finishSelection(point?: Point) {
    if (!dragStart) return
    const finalPreview = point ? makeRect(dragStart, point) : preview
    if (!finalPreview) return

    const blocked = rectCells(finalPreview).some((key) => soldCells.has(key))
    if (!blocked) {
      setSelection(finalPreview)
      setPreview(finalPreview)
      setArtwork(null)
    }
    setDragStart(null)
  }

  function uploadArtwork(file?: File) {
    if (!file || !selection) return
    const reader = new FileReader()
    reader.onload = () => setArtwork(String(reader.result))
    reader.readAsDataURL(file)
  }

  return (
    <main>
      <header className="nav shell">
        <a className="brand" href="#" aria-label="freepack home">freepack.</a>
        <nav>
          <a href="#how">How it works</a>
          <a href="#bags">Free bags</a>
          <a href="#advertise">Advertise</a>
        </nav>
        <button className="button button-dark">Sign in</button>
      </header>

      <section className="hero shell">
        <div className="eyebrow">PACKAGING PAID FOR BY ADVERTISING</div>
        <h1>Takeaway bags.<br /><em>Completely free.</em></h1>
        <p>
          Restaurants get quality paper bags at no cost. Brands fund each production
          run by buying advertising space directly on the bags.
        </p>
        <div className="hero-actions">
          <a className="button button-dark" href="#takeaway-order">Get free bags <ArrowRight size={18} /></a>
          <a className="button button-light" href="#advertise">Buy ad space</a>
        </div>
      </section>

      <section className="split shell" id="how">
        <article className="card takeaway">
          <div className="icon"><PackageCheck /></div>
          <p className="kicker">FOR TAKEAWAYS</p>
          <h2>Order by the box.<br />Pay £0.</h2>
          <p>Choose the bag size you need and order available stock. Every takeaway receives the same shared campaign bags from that production run.</p>
          <a href="#bags">Get free packaging <ArrowRight size={16} /></a>
        </article>

        <article className="card advertiser">
          <div className="icon"><Megaphone /></div>
          <p className="kicker">FOR ADVERTISERS</p>
          <h2>Put your brand in<br />customers' hands.</h2>
          <p>Choose a run, pick a face of the bag, drag across available 3 cm × 3 cm units and upload your artwork.</p>
          <a href="#advertise">Try the selector <ArrowRight size={16} /></a>
        </article>
      </section>

      <section className="runs shell" id="bags">
        <div className="runs-heading">
          <div>
            <p className="kicker">OPEN ADVERTISING RUNS</p>
            <h2>Choose a bag size.</h2>
          </div>
          <p>Every size has its own advertising layout, while the price per 3 cm square stays the same.</p>
        </div>

        <div className="run-options">
          {BAG_RUNS.map((item) => {
            const sold = PANEL_ORDER.reduce((sum, key) => sum + item.soldByPanel[key].length, 0)
            const availability = Math.round(((item.totalBagSquares - sold) / item.totalBagSquares) * 100)

            return (
              <button
                key={item.id}
                className={`run-option ${runId === item.id ? 'active' : ''}`}
                onClick={() => {
                  changeRun(item.id)
                  document.getElementById('advertise')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <div className="run-option-top">
                  <span>{item.size}</span>
                  {runId === item.id && <Check size={17} />}
                </div>
                <strong>{item.dimensions}</strong>
                <div className="run-option-meta">
                  <span>{item.totalBagSquares} total bag squares</span>
                  <span>{availability}% available across full bag</span>
                </div>
                <div className="availability-track">
                  <i style={{ width: `${availability}%` }} />
                </div>
                <small><CalendarDays size={13} /> Est. start {item.estimatedStart}</small>
              </button>
            )
          })}
        </div>
      </section>

      <section className="takeaway-order shell" id="takeaway-order">
        <div className="takeaway-order-head">
          <div>
            <p className="kicker">FREE BAGS FOR TAKEAWAYS</p>
            <h2>Build your box order.</h2>
          </div>
          <div className="free-badge">£0 for the bags</div>
        </div>

        <div className="takeaway-layout">
          <div className="takeaway-products">
            {BAG_RUNS.map((item) => (
              <article className="takeaway-product" key={item.id}>
                <div className="mini-bag" style={{ aspectRatio: `${item.faceWidth} / ${item.height}` }}>
                  <span>{item.size}</span>
                </div>
                <div className="takeaway-product-copy">
                  <span className="takeaway-size">{item.size}</span>
                  <strong>{item.dimensions}</strong>
                  <small>250 bags per box · current shared design</small>
                </div>
                <div className="quantity-control" aria-label={`${item.size} box quantity`}>
                  <button onClick={() => changeBoxQuantity(item.id, -1)} disabled={!bagBoxes[item.id]}>
                    <Minus size={15} />
                  </button>
                  <strong>{bagBoxes[item.id]}</strong>
                  <button onClick={() => changeBoxQuantity(item.id, 1)}>
                    <Plus size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="takeaway-summary">
            <div className="summary-icon"><Truck size={21} /></div>
            <p className="kicker">YOUR ORDER</p>
            <div className="summary-number">{totalBoxes}</div>
            <span className="summary-label">box{totalBoxes === 1 ? '' : 'es'} · {totalBags.toLocaleString()} bags</span>

            <div className="summary-lines">
              {BAG_RUNS.filter((item) => bagBoxes[item.id] > 0).map((item) => (
                <div key={item.id}>
                  <span>{item.size}</span>
                  <strong>{bagBoxes[item.id]} × 250</strong>
                </div>
              ))}
              {totalBoxes === 0 && <p>Choose the bag sizes and number of boxes you need.</p>}
            </div>

            <div className="summary-total">
              <span>Bag cost</span>
              <strong>£0.00</strong>
            </div>
            <button className="button button-dark takeaway-continue" disabled={totalBoxes === 0}>
              Continue with order <ArrowRight size={17} />
            </button>
            <small className="summary-note">Business verification, availability and delivery details will be added when accounts are connected.</small>
          </aside>
        </div>
      </section>

      <section className="campaign shell" id="advertise">
        <div className="campaign-copy">
          <p className="kicker">INTERACTIVE AD SELECTOR</p>
          <h2>Choose the exact<br />space you want.</h2>
          <p className="muted">
            Select a bag face, then drag from one available square to another. Your
            advert can be any rectangular block that fits around space already sold.
          </p>

          <div className="run-switcher" aria-label="Choose bag run">
            {BAG_RUNS.map((item) => (
              <button
                key={item.id}
                className={runId === item.id ? 'active' : ''}
                onClick={() => changeRun(item.id)}
              >
                {item.size}
              </button>
            ))}
          </div>

          <div className="run-card">
            <div>
              <span className="run-label">CURRENT RUN</span>
              <strong>{run.size} bag · Run {run.id}</strong>
              <small>{run.dimensions}</small>
            </div>
            <span className="run-status"><i /> Selling</span>
          </div>

          <div className="surface-tabs" aria-label="Choose bag face">
            {PANEL_ORDER.map((key) => {
              const face = panels[key]
              const sold = run.soldByPanel[key].length
              const available = face.cols * face.rows - sold
              return (
                <button
                  key={key}
                  className={panelKey === key ? 'active' : ''}
                  onClick={() => changePanel(key)}
                >
                  <span>{face.shortLabel}</span>
                  <small>{available} free</small>
                </button>
              )
            })}
          </div>

          <div className="run-facts">
            <span><strong>{panelAvailability}%</strong> {panel.label.toLowerCase()} available</span>
            <span><strong>{totalAvailability}%</strong> whole bag available</span>
            <span><strong>{run.estimatedStart}</strong> estimated start</span>
          </div>

          <div className="quote-card">
            <div className="quote-row">
              <span>Bag face</span>
              <strong>{panel.label}</strong>
            </div>
            <div className="quote-row">
              <span>Selected shape</span>
              <strong>{shapeLabel(selection)}</strong>
            </div>
            <div className="quote-row">
              <span>3 cm squares</span>
              <strong>{selectedCount}</strong>
            </div>
            <div className="quote-row">
              <span>Demo price / square</span>
              <strong>£{DEMO_SQUARE_PRICE}</strong>
            </div>
            <div className="quote-total">
              <span>Demo total</span>
              <strong>£{(selectedCount * DEMO_SQUARE_PRICE).toLocaleString()}</strong>
            </div>
            <small>Pricing is still a prototype value. The same square price will apply across every bag size and face.</small>
          </div>

          <div className="selector-actions">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              hidden
              onChange={(event) => uploadArtwork(event.target.files?.[0])}
            />
            <button
              className="button upload-button"
              disabled={!selection}
              onClick={() => fileInput.current?.click()}
            >
              <ImagePlus size={18} />
              {artwork ? 'Change artwork' : 'Upload artwork'}
            </button>
            <button className="reset-button" onClick={clearSelection} disabled={!selection && !preview}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>

          <button
            className="button checkout-button"
            disabled={!selection || !artwork}
            onClick={() => setCheckoutOpen(true)}
          >
            Review & continue <ArrowRight size={17} />
          </button>
          {!artwork && selection && <p className="checkout-hint">Upload artwork to continue.</p>}
        </div>

        <div className="bag-wrap">
          <div className="surface-control">
            <button onClick={() => rotatePanel(-1)} aria-label="Previous bag face"><ArrowLeft size={17} /></button>
            <span>{panel.label}</span>
            <button onClick={() => rotatePanel(1)} aria-label="Next bag face"><ArrowRight size={17} /></button>
          </div>

          <div
            className={`bag bag-${panelKey}`}
            style={{
              aspectRatio: `${panel.widthMm} / ${run.height}`,
              width: `min(${Math.max(235, Math.min(455, panel.widthMm * 1.8))}px, 100%)`,
            }}
          >
            <div className="bag-label"><Box size={16} /> {run.size.toUpperCase()} · {run.id} · {panel.label.toUpperCase()}</div>

            <div
              className="grid"
              aria-label={`${panel.label} advertising grid selector`}
              onPointerLeave={() => dragStart && setDragStart(null)}
              style={{
                gridTemplateColumns: `repeat(${panel.cols}, 1fr)`,
                gridTemplateRows: `repeat(${panel.rows}, 1fr)`,
              }}
            >
              {Array.from({ length: panel.rows * panel.cols }, (_, index) => {
                const row = Math.floor(index / panel.cols)
                const col = index % panel.cols
                const key = `${row}-${col}`
                const sold = soldCells.has(key)
                const inPreview = Boolean(
                  preview &&
                  row >= preview.top &&
                  row <= preview.bottom &&
                  col >= preview.left &&
                  col <= preview.right,
                )

                return (
                  <button
                    key={key}
                    className={[
                      'grid-cell',
                      sold ? 'sold' : 'available',
                      inPreview ? (previewBlocked ? 'blocked-preview' : 'selection-preview') : '',
                    ].join(' ')}
                    aria-label={sold ? 'Sold advertising space' : `Available advertising space row ${row + 1}, column ${col + 1}`}
                    onPointerDown={(event) => {
                      event.preventDefault()
                      startSelection({ row, col })
                    }}
                    onPointerEnter={() => extendSelection({ row, col })}
                    onPointerUp={(event) => {
                      event.preventDefault()
                      finishSelection({ row, col })
                    }}
                  >
                    {sold ? <><Check size={11} /> SOLD</> : '+'}
                  </button>
                )
              })}

              {selection && (
                <div
                  className={`artwork-overlay ${artwork ? 'has-artwork' : ''}`}
                  style={{
                    gridColumn: `${selection.left + 1} / ${selection.right + 2}`,
                    gridRow: `${selection.top + 1} / ${selection.bottom + 2}`,
                    backgroundImage: artwork ? `url("${artwork}")` : undefined,
                  }}
                >
                  {!artwork && (
                    <span>
                      {shapeLabel(selection)}
                      <small>{selectedCount} square{selectedCount === 1 ? '' : 's'}</small>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="bag-key">
              <span><i className="key-available" /> Available</span>
              <span><i className="key-sold" /> Sold</span>
              <span><i className="key-selected" /> Your space</span>
            </div>
          </div>

          <div className="panel-map" aria-label="Bag face overview">
            {PANEL_ORDER.map((key) => {
              const face = panels[key]
              const sold = run.soldByPanel[key].length
              const total = face.cols * face.rows
              return (
                <button
                  key={key}
                  className={panelKey === key ? 'active' : ''}
                  onClick={() => changePanel(key)}
                >
                  <span>{face.shortLabel}</span>
                  <strong>{total - sold}/{total}</strong>
                </button>
              )
            })}
          </div>

          {previewBlocked && dragStart && (
            <div className="selection-warning">That rectangle includes space already sold.</div>
          )}
          <p className="bag-help">
            All four printable faces are now live. Switching face clears the current draft selection.
          </p>
        </div>
      </section>

      {checkoutOpen && selection && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setCheckoutOpen(false)}>
          <section
            className="checkout-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Review advertising space"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setCheckoutOpen(false)} aria-label="Close review">
              <X size={20} />
            </button>

            <div className="checkout-icon"><ShoppingBag size={22} /></div>
            <p className="kicker">REVIEW YOUR AD SPACE</p>
            <h2>{run.size} bag · {panel.label}</h2>
            <p className="checkout-intro">
              Check the space and artwork before moving to account details and payment.
            </p>

            <div className="checkout-preview">
              <div
                className="checkout-art"
                style={{ backgroundImage: artwork ? `url("${artwork}")` : undefined }}
              />
              <div>
                <span>Run</span>
                <strong>{run.id}</strong>
                <span>Estimated start</span>
                <strong>{run.estimatedStart}</strong>
              </div>
            </div>

            <div className="checkout-lines">
              <div><span>Bag size</span><strong>{run.size}</strong></div>
              <div><span>Bag face</span><strong>{panel.label}</strong></div>
              <div><span>Ad shape</span><strong>{shapeLabel(selection)}</strong></div>
              <div><span>3 cm squares</span><strong>{selectedCount}</strong></div>
              <div><span>Prototype price</span><strong>£{(selectedCount * DEMO_SQUARE_PRICE).toLocaleString()}</strong></div>
            </div>

            <div className="checkout-notice">
              This is the prototype checkout flow. Live reservations, advertiser accounts and payment will be connected to the backend next.
            </div>

            <button className="button button-dark modal-primary" onClick={() => setCheckoutOpen(false)}>
              Looks good
            </button>
          </section>
        </div>
      )}

      <footer className="shell">
        <span className="brand">freepack.</span>
        <span>Free packaging. Paid for by advertising.</span>
      </footer>
    </main>
  )
}
