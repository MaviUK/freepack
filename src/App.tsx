import { ArrowRight, Box, Megaphone, PackageCheck } from 'lucide-react'

const cells = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  state: [2, 3, 4, 8, 9, 14].includes(index) ? 'sold' : 'available',
}))

export default function App() {
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
          Restaurants get quality paper bags at no cost. Local and national brands
          fund each production run by advertising directly on the bags.
        </p>
        <div className="hero-actions">
          <button className="button button-dark">Get free bags <ArrowRight size={18} /></button>
          <button className="button button-light">Buy ad space</button>
        </div>
      </section>

      <section className="split shell" id="how">
        <article className="card takeaway">
          <div className="icon"><PackageCheck /></div>
          <p className="kicker">FOR TAKEAWAYS</p>
          <h2>Order by the box.<br />Pay £0.</h2>
          <p>Choose the bag size you need, order available stock and we deliver the same shared campaign bags to participating food businesses.</p>
          <a href="#bags">Get free packaging <ArrowRight size={16} /></a>
        </article>

        <article className="card advertiser">
          <div className="icon"><Megaphone /></div>
          <p className="kicker">FOR ADVERTISERS</p>
          <h2>Put your brand in<br />customers' hands.</h2>
          <p>Choose a production run, select available 3 cm × 3 cm grid units and build a rectangular advertising block that fits your campaign.</p>
          <a href="#advertise">View ad space <ArrowRight size={16} /></a>
        </article>
      </section>

      <section className="campaign shell" id="advertise">
        <div>
          <p className="kicker">LIVE CAMPAIGN PREVIEW</p>
          <h2>Select your space<br />directly on the bag.</h2>
          <p className="muted">This first prototype shows how sold and available advertising units will work. Artwork upload and live bag preview come next.</p>
          <div className="stats">
            <div><strong>3×3 cm</strong><span>per unit</span></div>
            <div><strong>Any rectangle</strong><span>1×1, 1×2, 2×3…</span></div>
            <div><strong>Per run</strong><span>one shared bag design</span></div>
          </div>
        </div>

        <div className="bag-wrap">
          <div className="bag">
            <div className="bag-handle" />
            <div className="bag-label"><Box size={16} /> LARGE · RUN 001</div>
            <div className="grid" aria-label="Advertising grid preview">
              {cells.map((cell) => (
                <button
                  key={cell.id}
                  className={`grid-cell ${cell.state}`}
                  aria-label={cell.state === 'sold' ? 'Sold space' : 'Available space'}
                >
                  {cell.state === 'sold' ? 'SOLD' : '+'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="shell">
        <span className="brand">freepack.</span>
        <span>Free packaging. Paid for by advertising.</span>
      </footer>
    </main>
  )
}
