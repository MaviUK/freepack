import { useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Box,
  Check,
  ImagePlus,
  Megaphone,
  PackageCheck,
  RotateCcw,
} from 'lucide-react'

const COLS = 6
const ROWS = 8
const DEMO_SQUARE_PRICE = 192

const soldCells = new Set([
  '0-4', '0-5',
  '1-4', '1-5',
  '3-0', '3-1',
  '4-0', '4-1',
  '6-4', '6-5',
  '7-4', '7-5',
])

type Point = { row: number; col: number }
type Rect = { top: number; left: number; bottom: number; right: number }

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

export default function App() {
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [preview, setPreview] = useState<Rect | null>(null)
  const [selection, setSelection] = useState<Rect | null>(null)
  const [artwork, setArtwork] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const previewBlocked = useMemo(
    () => Boolean(preview && rectCells(preview).some((key) => soldCells.has(key))),
    [preview],
  )

  const selectedCount = selection
    ? (selection.right - selection.left + 1) * (selection.bottom - selection.top + 1)
    : 0

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

  function finishSelection() {
    if (!dragStart || !preview) return
    if (!previewBlocked) {
      setSelection(preview)
      setArtwork(null)
    }
    setDragStart(null)
  }

  function resetSelection() {
    setDragStart(null)
    setPreview(null)
    setSelection(null)
    setArtwork(null)
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
          <button className="button button-dark">Get free bags <ArrowRight size={18} /></button>
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
          <p>Choose a run, drag across available 3 cm × 3 cm units to create a rectangular ad, upload your artwork and preview it on the bag.</p>
          <a href="#advertise">Try the selector <ArrowRight size={16} /></a>
        </article>
      </section>

      <section className="campaign shell" id="advertise">
        <div className="campaign-copy">
          <p className="kicker">INTERACTIVE AD SELECTOR</p>
          <h2>Choose the exact<br />space you want.</h2>
          <p className="muted">
            Drag from one available square to another. Your selection can be 1×1,
            1×3, 2×2, 2×3 or any other rectangular block that fits around sold space.
          </p>

          <div className="run-card">
            <div>
              <span className="run-label">CURRENT DEMO RUN</span>
              <strong>Large bag · Run 001</strong>
            </div>
            <span className="run-status"><i /> Selling</span>
          </div>

          <div className="quote-card">
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
            <small>Pricing is a prototype value and can be changed per production run later.</small>
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
            <button className="reset-button" onClick={resetSelection} disabled={!selection && !preview}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </div>

        <div className="bag-wrap">
          <div className="bag">
            <div className="bag-handle" />
            <div className="bag-label"><Box size={16} /> LARGE · RUN 001 · FRONT</div>

            <div
              className="grid"
              aria-label="Advertising grid selector"
              onPointerUp={finishSelection}
              onPointerLeave={() => dragStart && setDragStart(null)}
              style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
            >
              {Array.from({ length: ROWS * COLS }, (_, index) => {
                const row = Math.floor(index / COLS)
                const col = index % COLS
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
                      extendSelection({ row, col })
                      finishSelection()
                    }}
                  >
                    {sold ? <><Check size={13} /> SOLD</> : '+'}
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
          {previewBlocked && dragStart && (
            <div className="selection-warning">That rectangle includes space already sold.</div>
          )}
          <p className="bag-help">Drag across available squares to build your advert.</p>
        </div>
      </section>

      <footer className="shell">
        <span className="brand">freepack.</span>
        <span>Free packaging. Paid for by advertising.</span>
      </footer>
    </main>
  )
}
