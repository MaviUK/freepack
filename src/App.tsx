import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Box,
  CalendarDays,
  Check,
  Download,
  ImagePlus,
  Megaphone,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  ShoppingBag,
  Truck,
  UserRound,
  WalletCards,
  ShieldCheck,
  X,
} from 'lucide-react'
import JSZip from 'jszip'
import Bag3D, { type BagSponsorArtwork } from './Bag3D'
import { supabase } from './supabase'

const DEMO_SQUARE_PRICE = 192
const BAG_DISPLAY_SCALE = 1.25
const MINI_BAG_MAX_HEIGHT = 86

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

type AdminBooking = {
  id: string
  status: string
  artwork_review_status: string
  artwork_review_notes: string | null
  artwork_path: string | null
  panel: PanelKey
  top_row: number
  left_col: number
  width_cells: number
  height_cells: number
  square_count: number
  total_pence: number
  created_at: string
  profiles: { display_name: string | null } | { display_name: string | null }[] | null
  production_runs: {
    id: string
    run_code: string
    status: string
    status_updated_at: string
    status_note: string | null
    estimated_stage_date: string | null
    bag_sizes: { name: string; total_square_count: number } | { name: string; total_square_count: number }[] | null
  } | {
    id: string
    run_code: string
    status: string
    status_updated_at: string
    status_note: string | null
    estimated_stage_date: string | null
    bag_sizes: { name: string; total_square_count: number } | { name: string; total_square_count: number }[] | null
  }[] | null
}

type AdminOrder = {
  id: string
  status: string
  created_at: string
  shipping_pence: number
  shipping_paid_at: string | null
  takeaway_businesses: {
    business_name: string
    postcode: string | null
  } | {
    business_name: string
    postcode: string | null
  }[] | null
  takeaway_order_items: Array<{
    boxes: number
    bags_per_box: number
  }>
}

type AdminRun = {
  id: string
  run_code: string
  status: string
  status_updated_at: string
  status_note: string | null
  estimated_stage_date: string | null
  estimated_start_date: string | null
  price_per_square_pence: number
  bag_quantity: number | null
  bag_sizes: {
    name: string
    total_square_count: number
    front_width_mm: number
    side_gusset_mm: number
    height_mm: number
    front_cols: number
    front_rows: number
    side_cols: number
    side_rows: number
  } | {
    name: string
    total_square_count: number
    front_width_mm: number
    side_gusset_mm: number
    height_mm: number
    front_cols: number
    front_rows: number
    side_cols: number
    side_rows: number
  }[] | null
}

type AccountBooking = {
  id: string
  status: string
  artwork_path: string | null
  artwork_review_status: string
  artwork_review_notes: string | null
  panel: PanelKey
  square_count: number
  total_pence: number
  reserved_until: string | null
  paid_at: string | null
  created_at: string
  production_runs: {
    id: string
    run_code: string
    status: string
    status_updated_at: string
    status_note: string | null
    estimated_stage_date: string | null
    bag_sizes: { name: string; total_square_count: number } | { name: string; total_square_count: number }[] | null
  } | {
    id: string
    run_code: string
    status: string
    status_updated_at: string
    status_note: string | null
    estimated_stage_date: string | null
    bag_sizes: { name: string; total_square_count: number } | { name: string; total_square_count: number }[] | null
  }[] | null
}

type PaymentSuccess = {
  id: string
  status: string
  panel: PanelKey
  width_cells: number
  height_cells: number
  square_count: number
  total_pence: number
  paid_at: string | null
  artwork_review_status: string
  production_runs: {
    id: string
    run_code: string
    status: string
    status_updated_at: string
    status_note: string | null
    estimated_stage_date: string | null
    bag_sizes: { name: string; total_square_count: number } | { name: string; total_square_count: number }[] | null
  } | {
    id: string
    run_code: string
    status: string
    status_updated_at: string
    status_note: string | null
    estimated_stage_date: string | null
    bag_sizes: { name: string; total_square_count: number } | { name: string; total_square_count: number }[] | null
  }[] | null
}

type AccountOrder = {
  id: string
  status: string
  created_at: string
  submitted_at: string | null
  shipping_pence: number
  shipping_paid_at: string | null
  takeaway_businesses: { business_name: string } | { business_name: string }[] | null
  takeaway_order_items: Array<{
    boxes: number
    bags_per_box: number
    production_runs: {
      run_code: string
      bag_sizes: { name: string } | { name: string }[] | null
    } | {
      run_code: string
      bag_sizes: { name: string } | { name: string }[] | null
    }[] | null
  }>
}

type BagRun = {
  id: string
  dbId?: string
  size: 'Small' | 'Medium' | 'Large' | 'XL'
  dimensions: string
  faceWidth: number
  sideWidth: number
  height: number
  totalBagSquares: number
  estimatedStart: string
  pricePerSquarePence?: number
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
    totalBagSquares: 160,
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
    totalBagSquares: 186,
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
  const rows = rect.bottom - rect.top + 1
  const cols = rect.right - rect.left + 1
  return `${rows} × ${cols}`
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function gridCount(widthMm: number, heightMm: number) {
  const cols = Math.floor((widthMm - 20 + 3) / 33)
  const rows = Math.floor((heightMm - 20 + 3) / 33)
  return { cols: Math.max(1, cols), rows: Math.max(1, rows) }
}

function panelsForRun(run: BagRun): Record<PanelKey, PanelConfig> {
  const defaultFace = gridCount(run.faceWidth, run.height)
  const face = run.size === 'Medium'
    ? { cols: 5, rows: 10 }
    : run.size === 'Large'
      ? { cols: 6, rows: 10 }
      : defaultFace

  const defaultSide = gridCount(run.sideWidth, run.height)
  const side = run.size === 'Medium'
    ? { cols: 3, rows: 10 }
    : run.size === 'Large'
      ? { cols: 3, rows: 11 }
      : defaultSide

  return {
    front: { label: 'Front', shortLabel: 'Front', cols: face.cols, rows: face.rows, widthMm: run.faceWidth },
    right: { label: 'Right side', shortLabel: 'Right', cols: side.cols, rows: side.rows, widthMm: run.sideWidth },
    back: { label: 'Back', shortLabel: 'Back', cols: face.cols, rows: face.rows, widthMm: run.faceWidth },
    left: { label: 'Left side', shortLabel: 'Left', cols: side.cols, rows: side.rows, widthMm: run.sideWidth },
  }
}

const BRAND_ROWS_BY_SIZE: Record<BagRun['size'], number[]> = {
  // All sizes now keep the centred Freepack logo in a compact gap between
  // upper and lower advert rows instead of sacrificing sellable rows.
  Small: [],
  Medium: [],
  Large: [],
  XL: [],
}

const BRAND_GAP_AFTER_ROW_BY_SIZE: Record<BagRun['size'], number | null> = {
  Small: 3,
  Medium: 4,
  Large: 4,
  XL: 5,
}

function brandRowsForRun(run: BagRun) {
  return BRAND_ROWS_BY_SIZE[run.size]
}

function brandRowsByPanelForRun(run: BagRun): Record<PanelKey, number[]> {
  const rows = brandRowsForRun(run)
  return {
    front: rows,
    right: [],
    back: rows,
    left: [],
  }
}

function brandGapAfterRowByPanelForRun(run: BagRun): Record<PanelKey, number | null> {
  const gapAfterRow = BRAND_GAP_AFTER_ROW_BY_SIZE[run.size]
  return {
    front: gapAfterRow,
    right: null,
    back: gapAfterRow,
    left: null,
  }
}

function cellRow(key: string) {
  return Number(key.split('-', 1)[0])
}

const RUN_PROGRESS = [
  { key: 'selling', label: 'Recruiting advertisers' },
  { key: 'funded', label: 'Advertising sold' },
  { key: 'artwork_review', label: 'Artwork approval' },
  { key: 'sent_to_print', label: 'Sent for print' },
  { key: 'printing', label: 'Printing' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'in_stock', label: 'In stock' },
  { key: 'distributing', label: 'Distribution' },
  { key: 'completed', label: 'Completed' },
] as const

function runProgressStep(status: string) {
  const index = RUN_PROGRESS.findIndex((item) => item.key === status)
  return index >= 0 ? index : 0
}

export default function App() {
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/'
  const isAdminRoute = currentPath === '/admin'
  const adminOpen = isAdminRoute

  const [runs, setRuns] = useState<BagRun[]>(BAG_RUNS)
  const [runsLoading, setRunsLoading] = useState(true)
  const [runId, setRunId] = useState('L-001')
  const [sponsorArtwork, setSponsorArtwork] = useState<BagSponsorArtwork[]>([])
  const [sponsorArtworkRefresh, setSponsorArtworkRefresh] = useState(0)
  const [panelKey, setPanelKey] = useState<PanelKey>('front')
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [preview, setPreview] = useState<Rect | null>(null)
  const [selection, setSelection] = useState<Rect | null>(null)
  const [placementMessage, setPlacementMessage] = useState('')
  const [artwork, setArtwork] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authReturnTo, setAuthReturnTo] = useState<'advertiser' | 'takeaway' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [artworkFile, setArtworkFile] = useState<File | null>(null)
  const [reservationLoading, setReservationLoading] = useState(false)
  const [reservationMessage, setReservationMessage] = useState('')
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [paymentBanner, setPaymentBanner] = useState('')
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null)
  const [cancelledBookingId, setCancelledBookingId] = useState<string | null>(null)
  const [cancelledPaymentReturn, setCancelledPaymentReturn] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccess | null>(null)
  const [paymentSuccessSales, setPaymentSuccessSales] = useState<{ sold: number; capacity: number } | null>(null)
  const [paymentSuccessOpen, setPaymentSuccessOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountLoading, setAccountLoading] = useState(false)
  const [accountBookings, setAccountBookings] = useState<AccountBooking[]>([])
  const [accountArtworkUrls, setAccountArtworkUrls] = useState<Record<string, string>>({})
  const [accountRunSales, setAccountRunSales] = useState<Record<string, { sold: number; reserved: number }>>({})
  const [replacementUploading, setReplacementUploading] = useState<string | null>(null)
  const [accountOrders, setAccountOrders] = useState<AccountOrder[]>([])
  const [accountError, setAccountError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminSection, setAdminSection] = useState<'overview' | 'advertising' | 'artwork' | 'production' | 'orders'>('overview')
  const [adminSearch, setAdminSearch] = useState('')
  const [adminBookingFilter, setAdminBookingFilter] = useState('all')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminMessage, setAdminMessage] = useState('')
  const [adminBookings, setAdminBookings] = useState<AdminBooking[]>([])
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([])
  const [adminRuns, setAdminRuns] = useState<AdminRun[]>([])
  const [shippingPricePence, setShippingPricePence] = useState(0)
  const [takeawayPaymentSessionId, setTakeawayPaymentSessionId] = useState<string | null>(null)
  const [adminRunSales, setAdminRunSales] = useState<Record<string, { sold: number; reserved: number }>>({})
  const [adminExportingRun, setAdminExportingRun] = useState<string | null>(null)
  const [adminArtworkUrls, setAdminArtworkUrls] = useState<Record<string, string>>({})
  const [takeawayCheckoutOpen, setTakeawayCheckoutOpen] = useState(false)
  const [takeawaySubmitting, setTakeawaySubmitting] = useState(false)
  const [takeawayMessage, setTakeawayMessage] = useState('')
  const [takeawayOrderId, setTakeawayOrderId] = useState<string | null>(null)
  const [takeawayDetails, setTakeawayDetails] = useState({
    businessName: '',
    phone: '',
    address1: '',
    address2: '',
    townCity: '',
    postcode: '',
    deliveryNotes: '',
  })
  const [bagBoxes, setBagBoxes] = useState<Record<string, number>>({
    'S-001': 0,
    'M-001': 0,
    'L-001': 0,
    'XL-001': 0,
  })
  const fileInput = useRef<HTMLInputElement>(null)

  const run = runs.find((item) => item.id === runId) ?? runs[0] ?? BAG_RUNS[2]
  const panels = useMemo(() => panelsForRun(run), [run])
  const brandRowsByPanel = useMemo(() => brandRowsByPanelForRun(run), [run])
  const brandGapAfterRowByPanel = useMemo(() => brandGapAfterRowByPanelForRun(run), [run])
  const panel = panels[panelKey]
  const panelBrandRows = brandRowsByPanel[panelKey]
  const soldCells = useMemo(() => new Set(run.soldByPanel[panelKey]), [run, panelKey])

  const panelSquares = panel.cols * panel.rows
  const panelBrandSquares = panelBrandRows.length * panel.cols
  const panelSellableSquares = panelSquares - panelBrandSquares
  const panelSold = run.soldByPanel[panelKey].filter((key) => !panelBrandRows.includes(cellRow(key))).length
  const panelAvailable = panelSellableSquares - panelSold
  const panelAvailability = panelSellableSquares > 0
    ? Math.round((panelAvailable / panelSellableSquares) * 100)
    : 0

  const totalSold = PANEL_ORDER.reduce(
    (sum, key) => sum + run.soldByPanel[key].filter((cell) => !brandRowsByPanel[key].includes(cellRow(cell))).length,
    0,
  )
  const totalAvailable = run.totalBagSquares - totalSold
  const totalAvailability = run.totalBagSquares > 0
    ? Math.round((totalAvailable / run.totalBagSquares) * 100)
    : 0
  const squarePricePence = run.pricePerSquarePence ?? DEMO_SQUARE_PRICE * 100

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const payment = params.get('payment')
    const shippingPayment = params.get('shipping_payment')
    const sessionId = params.get('session_id')
    const bookingId = params.get('booking_id')
    const confirmToken = params.get('confirm_token')
    const confirmType = params.get('confirm_type')
    const resetToken = params.get('reset_token')
    const resetType = params.get('reset_type')
    setPaymentSessionId(payment ? sessionId : null)
    setTakeawayPaymentSessionId(shippingPayment === 'success' ? sessionId : null)
    setCancelledBookingId(payment === 'cancelled' ? bookingId : null)
    setCancelledPaymentReturn(payment === 'cancelled')

    if (shippingPayment === 'success') {
      setPaymentBanner('Delivery payment received. Confirming your free bag order…')
    } else if (shippingPayment === 'cancelled') {
      setPaymentBanner('Delivery payment was cancelled. Your order has not been submitted yet.')
    }

    async function startPasswordReset() {
      if (!resetToken) return

      const { error } = await supabase.auth.verifyOtp({
        token_hash: resetToken,
        type: (resetType || 'recovery') as 'recovery',
      })

      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('reset_token')
      cleanUrl.searchParams.delete('reset_type')
      window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash)

      if (error) {
        setPaymentBanner('That password reset link is invalid or has expired.')
        return
      }

      setAuthPassword('')
      setAuthConfirmPassword('')
      setAuthMode('reset')
      setAuthOpen(true)
      setAuthMessage('Choose a new password for your FreePack account.')
    }

    void startPasswordReset()

    async function confirmEmailFromProductionLink() {
      if (!confirmToken) return

      const { error } = await supabase.auth.verifyOtp({
        token_hash: confirmToken,
        type: (confirmType || 'email') as 'email',
      })

      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('confirm_token')
      cleanUrl.searchParams.delete('confirm_type')
      window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash)

      if (error) {
        setPaymentBanner('That confirmation link is invalid or has expired. Please create the account again.')
      } else {
        setPaymentBanner('Email confirmed. Your FreePack account is ready.')
      }
    }

    void confirmEmailFromProductionLink()

    if (payment === 'success') {
      setPaymentBanner('Payment received. Confirming your advertising space…')
    } else if (payment === 'cancelled') {
      setPaymentBanner('Payment was cancelled. Restoring your reserved advertising space so you can try again…')
    }

    async function syncAuthState() {
      const { data } = await supabase.auth.getClaims()
      const id = data?.claims?.sub ?? null
      setUserId(id)

      if (!id) {
        setIsAdmin(false)
        setAuthChecked(true)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', id)
        .maybeSingle()

      setIsAdmin(profile?.account_type === 'admin')
      setAuthChecked(true)
    }

    syncAuthState()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async () => {
      await syncAuthState()
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPlatformSettings() {
      const { data } = await supabase
        .from('platform_settings')
        .select('shipping_price_pence')
        .eq('id', 'default')
        .maybeSingle()

      if (!cancelled) setShippingPricePence(data?.shipping_price_pence ?? 0)
    }

    void loadPlatformSettings()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('freepack-ad-cells')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ad_cells' },
        (payload) => {
          const row = (payload.new ?? payload.old) as {
            production_run_id?: string
            panel?: PanelKey
            row_index?: number
            col_index?: number
            status?: string
          }

          if (!row.production_run_id || !row.panel || row.row_index == null || row.col_index == null) return

          const changedPanel = row.panel
          const cellKey = `${row.row_index}-${row.col_index}`
          const isAvailable = row.status === 'available'

          setRuns((current) => current.map((item) => {
            if (item.dbId !== row.production_run_id) return item

            const nextPanel = new Set(item.soldByPanel[changedPanel])
            if (isAvailable) nextPanel.delete(cellKey)
            else nextPanel.add(cellKey)

            return {
              ...item,
              soldByPanel: {
                ...item.soldByPanel,
                [changedPanel]: Array.from(nextPanel),
              },
            }
          }))

          setSponsorArtworkRefresh((current) => current + 1)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('freepack-production-runs')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'production_runs' },
        async (payload) => {
          const row = payload.new as {
            id?: string
            status?: string
            status_updated_at?: string
            status_note?: string | null
            estimated_stage_date?: string | null
          }

          if (!row.id) return

          setAccountBookings((current) => current.map((booking) => {
            const relation = firstRelation(booking.production_runs)
            if (!relation || relation.id !== row.id) return booking

            const nextRelation = {
              ...relation,
              status: row.status ?? relation.status,
              status_updated_at: row.status_updated_at ?? relation.status_updated_at,
              status_note: row.status_note ?? null,
              estimated_stage_date: row.estimated_stage_date ?? null,
            }

            return { ...booking, production_runs: nextRelation }
          }))

          setPaymentSuccess((current) => {
            if (!current) return current
            const relation = firstRelation(current.production_runs)
            if (!relation || relation.id !== row.id) return current

            return {
              ...current,
              production_runs: {
                ...relation,
                status: row.status ?? relation.status,
                status_updated_at: row.status_updated_at ?? relation.status_updated_at,
                status_note: row.status_note ?? null,
                estimated_stage_date: row.estimated_stage_date ?? null,
              },
            }
          })

          setAdminRuns((current) => current.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  status: row.status ?? item.status,
                  status_updated_at: row.status_updated_at ?? item.status_updated_at,
                  status_note: row.status_note ?? null,
                  estimated_stage_date: row.estimated_stage_date ?? null,
                }
              : item,
          ))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('freepack-booking-reviews')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ad_bookings', filter: `user_id=eq.${userId}` },
        async (payload) => {
          const row = payload.new as {
            id?: string
            artwork_path?: string | null
            artwork_review_status?: string
            artwork_review_notes?: string | null
          }

          if (!row.id) return

          setAccountBookings((current) => current.map((booking) =>
            booking.id === row.id
              ? {
                  ...booking,
                  artwork_path: row.artwork_path ?? booking.artwork_path,
                  artwork_review_status: row.artwork_review_status ?? booking.artwork_review_status,
                  artwork_review_notes: row.artwork_review_notes ?? null,
                }
              : booking,
          ))

          if (row.artwork_path) {
            const { data } = await supabase.storage
              .from('ad-artwork')
              .createSignedUrl(row.artwork_path, 300)

            if (data?.signedUrl) {
              setAccountArtworkUrls((current) => ({
                ...current,
                [row.id!]: data.signedUrl,
              }))
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    if (!userId || !paymentSessionId) return

    const sessionId = paymentSessionId
    let cancelled = false
    let attempts = 0
    let timer: number | undefined

    async function confirmPayment() {
      attempts += 1

      const { data, error } = await supabase
        .from('ad_bookings')
        .select(`
          id,
          status,
          panel,
          width_cells,
          height_cells,
          square_count,
          total_pence,
          paid_at,
          artwork_review_status,
          production_runs (
            id,
            run_code,
            status,
            bag_sizes (name, total_square_count)
          )
        `)
        .eq('stripe_checkout_session_id', sessionId)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        setPaymentBanner('Payment was received by Stripe. Sign in later to check the booking status.')
        return
      }

      if (data?.status === 'paid') {
        const confirmed = data as unknown as PaymentSuccess
        setPaymentSuccess(confirmed)

        const runRelation = firstRelation(confirmed.production_runs)
        const bagRelation = firstRelation(runRelation?.bag_sizes)

        if (runRelation?.id) {
          const { data: cells } = await supabase
            .from('ad_cells')
            .select('status')
            .eq('production_run_id', runRelation.id)

          const sold = (cells ?? []).filter((cell) => cell.status === 'sold').length
          setPaymentSuccessSales({
            sold,
            capacity: bagRelation?.total_square_count ?? (cells?.length ?? 0),
          })
        } else {
          setPaymentSuccessSales(null)
        }

        setPaymentBanner('')
        setPaymentSuccessOpen(true)
        window.history.replaceState({}, '', `${window.location.pathname}#advertise`)
        return
      }

      if (attempts < 6) {
        timer = window.setTimeout(confirmPayment, 1500)
      } else {
        setPaymentBanner('Payment received. Confirmation is taking a little longer than expected; it will appear in your account shortly.')
      }
    }

    confirmPayment()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [userId, paymentSessionId])

  useEffect(() => {
    if (!userId || !takeawayPaymentSessionId) return

    const sessionId = takeawayPaymentSessionId
    let cancelled = false
    let attempts = 0
    let timer: number | undefined

    async function confirmTakeawayPayment() {
      attempts += 1

      const { data, error } = await supabase
        .from('takeaway_orders')
        .select('id,status,shipping_paid_at')
        .eq('stripe_checkout_session_id', sessionId)
        .maybeSingle()

      if (cancelled) return

      if (!error && data?.shipping_paid_at && data.status === 'submitted') {
        setTakeawayOrderId(data.id)
        setTakeawayCheckoutOpen(true)
        setTakeawayMessage('Delivery paid. Your free bag order has been submitted.')
        setBagBoxes((current) => Object.fromEntries(Object.keys(current).map((key) => [key, 0])))
        setPaymentBanner('')
        const cleanUrl = new URL(window.location.href)
        cleanUrl.searchParams.delete('shipping_payment')
        cleanUrl.searchParams.delete('session_id')
        window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash)
        return
      }

      if (attempts < 6) {
        timer = window.setTimeout(confirmTakeawayPayment, 1500)
      } else {
        setPaymentBanner('Delivery payment was received. Your order will appear in your account shortly.')
      }
    }

    void confirmTakeawayPayment()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [userId, takeawayPaymentSessionId])

  useEffect(() => {
    if (!accountOpen || !userId) return

    let cancelled = false

    async function loadAccountData() {
      setAccountLoading(true)
      setAccountError('')
      setAccountArtworkUrls({})

      const [bookingsResult, ordersResult] = await Promise.all([
        supabase
          .from('ad_bookings')
          .select(`
            id,
            status,
            artwork_path,
            artwork_review_status,
            artwork_review_notes,
            panel,
            square_count,
            total_pence,
            reserved_until,
            paid_at,
            created_at,
            production_runs (
              id,
              run_code,
              status,
              status_updated_at,
              status_note,
              estimated_stage_date,
              bag_sizes (name, total_square_count)
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('takeaway_orders')
          .select(`
            id,
            status,
            created_at,
            shipping_pence,
            shipping_paid_at,
            submitted_at,
            shipping_pence,
            shipping_paid_at,
            takeaway_businesses (business_name),
            takeaway_order_items (
              boxes,
              bags_per_box,
              production_runs (
                run_code,
                bag_sizes (name)
              )
            )
          `)
          .order('created_at', { ascending: false }),
      ])

      if (cancelled) return

      if (bookingsResult.error || ordersResult.error) {
        setAccountError(bookingsResult.error?.message ?? ordersResult.error?.message ?? 'Could not load your account.')
      } else {
        const bookings = (bookingsResult.data ?? []) as AccountBooking[]
        setAccountBookings(bookings)
        setAccountOrders((ordersResult.data ?? []) as AccountOrder[])

        const artworkEntries = await Promise.all(
          bookings
            .filter((booking) => booking.artwork_path)
            .map(async (booking) => {
              const { data } = await supabase.storage
                .from('ad-artwork')
                .createSignedUrl(booking.artwork_path!, 300)
              return [booking.id, data?.signedUrl ?? ''] as const
            }),
        )

        if (!cancelled) {
          setAccountArtworkUrls(Object.fromEntries(artworkEntries.filter(([, url]) => url)))
        }

        const runIds = Array.from(new Set(
          bookings
            .map((booking) => firstRelation(booking.production_runs)?.id)
            .filter((id): id is string => Boolean(id)),
        ))

        if (runIds.length) {
          const { data: salesCells } = await supabase
            .from('ad_cells')
            .select('production_run_id,status')
            .in('production_run_id', runIds)

          const metrics: Record<string, { sold: number; reserved: number }> = {}
          for (const runId of runIds) metrics[runId] = { sold: 0, reserved: 0 }

          for (const cell of salesCells ?? []) {
            if (!metrics[cell.production_run_id]) continue
            if (cell.status === 'sold') metrics[cell.production_run_id].sold += 1
            if (cell.status === 'reserved') metrics[cell.production_run_id].reserved += 1
          }

          setAccountRunSales(metrics)
        } else {
          setAccountRunSales({})
        }
      }

      setAccountLoading(false)
    }

    loadAccountData()

    return () => {
      cancelled = true
    }
  }, [accountOpen, userId])

  useEffect(() => {
    if (!adminOpen || !userId || !isAdmin) return

    let cancelled = false

    async function loadAdminData() {
      setAdminLoading(true)
      setAdminMessage('')

      const [bookingsResult, ordersResult, runsResult] = await Promise.all([
        supabase
          .from('ad_bookings')
          .select(`
            id,
            status,
            artwork_review_status,
            artwork_review_notes,
            artwork_path,
            panel,
            top_row,
            left_col,
            width_cells,
            height_cells,
            square_count,
            total_pence,
            created_at,
            profiles!ad_bookings_user_id_fkey (display_name),
            production_runs (
              id,
              run_code,
              status,
              status_updated_at,
              status_note,
              estimated_stage_date,
              bag_sizes (name, total_square_count)
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('takeaway_orders')
          .select(`
            id,
            status,
            created_at,
            takeaway_businesses (business_name, postcode),
            takeaway_order_items (boxes, bags_per_box)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('production_runs')
          .select(`
            id,
            run_code,
            status,
            status_updated_at,
            status_note,
            estimated_stage_date,
            estimated_start_date,
            price_per_square_pence,
            bag_quantity,
            bag_sizes (
              name,
              total_square_count,
              front_width_mm,
              side_gusset_mm,
              height_mm,
              front_cols,
              front_rows,
              side_cols,
              side_rows
            )
          `)
          .order('run_code'),
      ])

      if (cancelled) return

      if (bookingsResult.error || ordersResult.error || runsResult.error) {
        setAdminMessage(
          bookingsResult.error?.message ??
          ordersResult.error?.message ??
          runsResult.error?.message ??
          'Could not load admin data.',
        )
        setAdminLoading(false)
        return
      }

      const bookings = (bookingsResult.data ?? []) as AdminBooking[]
      setAdminBookings(bookings)
      setAdminOrders((ordersResult.data ?? []) as AdminOrder[])
      const adminRunsData = (runsResult.data ?? []) as AdminRun[]
      setAdminRuns(adminRunsData)

      const adminRunIds = adminRunsData.map((item) => item.id)
      if (adminRunIds.length) {
        const { data: salesCells } = await supabase
          .from('ad_cells')
          .select('production_run_id,status')
          .in('production_run_id', adminRunIds)

        const metrics: Record<string, { sold: number; reserved: number }> = {}
        for (const runId of adminRunIds) metrics[runId] = { sold: 0, reserved: 0 }

        for (const cell of salesCells ?? []) {
          if (!metrics[cell.production_run_id]) continue
          if (cell.status === 'sold') metrics[cell.production_run_id].sold += 1
          if (cell.status === 'reserved') metrics[cell.production_run_id].reserved += 1
        }

        setAdminRunSales(metrics)
      } else {
        setAdminRunSales({})
      }

      const artworkEntries = await Promise.all(
        bookings
          .filter((booking) => booking.artwork_path)
          .map(async (booking) => {
            const { data } = await supabase.storage
              .from('ad-artwork')
              .createSignedUrl(booking.artwork_path!, 300)
            return [booking.id, data?.signedUrl ?? ''] as const
          }),
      )

      if (!cancelled) {
        setAdminArtworkUrls(Object.fromEntries(artworkEntries.filter(([, url]) => url)))
      }

      setAdminLoading(false)
    }

    loadAdminData()

    return () => {
      cancelled = true
    }
  }, [adminOpen, userId, isAdmin])

  async function updateArtworkReview(
    bookingId: string,
    status: 'approved' | 'changes_requested' | 'rejected',
  ) {
    setAdminMessage('')
    const notes = status === 'approved' ? null : window.prompt('Optional note for the advertiser:') || null

    const { error } = await supabase
      .from('ad_bookings')
      .update({
        artwork_review_status: status,
        artwork_review_notes: notes,
        artwork_reviewed_at: new Date().toISOString(),
        artwork_reviewed_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (error) {
      setAdminMessage(error.message)
      return
    }

    setAdminBookings((current) => current.map((booking) =>
      booking.id === bookingId
        ? { ...booking, artwork_review_status: status, artwork_review_notes: notes }
        : booking,
    ))

    const { data: notifyData, error: notifyError } = await supabase.functions.invoke('notify-artwork-review', {
      body: { booking_id: bookingId },
    })

    if (notifyError || !notifyData?.ok) {
      const context = (notifyError as { context?: Response } | null)?.context
      let message = notifyData?.error || notifyError?.message || 'Artwork review updated, but the advertiser email could not be sent.'

      if (context) {
        try {
          const body = await context.clone().json() as { error?: string }
          if (body?.error) message = body.error
        } catch {
          // Keep fallback message.
        }
      }

      setAdminMessage(message)
      return
    }

    setAdminMessage(notifyData?.sent
      ? 'Artwork review updated and advertiser notified by email.'
      : 'Artwork review updated.')
  }

  async function uploadReplacementArtwork(booking: AccountBooking, file?: File) {
    if (!file || !userId) return

    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
    if (!allowedTypes.has(file.type)) {
      setAccountError('Upload PNG, JPEG, WebP or SVG artwork.')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      setAccountError('Artwork must be 15 MB or smaller.')
      return
    }

    setReplacementUploading(booking.id)
    setAccountError('')

    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
    const path = `${userId}/${booking.id}/replacement-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('ad-artwork')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      setAccountError(uploadError.message)
      setReplacementUploading(null)
      return
    }

    const { data, error } = await supabase.rpc('replace_ad_booking_artwork', {
      p_booking_id: booking.id,
      p_artwork_path: path,
    })

    if (error || !data) {
      await supabase.storage.from('ad-artwork').remove([path])
      setAccountError(error?.message || 'Could not submit replacement artwork.')
      setReplacementUploading(null)
      return
    }

    setAccountBookings((current) => current.map((item) =>
      item.id === booking.id
        ? {
            ...item,
            artwork_path: path,
            artwork_review_status: 'pending',
            artwork_review_notes: null,
          }
        : item,
    ))

    setAccountError('')
    setReplacementUploading(null)
  }

  async function updateOrderStatus(orderId: string, status: 'approved' | 'dispatching' | 'dispatched' | 'completed' | 'cancelled') {
    const { error } = await supabase
      .from('takeaway_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (error) {
      setAdminMessage(error.message)
      return
    }

    setAdminOrders((current) => current.map((order) =>
      order.id === orderId ? { ...order, status } : order,
    ))
  }

  async function exportProductionPack(run: AdminRun) {
    const bag = firstRelation(run.bag_sizes)
    if (!bag) {
      setAdminMessage('Could not load the bag geometry for this production run.')
      return
    }

    const approvedBookings = adminBookings.filter((booking) => {
      const bookingRun = firstRelation(booking.production_runs)
      return (
        bookingRun?.id === run.id &&
        booking.status === 'paid' &&
        booking.artwork_review_status === 'approved' &&
        Boolean(booking.artwork_path)
      )
    })

    if (!approvedBookings.length) {
      setAdminMessage('There are no approved paid artworks to export for this run yet.')
      return
    }

    setAdminExportingRun(run.id)
    setAdminMessage('Building production artwork pack…')

    try {
      const zip = new JSZip()
      const rows = [[
        'booking_reference',
        'advertiser',
        'panel',
        'top_row',
        'left_column',
        'width_cells',
        'height_cells',
        'x_mm_from_panel_left',
        'y_mm_from_panel_top',
        'artwork_width_mm',
        'artwork_height_mm',
        'file',
      ]]

      for (const booking of approvedBookings) {
        const isFace = booking.panel === 'front' || booking.panel === 'back'
        const cols = isFace ? bag.front_cols : bag.side_cols
        const rowsCount = isFace ? bag.front_rows : bag.side_rows
        const panelWidthMm = isFace ? bag.front_width_mm : bag.side_gusset_mm
        const gridWidthMm = cols * 30 + Math.max(0, cols - 1) * 3
        const gridHeightMm = rowsCount * 30 + Math.max(0, rowsCount - 1) * 3
        const offsetX = Math.max(10, (panelWidthMm - gridWidthMm) / 2)
        const offsetY = Math.max(10, (bag.height_mm - gridHeightMm) / 2)
        const xMm = offsetX + booking.left_col * 33
        const yMm = offsetY + booking.top_row * 33
        const artworkWidthMm = booking.width_cells * 30 + Math.max(0, booking.width_cells - 1) * 3
        const artworkHeightMm = booking.height_cells * 30 + Math.max(0, booking.height_cells - 1) * 3

        const path = booking.artwork_path!
        const extension = path.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
        const filename = `${booking.panel}_r${booking.top_row + 1}_c${booking.left_col + 1}_${booking.id.slice(0, 8)}.${extension}`

        const { data: signed, error: signedError } = await supabase.storage
          .from('ad-artwork')
          .createSignedUrl(path, 600)

        if (signedError || !signed?.signedUrl) {
          throw new Error(`Could not access artwork ${booking.id.slice(0, 8).toUpperCase()}.`)
        }

        const response = await fetch(signed.signedUrl)
        if (!response.ok) {
          throw new Error(`Could not download artwork ${booking.id.slice(0, 8).toUpperCase()}.`)
        }

        zip.file(`artwork/${filename}`, await response.arrayBuffer())

        const profile = firstRelation(booking.profiles)
        rows.push([
          booking.id.slice(0, 8).toUpperCase(),
          profile?.display_name ?? 'Advertiser',
          booking.panel,
          String(booking.top_row + 1),
          String(booking.left_col + 1),
          String(booking.width_cells),
          String(booking.height_cells),
          xMm.toFixed(1),
          yMm.toFixed(1),
          artworkWidthMm.toFixed(1),
          artworkHeightMm.toFixed(1),
          filename,
        ])
      }

      const csv = rows
        .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
        .join('\n')

      zip.file('manifest.csv', '\uFEFF' + csv)
      zip.file(
        'README.txt',
        [
          `FreePack production artwork pack — ${bag.name} / ${run.run_code}`,
          '',
          `Approved artwork files: ${approvedBookings.length}`,
          `Panel size: front/back ${bag.front_width_mm} × ${bag.height_mm} mm; sides ${bag.side_gusset_mm} × ${bag.height_mm} mm`,
          '',
          'PLACEMENT RULES',
          '- Coordinates in manifest.csv are measured from the top-left of the named bag panel.',
          '- Base advertising unit: 30 × 30 mm.',
          '- Grid pitch: 33 mm (30 mm unit + 3 mm separation between neighbouring advertiser positions).',
          '- A multi-cell advert is one continuous rectangle; internal 3 mm gaps are not printed inside the advertiser artwork.',
          '- Current layout keeps at least a 10 mm safe margin from panel edges.',
          '',
          'IMPORTANT',
          'This pack is a production placement pack, not the final manufacturer dieline.',
          'The bag manufacturer dieline, folds, glue areas, bleed and press requirements override these coordinates before final print artwork is released.',
        ].join('\n'),
      )

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `FreePack-${run.run_code}-artwork-pack.zip`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      setAdminMessage(`Production pack exported with ${approvedBookings.length} approved artwork file${approvedBookings.length === 1 ? '' : 's'}.`)
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : 'Could not build the production artwork pack.')
    } finally {
      setAdminExportingRun(null)
    }
  }

  async function updateRunPrice(runDbId: string, pounds: number) {
    if (!Number.isFinite(pounds) || pounds < 0) {
      setAdminMessage('Enter a valid advertising price.')
      return
    }

    const pricePence = Math.round(pounds * 100)
    const { error } = await supabase
      .from('production_runs')
      .update({ price_per_square_pence: pricePence, updated_at: new Date().toISOString() })
      .eq('id', runDbId)

    if (error) {
      setAdminMessage(error.message)
      return
    }

    setAdminRuns((current) => current.map((item) =>
      item.id === runDbId ? { ...item, price_per_square_pence: pricePence } : item,
    ))
    setRuns((current) => current.map((item) =>
      item.dbId === runDbId ? { ...item, pricePerSquarePence: pricePence } : item,
    ))
    setAdminMessage(`Advertising price updated to £${(pricePence / 100).toFixed(2)} per 3cm square.`)
  }

  async function updateShippingPrice(pounds: number) {
    if (!Number.isFinite(pounds) || pounds < 0) {
      setAdminMessage('Enter a valid shipping price.')
      return
    }

    const pricePence = Math.round(pounds * 100)
    const { error } = await supabase
      .from('platform_settings')
      .update({
        shipping_price_pence: pricePence,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'default')

    if (error) {
      setAdminMessage(error.message)
      return
    }

    setShippingPricePence(pricePence)
    setAdminMessage(`Shipping price updated to £${(pricePence / 100).toFixed(2)} per order.`)
  }

  async function updateRunStatus(runDbId: string, status: 'selling' | 'funded' | 'artwork_review' | 'sent_to_print' | 'printing' | 'shipping' | 'in_stock' | 'distributing' | 'completed') {
    setAdminMessage('')

    if (['sent_to_print', 'printing', 'shipping', 'in_stock', 'distributing', 'completed'].includes(status)) {
      const paidBookings = adminBookings.filter((booking) =>
        firstRelation(booking.production_runs)?.id === runDbId && booking.status === 'paid',
      )
      const unapproved = paidBookings.filter((booking) =>
        booking.artwork_review_status !== 'approved' || !booking.artwork_path,
      )

      if (!paidBookings.length) {
        setAdminMessage('This run cannot move to print until it has at least one paid advertiser.')
        return
      }

      if (unapproved.length) {
        setAdminMessage(`This run still has ${unapproved.length} paid artwork file${unapproved.length === 1 ? '' : 's'} waiting for approval.`)
        return
      }
    }

    const { error } = await supabase
      .from('production_runs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', runDbId)

    if (error) {
      setAdminMessage(error.message)
      return
    }

    setAdminRuns((current) => current.map((item) =>
      item.id === runDbId ? { ...item, status } : item,
    ))

    const { data: notifyData, error: notifyError } = await supabase.functions.invoke('notify-campaign-update', {
      body: { run_id: runDbId },
    })

    if (notifyError || !notifyData?.ok) {
      const context = (notifyError as { context?: Response } | null)?.context
      let message = notifyData?.error || notifyError?.message || 'Campaign updated, but email notifications could not be sent.'

      if (context) {
        try {
          const body = await context.clone().json() as { error?: string }
          if (body?.error) message = body.error
        } catch {
          // Keep fallback message.
        }
      }

      setAdminMessage(message)
      return
    }

    const sent = Number(notifyData?.sent ?? 0)
    setAdminMessage(sent > 0
      ? `Campaign updated and ${sent} advertiser email${sent === 1 ? '' : 's'} sent.`
      : 'Campaign updated. There are no paid advertisers to notify yet.')
  }

  async function updateRunDetails(run: AdminRun) {
    const nextNote = window.prompt(
      'Status note shown to advertisers (leave blank for none):',
      run.status_note ?? '',
    )
    if (nextNote === null) return

    const nextDate = window.prompt(
      'Estimated date for this stage (YYYY-MM-DD, leave blank for none):',
      run.estimated_stage_date ?? '',
    )
    if (nextDate === null) return

    const { error } = await supabase
      .from('production_runs')
      .update({
        status_note: nextNote.trim() || null,
        estimated_stage_date: nextDate.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', run.id)

    if (error) {
      setAdminMessage(error.message)
      return
    }

    setAdminRuns((current) => current.map((item) =>
      item.id === run.id
        ? {
            ...item,
            status_note: nextNote.trim() || null,
            estimated_stage_date: nextDate.trim() || null,
          }
        : item,
    ))
    setAdminMessage('Campaign details updated.')
  }

  useEffect(() => {
    let cancelled = false

    async function loadRuns() {
      setRunsLoading(true)

      const { data: runRows, error: runsError } = await supabase
        .from('production_runs')
        .select(`
          id,
          run_code,
          status,
          estimated_start_date,
          price_per_square_pence,
          bag_sizes (
            code,
            name,
            front_width_mm,
            side_gusset_mm,
            height_mm,
            front_cols,
            front_rows,
            side_cols,
            side_rows,
            total_square_count
          )
        `)
        .in('status', ['selling', 'funded', 'artwork_review', 'sent_to_print', 'printing', 'shipping', 'in_stock', 'distributing'])
        .order('run_code')

      if (runsError || !runRows) {
        console.error('Could not load production runs', runsError)
        if (!cancelled) setRunsLoading(false)
        return
      }

      const runIds = runRows.map((row) => row.id)
      const { data: cells, error: cellsError } = runIds.length
        ? await supabase
            .from('ad_cells')
            .select('production_run_id,panel,row_index,col_index,status')
            .in('production_run_id', runIds)
        : { data: [], error: null }

      if (cellsError) {
        console.error('Could not load advertising cells', cellsError)
      }

      const mapped = runRows.flatMap((row) => {
        const bag = Array.isArray(row.bag_sizes) ? row.bag_sizes[0] : row.bag_sizes
        if (!bag) return []

        const soldByPanel: Record<PanelKey, string[]> = {
          front: [],
          right: [],
          back: [],
          left: [],
        }

        for (const cell of cells ?? []) {
          if (cell.production_run_id !== row.id || cell.status === 'available') continue
          soldByPanel[cell.panel].push(`${cell.row_index}-${cell.col_index}`)
        }

        const start = row.estimated_start_date
          ? new Date(`${row.estimated_start_date}T00:00:00`).toLocaleDateString('en-GB', {
              month: 'long',
              year: 'numeric',
            })
          : 'TBC'

        return [{
          id: row.run_code,
          dbId: row.id,
          size: bag.name as BagRun['size'],
          dimensions: `${bag.front_width_mm} × ${bag.front_width_mm + bag.side_gusset_mm} × ${bag.height_mm} mm`,
          faceWidth: bag.front_width_mm,
          sideWidth: bag.side_gusset_mm,
          height: bag.height_mm,
          totalBagSquares: bag.total_square_count,
          estimatedStart: start,
          pricePerSquarePence: row.price_per_square_pence,
          soldByPanel,
        }]
      })

      if (!cancelled && mapped.length) {
        setRuns(mapped)
        setRunId((current) => mapped.some((item) => item.id === current) ? current : mapped[0].id)
      }

      if (!cancelled) setRunsLoading(false)
    }

    loadRuns()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const currentUserId = userId
    const requestedBookingId = cancelledBookingId

    if (!currentUserId || !cancelledPaymentReturn || runsLoading) return

    let cancelled = false

    async function restoreCancelledCheckout(authenticatedUserId: string, requestedId: string | null) {
      const fields = 'id,status,production_run_id,panel,top_row,left_col,width_cells,height_cells,total_pence,artwork_path,reserved_until'

      const result = requestedId
        ? await supabase
            .from('ad_bookings')
            .select(fields)
            .eq('id', requestedId)
            .eq('user_id', authenticatedUserId)
            .maybeSingle()
        : await supabase
            .from('ad_bookings')
            .select(fields)
            .eq('user_id', authenticatedUserId)
            .eq('status', 'reserved')
            .gt('reserved_until', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

      if (cancelled) return

      const booking = result.data
      const loadError = result.error

      if (loadError || !booking) {
        setPaymentBanner('We could not restore that reservation. Please choose your advertising space again.')
        setCancelledBookingId(null)
        setCancelledPaymentReturn(false)
        return
      }

      if (
        booking.status !== 'reserved' ||
        !booking.reserved_until ||
        new Date(booking.reserved_until).getTime() <= Date.now()
      ) {
        setPaymentBanner('That reservation has expired and the advertising space is available to select again.')
        setCancelledBookingId(null)
        setCancelledPaymentReturn(false)
        return
      }

      const restoredRun = runs.find((item) => item.dbId === booking.production_run_id)
      if (!restoredRun) {
        setPaymentBanner('Your reservation is still held, but this production run could not be loaded.')
        return
      }

      let artworkUrl: string | null = null
      if (booking.artwork_path) {
        const { data: signed } = await supabase.storage
          .from('ad-artwork')
          .createSignedUrl(booking.artwork_path, 1800)
        artworkUrl = signed?.signedUrl ?? null
      }

      if (cancelled) return

      const restoredSelection: Rect = {
        top: booking.top_row,
        left: booking.left_col,
        bottom: booking.top_row + booking.height_cells - 1,
        right: booking.left_col + booking.width_cells - 1,
      }

      setRunId(restoredRun.id)
      setPanelKey(booking.panel as PanelKey)
      setDragStart(null)
      setPreview(restoredSelection)
      setSelection(restoredSelection)
      setArtwork(artworkUrl)
      setArtworkFile(null)
      setActiveBookingId(booking.id)
      setReservationMessage('Your reserved space and artwork have been restored. You can continue to payment.')
      setPlacementMessage('Your reserved advertising space has been restored.')
      setCheckoutLoading(false)
      setCheckoutOpen(false)
      setPaymentBanner('Payment was cancelled. Your selection and artwork have been restored.')

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById('upload-artwork')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      })

      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('payment')
      cleanUrl.searchParams.delete('booking_id')
      window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash)
      setCancelledBookingId(null)
      setCancelledPaymentReturn(false)
    }

    void restoreCancelledCheckout(currentUserId, requestedBookingId)

    return () => {
      cancelled = true
    }
  }, [cancelledBookingId, cancelledPaymentReturn, runs, runsLoading, userId])

  useEffect(() => {
    if (!run?.dbId) {
      setSponsorArtwork([])
      return
    }

    let cancelled = false

    async function loadSponsorArtwork() {
      const { data, error } = await supabase.functions.invoke('get-run-sponsor-artwork', {
        body: { run_id: run.dbId },
      })

      if (cancelled) return

      if (error || !data?.ok) {
        console.error('Could not load approved sponsor artwork', error ?? data?.error)
        setSponsorArtwork([])
        return
      }

      const mapped = ((data.sponsors ?? []) as Array<{
        id: string
        panel: PanelKey
        top_row: number
        left_col: number
        width_cells: number
        height_cells: number
        artwork_url: string
      }>).map((item) => ({
        id: item.id,
        panel: item.panel,
        topRow: item.top_row,
        leftCol: item.left_col,
        widthCells: item.width_cells,
        heightCells: item.height_cells,
        artworkUrl: item.artwork_url,
      }))

      setSponsorArtwork(mapped)
    }

    void loadSponsorArtwork()

    return () => {
      cancelled = true
    }
  }, [run?.dbId, sponsorArtworkRefresh])

  const previewBlocked = useMemo(
    () => Boolean(preview && rectCells(preview).some((key) => soldCells.has(key))),
    [preview, soldCells],
  )

  const selectedCount = selection
    ? (selection.right - selection.left + 1) * (selection.bottom - selection.top + 1)
    : 0

  const selectionStyle = selection
    ? {
        left: `calc(${(selection.left / panel.cols) * 100}% + ${(selection.left * 3) / panel.cols}px)`,
        top: `calc(${(selection.top / panel.rows) * 100}% + ${(selection.top * 3) / panel.rows}px)`,
        width: `calc(${((selection.right - selection.left + 1) / panel.cols) * 100}% - ${((panel.cols - (selection.right - selection.left + 1)) * 3) / panel.cols}px)`,
        height: `calc(${((selection.bottom - selection.top + 1) / panel.rows) * 100}% - ${((panel.rows - (selection.bottom - selection.top + 1)) * 3) / panel.rows}px)`,
      }
    : undefined

  const totalBoxes = Object.values(bagBoxes).reduce((sum, quantity) => sum + quantity, 0)
  const totalBags = totalBoxes * 250
  const takeawayShippingPence = totalBoxes > 0 ? shippingPricePence : 0

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
    setPlacementMessage('')
    setArtwork(null)
    setArtworkFile(null)
    setReservationMessage('')
    setActiveBookingId(null)
    setCheckoutOpen(false)
  }

  function changeRun(id: string) {
    setRunId(id)
    setPanelKey('front')
    clearSelection()
  }

  function changePanel(key: PanelKey) {
    if (key === panelKey) return

    setPanelKey(key)
    setDragStart(null)
    setPreview(null)
    setSelection(null)
    setPlacementMessage('Choose a position on this face. Your uploaded artwork has been kept.')
    setReservationMessage('')
    setActiveBookingId(null)
    setCheckoutOpen(false)
  }

  function rotatePanel(direction: 1 | -1) {
    const index = PANEL_ORDER.indexOf(panelKey)
    const nextIndex = (index + direction + PANEL_ORDER.length) % PANEL_ORDER.length
    changePanel(PANEL_ORDER[nextIndex])
  }

  function chooseGridCell(targetPanel: PanelKey, point: Point) {
    const targetSoldCells = new Set(run.soldByPanel[targetPanel])
    const targetBrandRows = brandRowsByPanel[targetPanel]
    const targetBrandGapAfterRow = brandGapAfterRowByPanel[targetPanel]
    const key = `${point.row}-${point.col}`

    if (targetBrandRows.includes(point.row)) {
      setPlacementMessage('That middle strip is reserved for Freepack branding.')
      return
    }

    if (targetSoldCells.has(key)) return

    const changingPanel = targetPanel !== panelKey

    if (!selection || changingPanel) {
      const rect = makeRect(point, point)
      if (changingPanel) setPanelKey(targetPanel)
      setPreview(rect)
      setSelection(rect)
      setPlacementMessage('1 × 1 selected. Tap a free square directly beside it to add a row or column.')
      setReservationMessage('')
      setActiveBookingId(null)
      setCheckoutOpen(false)
      return
    }

    const isInside =
      point.row >= selection.top &&
      point.row <= selection.bottom &&
      point.col >= selection.left &&
      point.col <= selection.right

    if (isInside) {
      setPlacementMessage('Tap the next free square outside the selected edge to add a row or column.')
      return
    }

    let next: Rect | null = null

    const besideLeft =
      point.col === selection.left - 1 &&
      point.row >= selection.top &&
      point.row <= selection.bottom

    const besideRight =
      point.col === selection.right + 1 &&
      point.row >= selection.top &&
      point.row <= selection.bottom

    const besideTop =
      point.row === selection.top - 1 &&
      point.col >= selection.left &&
      point.col <= selection.right

    const besideBottom =
      point.row === selection.bottom + 1 &&
      point.col >= selection.left &&
      point.col <= selection.right

    if (besideLeft) next = { ...selection, left: selection.left - 1 }
    if (besideRight) next = { ...selection, right: selection.right + 1 }
    if (besideTop) next = { ...selection, top: selection.top - 1 }
    if (besideBottom) next = { ...selection, bottom: selection.bottom + 1 }

    if (!next) {
      setPlacementMessage('Tap a free square directly beside the selected rectangle to add one full row or column.')
      return
    }

    const currentCells = new Set(rectCells(selection))
    const addedCells = rectCells(next).filter((cellKey) => !currentCells.has(cellKey))
    const blockedBySale = addedCells.some((cellKey) => targetSoldCells.has(cellKey))
    const blockedByBrand = addedCells.some((cellKey) => targetBrandRows.includes(cellRow(cellKey)))
    const crossesBrandGap =
      targetBrandGapAfterRow !== null &&
      next.top <= targetBrandGapAfterRow &&
      next.bottom > targetBrandGapAfterRow

    if (blockedByBrand || crossesBrandGap) {
      setPlacementMessage('That selection would cross the centred Freepack logo.')
      return
    }

    if (blockedBySale) {
      setPlacementMessage('That row or column includes space that is already taken.')
      return
    }

    setPreview(next)
    setSelection(next)
    setPlacementMessage(
      `${next.bottom - next.top + 1} × ${next.right - next.left + 1} selected. Keep tapping beside an edge to make it larger.`,
    )
    setArtwork(null)
    setArtworkFile(null)
    setReservationMessage('')
    setActiveBookingId(null)
    setCheckoutOpen(false)
  }

  function uploadArtwork(file?: File) {
    if (!file || !selection) return
    setArtworkFile(file)
    const reader = new FileReader()
    reader.onload = () => setArtwork(String(reader.result))
    reader.readAsDataURL(file)
  }

  function finishAuthFlow() {
    setAuthOpen(false)
    setAuthMessage('')

    if (authReturnTo === 'advertiser' && selection && artworkFile) {
      setCheckoutOpen(true)
    }

    if (authReturnTo === 'takeaway' && totalBoxes > 0) {
      setTakeawayCheckoutOpen(true)
    }

    setAuthReturnTo(null)
  }

  async function requestPasswordReset(event: React.FormEvent) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthMessage('')

    const { data, error } = await supabase.functions.invoke('request-password-reset', {
      body: { email: authEmail },
    })

    let message = data?.message || data?.error || error?.message || 'Could not send reset email.'
    const context = (error as { context?: Response } | null)?.context
    if (context) {
      try {
        const body = await context.clone().json() as { error?: string; message?: string }
        message = body.message || body.error || message
      } catch {
        // Keep fallback message.
      }
    }

    setAuthMessage(message)
    setAuthLoading(false)
  }

  async function submitNewPassword(event: React.FormEvent) {
    event.preventDefault()

    if (authPassword.length < 8) {
      setAuthMessage('Password must be at least 8 characters.')
      return
    }

    if (authPassword !== authConfirmPassword) {
      setAuthMessage('Passwords do not match.')
      return
    }

    setAuthLoading(true)
    setAuthMessage('')

    const { error } = await supabase.auth.updateUser({ password: authPassword })

    if (error) {
      setAuthMessage(error.message)
    } else {
      setAuthMessage('Password updated. You are now signed in.')
      window.setTimeout(() => {
        setAuthOpen(false)
        setAuthMode('signin')
        setAuthMessage('')
      }, 900)
    }

    setAuthLoading(false)
  }

  async function handleAuth(event: React.FormEvent) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthMessage('')

    if (authMode === 'signup') {
      const { data, error } = await supabase.functions.invoke('register-with-resend', {
        body: {
          email: authEmail,
          password: authPassword,
          display_name: authEmail.split('@')[0],
        },
      })

      if (error || !data?.ok) {
        let functionMessage = data?.error || error?.message || 'Could not create your account.'

        const context = (error as { context?: Response } | null)?.context
        if (context) {
          try {
            const body = await context.clone().json() as { error?: string }
            if (body?.error) functionMessage = body.error
          } catch {
            // Keep the fallback message if the response body is not JSON.
          }
        }

        const signInAttempt = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        })

        if (!signInAttempt.error) {
          finishAuthFlow()
        } else if (/already exists|already registered|sign in instead/i.test(functionMessage)) {
          setAuthMode('signin')
          setAuthMessage('That email already has a FreePack account. Sign in with your existing password.')
        } else {
          setAuthMessage(functionMessage)
        }
      } else {
        setAuthMessage('Account created. Check your email to confirm your address, then sign in.')
      }
    } else {
      const result = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      })

      if (result.error) {
        setAuthMessage(result.error.message)
      } else {
        finishAuthFlow()
      }
    }

    setAuthLoading(false)
  }

  function openTakeawayCheckout() {
    if (totalBoxes === 0) return
    if (!userId) {
      setAuthMode('signup')
      setAuthReturnTo('takeaway')
      setAuthOpen(true)
      setAuthMessage('Create an account or sign in before placing a free bag order.')
      return
    }
    setTakeawayMessage('')
    setTakeawayCheckoutOpen(true)
  }

  async function submitTakeawayOrder(event: React.FormEvent) {
    event.preventDefault()
    if (!userId) {
      setTakeawayCheckoutOpen(false)
      setAuthMode('signin')
      setAuthReturnTo('takeaway')
      setAuthOpen(true)
      setAuthMessage('Sign in to submit your bag order.')
      return
    }

    const items = runs
      .filter((item) => (bagBoxes[item.id] ?? 0) > 0 && item.dbId)
      .map((item) => ({
        production_run_id: item.dbId!,
        boxes: bagBoxes[item.id],
      }))

    if (!items.length) {
      setTakeawayMessage('Choose at least one box before submitting.')
      return
    }

    setTakeawaySubmitting(true)
    setTakeawayMessage('')

    const { data: order, error } = await supabase.rpc('submit_takeaway_order', {
      p_business_name: takeawayDetails.businessName,
      p_phone: takeawayDetails.phone,
      p_address_line_1: takeawayDetails.address1,
      p_address_line_2: takeawayDetails.address2,
      p_town_city: takeawayDetails.townCity,
      p_postcode: takeawayDetails.postcode,
      p_delivery_notes: takeawayDetails.deliveryNotes,
      p_items: items,
    })

    if (error || !order) {
      setTakeawayMessage(error?.message ?? 'Could not submit your order.')
      setTakeawaySubmitting(false)
      return
    }

    if (order.shipping_pence > 0) {
      setTakeawayMessage('Opening secure payment for delivery…')

      const { data: checkout, error: checkoutError } = await supabase.functions.invoke('create-takeaway-checkout', {
        body: {
          order_id: order.id,
          return_origin: window.location.origin,
        },
      })

      if (checkoutError || !checkout?.url) {
        setTakeawayMessage(checkout?.error || checkoutError?.message || 'Could not open delivery payment.')
        setTakeawaySubmitting(false)
        return
      }

      window.location.assign(checkout.url)
      return
    }

    setTakeawayOrderId(order.id)
    setTakeawayMessage('Order submitted. We’ll verify the business and confirm availability before dispatch.')
    setTakeawaySubmitting(false)
    setBagBoxes((current) => Object.fromEntries(Object.keys(current).map((key) => [key, 0])))
  }

  async function startStripeCheckout() {
    if (!activeBookingId) return
    setCheckoutLoading(true)
    setReservationMessage('')

    const { data, error } = await supabase.functions.invoke('create-ad-checkout', {
      body: {
        booking_id: activeBookingId,
        return_origin: window.location.origin,
      },
    })

    if (error || !data?.url) {
      const message = data?.error || error?.message || 'Could not open Stripe Checkout.'
      setReservationMessage(message)
      setCheckoutLoading(false)
      return
    }

    window.location.assign(data.url)
  }

  async function reserveSelection() {
    if (!selection || !artworkFile || !run.dbId) return

    if (!userId) {
      setCheckoutOpen(false)
      setAuthMode('signup')
      setAuthReturnTo('advertiser')
      setAuthOpen(true)
      setAuthMessage('Create an account or sign in before reserving this space.')
      return
    }

    setReservationLoading(true)
    setReservationMessage('')

    const { data: booking, error: bookingError } = await supabase.rpc('reserve_ad_space', {
      p_run_id: run.dbId,
      p_panel: panelKey,
      p_top_row: selection.top,
      p_left_col: selection.left,
      p_width: selection.right - selection.left + 1,
      p_height: selection.bottom - selection.top + 1,
    })

    if (bookingError || !booking) {
      setReservationMessage(bookingError?.message ?? 'Could not reserve this space.')
      setReservationLoading(false)
      return
    }

    const bookingId = booking.id
    const extension = artworkFile.name.split('.').pop()?.toLowerCase() || 'bin'
    const path = `${userId}/${bookingId}/artwork.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('ad-artwork')
      .upload(path, artworkFile, {
        upsert: false,
        contentType: artworkFile.type || undefined,
      })

    if (uploadError) {
      await supabase.rpc('release_ad_reservation', { p_booking_id: bookingId })
      setReservationMessage(`Artwork upload failed: ${uploadError.message}`)
      setReservationLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('ad_bookings')
      .update({ artwork_path: path, updated_at: new Date().toISOString() })
      .eq('id', bookingId)

    if (updateError) {
      await supabase.rpc('release_ad_reservation', { p_booking_id: bookingId })
      setReservationMessage(`Reservation could not be completed: ${updateError.message}`)
      setReservationLoading(false)
      return
    }

    setActiveBookingId(bookingId)
    setReservationMessage('Reserved. Complete payment to secure the space.')
    setReservationLoading(false)
  }

  const publicPage: 'home' | 'bags' | 'advertise' | null =
    isAdminRoute
      ? null
      : currentPath === '/bags'
        ? 'bags'
        : currentPath === '/advertise'
          ? 'advertise'
          : 'home'

  return (
    <main className={isAdminRoute ? 'admin-route' : undefined}>
      {!isAdminRoute && paymentBanner && (
        <div className="payment-banner">
          <span>{paymentBanner}</span>
          <button onClick={() => setPaymentBanner('')} aria-label="Dismiss payment message"><X size={16} /></button>
        </div>
      )}
      {!isAdminRoute && <header className="nav shell">
        <a className="brand" href="/" aria-label="Freepack home">
          <img src="/freepack-logo-white.svg" alt="Freepack" />
        </a>
        <nav>
          <a className={publicPage === 'home' ? 'active' : ''} href="/">Who we are</a>
          <a className={publicPage === 'bags' ? 'active' : ''} href="/bags">Free bags</a>
          <a className={publicPage === 'advertise' ? 'active' : ''} href="/advertise">Advertise</a>
        </nav>
        {userId ? (
          <div className="nav-actions">
            {isAdmin && (
              <a className="button button-light admin-nav-button" href="/admin">
                Admin
              </a>
            )}
            <button className="button button-dark" onClick={() => setAccountOpen(true)}>
              My account
            </button>
          </div>
        ) : (
          <button className="button button-dark" onClick={() => { setAuthMode('signin'); setAuthReturnTo(null); setAuthOpen(true) }}>
            Sign in
          </button>
        )}
      </header>}

      {publicPage === 'home' && (
        <>
          <section className="hero shell home-hero">
            <div className="hero-copy">
              <div className="eyebrow">PACKAGING A BRIGHTER TOMORROW</div>
              <h1>Packaging that<br /><em>works harder.</em></h1>
              <p>
                Freepack connects takeaways that need packaging with brands that want to be seen.
                Advertising funds the production, so food businesses get quality paper bags for free.
              </p>
              <div className="hero-actions">
                <a className="button button-gold" href="/bags">I need free bags <ArrowRight size={18} /></a>
                <a className="button button-outline" href="/advertise">I want to advertise</a>
              </div>
            </div>

            <aside className="hero-manifesto" aria-label="What Freepack does">
              <span className="manifesto-index">THE FREEPACK MODEL</span>
              <div className="manifesto-lines">
                <strong>FREE FOR TAKEAWAYS</strong>
                <strong>VISIBLE FOR BRANDS</strong>
                <strong>USEFUL FOR EVERYONE</strong>
              </div>
              <p>One shared bag. Multiple advertisers. Thousands of everyday customer interactions.</p>
              <span className="manifesto-tagline">GOOD PACKAGING<br />GOES FURTHER.</span>
            </aside>
          </section>

          <section className="about-freepack shell">
            <div className="about-freepack-heading">
              <p className="kicker">WHO WE ARE</p>
              <h2>We turn everyday packaging into something more useful.</h2>
            </div>
            <div className="about-freepack-copy">
              <p>
                Freepack is a shared-packaging platform built around a simple idea: takeaways should not
                have to keep absorbing the cost of disposable bags, while brands need better ways to reach
                people in the real world.
              </p>
              <p>
                We bring the two together. Brands buy space on upcoming production runs and that advertising
                pays for the bags. The finished bags are then supplied to participating takeaways at no cost.
              </p>
            </div>
          </section>

          <section className="how-model shell" id="how">
            <div className="how-model-intro">
              <p className="kicker">WHAT WE DO</p>
              <h2>A simple exchange that benefits both sides.</h2>
            </div>
            <div className="how-model-steps">
              <article>
                <span>01</span>
                <div>
                  <strong>Brands fund a production run</strong>
                  <p>Advertisers choose a bag size, select the exact space they want and upload their artwork.</p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <strong>We print one shared design</strong>
                  <p>Approved adverts are combined on the same production run, keeping the model simple and scalable.</p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <strong>Takeaways receive the bags free</strong>
                  <p>Food businesses order the sizes they need and put the bags straight into everyday circulation.</p>
                </div>
              </article>
            </div>
          </section>

          <section className="home-pathways shell" aria-label="Choose how to use Freepack">
            <article className="pathway-card pathway-bags">
              <div className="pathway-icon"><PackageCheck size={24} /></div>
              <p className="kicker">FOR TAKEAWAYS</p>
              <h2>Free bags for your business.</h2>
              <p>Browse the available bag sizes, choose how many boxes you need and submit your order for £0.</p>
              <a className="button button-dark" href="/bags">Order free bags <ArrowRight size={17} /></a>
            </article>

            <article className="pathway-card pathway-ads">
              <div className="pathway-icon"><Megaphone size={24} /></div>
              <p className="kicker">FOR ADVERTISERS</p>
              <h2>Put your brand in customers' hands.</h2>
              <p>Choose a live production run, pick your exact advertising space and see your artwork on the bag.</p>
              <a className="button button-dark" href="/advertise">Buy advertising space <ArrowRight size={17} /></a>
            </article>
          </section>

          <section className="brand-promise shell" aria-label="Why Freepack works">
            <article>
              <span>01</span>
              <strong>Better for people</strong>
              <p>Takeaways get useful, quality packaging without paying for the bags.</p>
            </article>
            <article>
              <span>02</span>
              <strong>Brighter for brands</strong>
              <p>Advertising becomes something physical that travels with customers through the real world.</p>
            </article>
            <article>
              <span>03</span>
              <strong>Cleaner for tomorrow</strong>
              <p>Shared production keeps the model focused, efficient and designed around useful packaging.</p>
            </article>
          </section>
        </>
      )}

      {publicPage === 'bags' && (
        <>
          <section className="page-hero shell">
            <a className="page-back" href="/"><ArrowLeft size={16} /> About Freepack</a>
            <p className="eyebrow">FREE PACKAGING FOR TAKEAWAYS</p>
            <h1>Choose your bags.<br /><em>Pay £0.</em></h1>
            <p>Pick the sizes and box quantities your business needs. Available stock is supplied free because the production run has already been funded by advertisers.</p>
          </section>

          <section className="takeaway-order shell" id="takeaway-order">
            <div className="takeaway-order-head">
              <div>
                <p className="kicker">AVAILABLE BAG SIZES</p>
                <h2>Build your box order.</h2>
              </div>
              <div className="free-badge">£0 for the bags</div>
            </div>

            <div className="takeaway-layout">
              <div className="takeaway-products">
                {runs.map((item) => (
                  <article className="takeaway-product" key={item.id}>
                    <div
                      className="mini-bag"
                      style={{
                        width: `${(item.faceWidth / item.height) * ((item.height / 413) * MINI_BAG_MAX_HEIGHT)}px`,
                        height: `${(item.height / 413) * MINI_BAG_MAX_HEIGHT}px`,
                      }}
                    >
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
                  {runs.filter((item) => bagBoxes[item.id] > 0).map((item) => (
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
                <div className="summary-total shipping-total">
                  <span>Shipping</span>
                  <strong>{totalBoxes > 0 ? `£${(takeawayShippingPence / 100).toFixed(2)}` : '—'}</strong>
                </div>
                <div className="summary-total order-grand-total">
                  <span>Total to pay</span>
                  <strong>{totalBoxes > 0 ? `£${(takeawayShippingPence / 100).toFixed(2)}` : '£0.00'}</strong>
                </div>
                <button
                  className="button button-dark takeaway-continue"
                  disabled={totalBoxes === 0}
                  onClick={openTakeawayCheckout}
                >
                  Continue with order <ArrowRight size={17} />
                </button>
                <small className="summary-note">Orders are reviewed for business verification and stock availability before dispatch.</small>
              </aside>
            </div>
          </section>
        </>
      )}

      {publicPage === 'advertise' && (
        <>
          <section className="page-hero shell">
            <a className="page-back" href="/"><ArrowLeft size={16} /> About Freepack</a>
            <p className="eyebrow">ADVERTISING THAT TRAVELS</p>
            <h1>Put your brand<br /><em>in their hands.</em></h1>
            <p>Choose an upcoming production run, select the exact area you want on the bag and upload your artwork. Your advert then travels with every bag in that run.</p>
          </section>

          <section className="runs shell" id="runs">
            <div className="runs-heading">
              <div>
                <p className="kicker">OPEN ADVERTISING RUNS</p>
                <h2>Choose a bag size.</h2>
              </div>
              <p>Every size has its own advertising layout, while the price per 3 cm square stays the same.</p>
            </div>

            <div className="run-options">
              {runs.map((item) => {
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

          <section className="ad-flow shell" id="advertise">
            <div className="ad-flow-step ad-flow-space">
              <div className="ad-step-heading">
                <span className="ad-step-number">02</span>
                <div>
                  <p className="kicker">CHOOSE YOUR SPACE</p>
                  <h2>Pick your position on the 3D bag.</h2>
                  <p>Rotate the bag, choose a face and tap an available square. Tap beside your selection to make the advert larger.</p>
                </div>
              </div>

              {runsLoading && <div className="live-data-note">Loading live run availability…</div>}

              <div className="ad-bag-toolbar">
                <div className="ad-current-run">
                  <span>Selected bag</span>
                  <strong>{run.size}</strong>
                  <small>{run.dimensions} · Run {run.id}</small>
                </div>

                <div className="surface-tabs" aria-label="Choose bag face">
                  {PANEL_ORDER.map((key) => {
                    const face = panels[key]
                    const branded = brandRowsByPanel[key].length * face.cols
                    const sold = run.soldByPanel[key].filter((cell) => !brandRowsByPanel[key].includes(cellRow(cell))).length
                    const available = face.cols * face.rows - branded - sold
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
              </div>

              <div className="bag-wrap bag-wrap-true3d ad-flow-bag">
                <Bag3D
                  widthMm={run.faceWidth}
                  depthMm={run.sideWidth}
                  heightMm={run.height}
                  panels={panels}
                  soldByPanel={run.soldByPanel}
                  sponsorArtwork={sponsorArtwork}
                  brandRowsByPanel={brandRowsByPanel}
                  brandGapAfterRowByPanel={brandGapAfterRowByPanel}
                  brandLogoUrl="/freepack-logo-white.svg"
                  activePanel={panelKey}
                  selection={selection}
                  artwork={artwork}
                  onPanelChange={(key) => setPanelKey(key)}
                  onCellSelect={chooseGridCell}
                />

                {placementMessage && (
                  <div className="selection-warning">{placementMessage}</div>
                )}
                <p className="bag-help">
                  {selection
                    ? `Selected: ${shapeLabel(selection)} on ${panel.label}. Tap a free square beside the selected edge to grow it.`
                    : 'Rotate the bag and tap any available grid square to start with 1 × 1.'}
                </p>
              </div>
            </div>

            <div className="ad-flow-step ad-flow-artwork" id="upload-artwork">
              <div className="ad-step-heading">
                <span className="ad-step-number">03</span>
                <div>
                  <p className="kicker">LOAD YOUR ARTWORK</p>
                  <h2>Add your advert.</h2>
                  <p>{selection ? `You have selected ${shapeLabel(selection)} on the ${panel.label.toLowerCase()}.` : 'Choose your space on the 3D bag first.'}</p>
                </div>
              </div>

              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                hidden
                onChange={(event) => uploadArtwork(event.target.files?.[0])}
              />

              <div className={`artwork-upload-card ${artwork ? 'has-artwork' : ''}`}>
                {artwork ? (
                  <div className="artwork-upload-preview" style={{ backgroundImage: `url("${artwork}")` }} />
                ) : (
                  <div className="artwork-upload-placeholder"><ImagePlus size={28} /></div>
                )}
                <div className="artwork-upload-copy">
                  <strong>{artwork ? 'Artwork loaded' : 'Upload your artwork'}</strong>
                  <span>PNG, JPG, WEBP or SVG</span>
                </div>
                <button
                  className="button upload-button"
                  disabled={!selection}
                  onClick={() => fileInput.current?.click()}
                >
                  <ImagePlus size={17} />
                  {artwork ? 'Change artwork' : 'Choose file'}
                </button>
              </div>
            </div>

            <div className="ad-flow-step ad-flow-review">
              <div className="ad-step-heading">
                <span className="ad-step-number">04</span>
                <div>
                  <p className="kicker">REVIEW THE DETAILS</p>
                  <h2>Check everything before checkout.</h2>
                </div>
              </div>

              <div className="ad-review-grid">
                <div className="ad-review-info">
                  <div><span>Bag</span><strong>{run.size}</strong></div>
                  <div><span>Run</span><strong>{run.id}</strong></div>
                  <div><span>Bag face</span><strong>{panel.label}</strong></div>
                  <div><span>Selected shape</span><strong>{shapeLabel(selection)}</strong></div>
                  <div><span>3 cm squares</span><strong>{selectedCount}</strong></div>
                  <div><span>Estimated start</span><strong>{run.estimatedStart}</strong></div>
                </div>

                <div className="ad-review-price">
                  <span>Price per square</span>
                  <strong>£{(squarePricePence / 100).toFixed(2)}</strong>
                  <span>Total</span>
                  <strong className="ad-review-total">£{((selectedCount * squarePricePence) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  <small>The same square price applies across every bag face on this production run.</small>
                </div>
              </div>

              <div className="ad-review-status">
                <span><strong>{panelAvailability}%</strong> {panel.label.toLowerCase()} available</span>
                <span><strong>{totalAvailability}%</strong> whole bag available</span>
              </div>

              <div className="ad-review-actions">
                <button className="reset-button" onClick={clearSelection} disabled={!selection && !preview}>
                  <RotateCcw size={16} /> Reset selection
                </button>
                <button
                  className="button checkout-button"
                  disabled={!selection || !artwork}
                  onClick={() => setCheckoutOpen(true)}
                >
                  Review & continue <ArrowRight size={17} />
                </button>
              </div>
              {!selection && <p className="checkout-hint">Choose your advertising space on the 3D bag to continue.</p>}
              {selection && !artwork && <p className="checkout-hint">Upload your artwork to continue.</p>}
            </div>
          </section>
        </>
      )}

      {isAdminRoute && (
        <div className="admin-app">
          <aside className="admin-sidebar">
            <a className="admin-brand" href="/" aria-label="Freepack home">
              <img src="/freepack-logo-white.svg" alt="Freepack" />
            </a>

            <div className="admin-sidebar-label">PLATFORM ADMIN</div>
            <nav className="admin-nav">
              <button className={adminSection === 'overview' ? 'active' : ''} onClick={() => setAdminSection('overview')}>
                <ShieldCheck size={18} /> Overview
              </button>
              <button className={adminSection === 'advertising' ? 'active' : ''} onClick={() => setAdminSection('advertising')}>
                <Megaphone size={18} /> Advertising
              </button>
              <button className={adminSection === 'artwork' ? 'active' : ''} onClick={() => setAdminSection('artwork')}>
                <ImagePlus size={18} /> Artwork
                {adminBookings.filter((booking) => booking.status === 'paid' && booking.artwork_review_status === 'pending').length > 0 && (
                  <span>{adminBookings.filter((booking) => booking.status === 'paid' && booking.artwork_review_status === 'pending').length}</span>
                )}
              </button>
              <button className={adminSection === 'production' ? 'active' : ''} onClick={() => setAdminSection('production')}>
                <Box size={18} /> Production
              </button>
              <button className={adminSection === 'orders' ? 'active' : ''} onClick={() => setAdminSection('orders')}>
                <Truck size={18} /> Takeaway orders
                {adminOrders.filter((order) => order.status === 'submitted').length > 0 && (
                  <span>{adminOrders.filter((order) => order.status === 'submitted').length}</span>
                )}
              </button>
            </nav>

            <div className="admin-sidebar-footer">
              <a href="/"><ArrowLeft size={16} /> Back to website</a>
              {userId && (
                <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}>
                  Sign out
                </button>
              )}
            </div>
          </aside>

          <section className="admin-workspace">
            <header className="admin-topbar">
              <div>
                <p>FREEPACK ADMIN</p>
                <h1>
                  {adminSection === 'overview' && 'Overview'}
                  {adminSection === 'advertising' && 'Advertising'}
                  {adminSection === 'artwork' && 'Artwork approval'}
                  {adminSection === 'production' && 'Production'}
                  {adminSection === 'orders' && 'Takeaway orders'}
                </h1>
              </div>
              <a className="admin-site-link" href="/">View website <ArrowRight size={15} /></a>
            </header>

            {!authChecked && (
              <div className="admin-state-card">Checking admin access…</div>
            )}

            {authChecked && !userId && (
              <div className="admin-gate">
                <div className="checkout-icon"><ShieldCheck size={24} /></div>
                <p className="kicker">ADMIN ACCESS</p>
                <h2>Sign in to Freepack Admin</h2>
                <p>Use your administrator account to continue.</p>
                <button className="button button-dark" onClick={() => { setAuthMode('signin'); setAuthReturnTo(null); setAuthOpen(true) }}>
                  Sign in
                </button>
              </div>
            )}

            {authChecked && userId && !isAdmin && (
              <div className="admin-gate">
                <div className="checkout-icon"><ShieldCheck size={24} /></div>
                <p className="kicker">ADMIN ACCESS</p>
                <h2>This account is not an administrator.</h2>
                <p>Return to the Freepack website or sign in with an admin account.</p>
                <a className="button button-dark" href="/">Back to website</a>
              </div>
            )}

            {authChecked && userId && isAdmin && (
              <>
                {adminMessage && (
                  <div className="admin-message">
                    <span>{adminMessage}</span>
                    <button onClick={() => setAdminMessage('')} aria-label="Dismiss"><X size={15} /></button>
                  </div>
                )}

                {adminLoading ? (
                  <div className="admin-state-card">Loading live platform data…</div>
                ) : (
                  <>
                    {adminSection === 'overview' && (() => {
                      const paidBookings = adminBookings.filter((booking) => booking.status === 'paid')
                      const pendingArtwork = paidBookings.filter((booking) => booking.artwork_review_status === 'pending')
                      const submittedOrders = adminOrders.filter((order) => order.status === 'submitted')
                      const revenuePence = paidBookings.reduce((sum, booking) => sum + booking.total_pence, 0)
                      const soldSpaces = Object.values(adminRunSales).reduce((sum, sales) => sum + sales.sold, 0)
                      const printReadyRuns = adminRuns.filter((item) => {
                        const runBookings = paidBookings.filter((booking) => firstRelation(booking.production_runs)?.id === item.id)
                        return runBookings.length > 0 && runBookings.every((booking) => booking.artwork_review_status === 'approved' && Boolean(booking.artwork_path))
                      })

                      return (
                        <div className="admin-page-stack">
                          <section className="admin-summary-grid">
                            <article>
                              <span>Revenue received</span>
                              <strong>£{(revenuePence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                              <small>{paidBookings.length} paid booking{paidBookings.length === 1 ? '' : 's'}</small>
                            </article>
                            <article>
                              <span>Ad spaces sold</span>
                              <strong>{soldSpaces}</strong>
                              <small>Across {adminRuns.length} production run{adminRuns.length === 1 ? '' : 's'}</small>
                            </article>
                            <article className={pendingArtwork.length ? 'attention' : ''}>
                              <span>Artwork to review</span>
                              <strong>{pendingArtwork.length}</strong>
                              <small>{pendingArtwork.length ? 'Needs your attention' : 'Nothing waiting'}</small>
                            </article>
                            <article className={submittedOrders.length ? 'attention' : ''}>
                              <span>Orders waiting</span>
                              <strong>{submittedOrders.length}</strong>
                              <small>{submittedOrders.length ? 'Awaiting approval' : 'Nothing waiting'}</small>
                            </article>
                          </section>

                          <section className="admin-panel">
                            <div className="admin-panel-head">
                              <div>
                                <p className="kicker">NEEDS ATTENTION</p>
                                <h2>What needs doing now</h2>
                              </div>
                            </div>
                            <div className="admin-attention-list">
                              {pendingArtwork.length > 0 && (
                                <button onClick={() => setAdminSection('artwork')}>
                                  <span className="admin-attention-icon"><ImagePlus size={18} /></span>
                                  <div><strong>{pendingArtwork.length} artwork approval{pendingArtwork.length === 1 ? '' : 's'}</strong><small>Review advertiser artwork before production.</small></div>
                                  <ArrowRight size={17} />
                                </button>
                              )}
                              {submittedOrders.length > 0 && (
                                <button onClick={() => setAdminSection('orders')}>
                                  <span className="admin-attention-icon"><Truck size={18} /></span>
                                  <div><strong>{submittedOrders.length} takeaway order{submittedOrders.length === 1 ? '' : 's'} waiting</strong><small>Approve or update the order status.</small></div>
                                  <ArrowRight size={17} />
                                </button>
                              )}
                              {printReadyRuns.length > 0 && (
                                <button onClick={() => setAdminSection('production')}>
                                  <span className="admin-attention-icon"><PackageCheck size={18} /></span>
                                  <div><strong>{printReadyRuns.length} production run{printReadyRuns.length === 1 ? '' : 's'} ready for print</strong><small>All paid artwork is approved and exportable.</small></div>
                                  <ArrowRight size={17} />
                                </button>
                              )}
                              {pendingArtwork.length === 0 && submittedOrders.length === 0 && printReadyRuns.length === 0 && (
                                <div className="admin-all-clear">
                                  <Check size={20} />
                                  <div><strong>You're all caught up</strong><small>There are no urgent admin tasks right now.</small></div>
                                </div>
                              )}
                            </div>
                          </section>

                          <section className="admin-panel">
                            <div className="admin-panel-head">
                              <div>
                                <p className="kicker">PRODUCTION</p>
                                <h2>Active runs</h2>
                              </div>
                              <button onClick={() => setAdminSection('production')}>Manage production <ArrowRight size={15} /></button>
                            </div>
                            <div className="admin-run-overview">
                              {adminRuns.map((item) => {
                                const bag = firstRelation(item.bag_sizes)
                                const sales = adminRunSales[item.id] ?? { sold: 0, reserved: 0 }
                                const capacity = bag?.total_square_count ?? 0
                                const soldPercent = capacity > 0 ? Math.round((sales.sold / capacity) * 100) : 0
                                const stage = RUN_PROGRESS.find((step) => step.key === item.status)?.label ?? item.status.replaceAll('_', ' ')
                                return (
                                  <article key={item.id}>
                                    <div><strong>{bag?.name ?? 'Bag'}</strong><span>{item.run_code}</span></div>
                                    <div className="admin-run-meta"><span>{stage}</span><strong>{soldPercent}% sold</strong></div>
                                    <div className="campaign-sales-bar"><i style={{ width: `${Math.min(100, soldPercent)}%` }} /></div>
                                    <small>{sales.sold} sold · {sales.reserved} reserved · {capacity} total</small>
                                  </article>
                                )
                              })}
                            </div>
                          </section>
                        </div>
                      )
                    })()}

                    {adminSection === 'advertising' && (() => {
                      const query = adminSearch.trim().toLowerCase()
                      const filteredBookings = adminBookings.filter((booking) => {
                        const runRelation = firstRelation(booking.production_runs)
                        const bagRelation = firstRelation(runRelation?.bag_sizes)
                        const profile = firstRelation(booking.profiles)
                        const matchesFilter = adminBookingFilter === 'all' || booking.status === adminBookingFilter
                        const haystack = [profile?.display_name, runRelation?.run_code, bagRelation?.name, booking.panel, booking.id].filter(Boolean).join(' ').toLowerCase()
                        return matchesFilter && (!query || haystack.includes(query))
                      })

                      return (
                        <div className="admin-page-stack">
                          <section className="admin-panel">
                            <div className="admin-panel-head admin-filter-head">
                              <div>
                                <p className="kicker">ADVERTISING</p>
                                <h2>Purchases & bookings</h2>
                                <span>{filteredBookings.length} result{filteredBookings.length === 1 ? '' : 's'}</span>
                              </div>
                              <div className="admin-filters">
                                <input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Search advertiser, run or booking…" />
                                <select value={adminBookingFilter} onChange={(event) => setAdminBookingFilter(event.target.value)}>
                                  <option value="all">All statuses</option>
                                  <option value="paid">Paid</option>
                                  <option value="reserved">Reserved</option>
                                  <option value="cancelled">Cancelled</option>
                                  <option value="expired">Expired</option>
                                  <option value="refunded">Refunded</option>
                                </select>
                              </div>
                            </div>

                            {filteredBookings.length === 0 ? (
                              <p className="admin-empty">No advertising bookings match these filters.</p>
                            ) : (
                              <div className="admin-table-wrap">
                                <table className="admin-table">
                                  <thead><tr><th>Advertiser</th><th>Run</th><th>Placement</th><th>Amount</th><th>Payment</th><th>Artwork</th><th>Date</th></tr></thead>
                                  <tbody>
                                    {filteredBookings.map((booking) => {
                                      const runRelation = firstRelation(booking.production_runs)
                                      const bagRelation = firstRelation(runRelation?.bag_sizes)
                                      const profile = firstRelation(booking.profiles)
                                      return (
                                        <tr key={booking.id}>
                                          <td><strong>{profile?.display_name ?? 'Advertiser'}</strong><small>#{booking.id.slice(0, 8).toUpperCase()}</small></td>
                                          <td><strong>{bagRelation?.name ?? 'Bag'}</strong><small>{runRelation?.run_code ?? 'Run'}</small></td>
                                          <td><strong>{booking.height_cells} × {booking.width_cells}</strong><small>{booking.panel} · {booking.square_count} squares</small></td>
                                          <td><strong>£{(booking.total_pence / 100).toFixed(2)}</strong></td>
                                          <td><span className={`admin-status admin-status-${booking.status}`}>{booking.status.replaceAll('_', ' ')}</span></td>
                                          <td><span className={`admin-status admin-status-${booking.artwork_review_status}`}>{booking.artwork_review_status.replaceAll('_', ' ')}</span></td>
                                          <td><small>{new Date(booking.created_at).toLocaleDateString('en-GB')}</small></td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </section>
                        </div>
                      )
                    })()}

                    {adminSection === 'artwork' && (() => {
                      const artworkBookings = [...adminBookings]
                        .filter((booking) => booking.status === 'paid' && Boolean(booking.artwork_path))
                        .sort((a, b) => Number(a.artwork_review_status !== 'pending') - Number(b.artwork_review_status !== 'pending'))

                      return (
                        <div className="admin-page-stack">
                          <section className="admin-panel">
                            <div className="admin-panel-head">
                              <div>
                                <p className="kicker">ARTWORK</p>
                                <h2>Review advertiser artwork</h2>
                                <span>{artworkBookings.filter((booking) => booking.artwork_review_status === 'pending').length} pending approval</span>
                              </div>
                            </div>

                            {artworkBookings.length === 0 ? (
                              <p className="admin-empty">There is no paid advertiser artwork to review yet.</p>
                            ) : (
                              <div className="admin-artwork-grid">
                                {artworkBookings.map((booking) => {
                                  const runRelation = firstRelation(booking.production_runs)
                                  const bagRelation = firstRelation(runRelation?.bag_sizes)
                                  const profile = firstRelation(booking.profiles)
                                  return (
                                    <article className={`admin-artwork-card ${booking.artwork_review_status === 'pending' ? 'pending' : ''}`} key={booking.id}>
                                      <div className="admin-artwork-preview">
                                        {adminArtworkUrls[booking.id]
                                          ? <img src={adminArtworkUrls[booking.id]} alt="Advertiser artwork" />
                                          : <div>No preview available</div>}
                                      </div>
                                      <div className="admin-artwork-body">
                                        <div className="admin-artwork-title">
                                          <div>
                                            <strong>{profile?.display_name ?? 'Advertiser'}</strong>
                                            <span>{bagRelation?.name ?? 'Bag'} · {runRelation?.run_code ?? 'Run'} · {booking.panel}</span>
                                          </div>
                                          <span className={`admin-status admin-status-${booking.artwork_review_status}`}>{booking.artwork_review_status.replaceAll('_', ' ')}</span>
                                        </div>
                                        <div className="admin-artwork-facts">
                                          <span><small>Space</small><strong>{booking.height_cells} × {booking.width_cells}</strong></span>
                                          <span><small>Squares</small><strong>{booking.square_count}</strong></span>
                                          <span><small>Paid</small><strong>£{(booking.total_pence / 100).toFixed(2)}</strong></span>
                                        </div>
                                        {booking.artwork_review_notes && <p className="admin-review-note">{booking.artwork_review_notes}</p>}
                                        <div className="admin-artwork-actions">
                                          <button className="approve" onClick={() => updateArtworkReview(booking.id, 'approved')}><Check size={15} /> Approve</button>
                                          <button onClick={() => updateArtworkReview(booking.id, 'changes_requested')}>Request changes</button>
                                          <button className="reject" onClick={() => updateArtworkReview(booking.id, 'rejected')}>Reject</button>
                                        </div>
                                      </div>
                                    </article>
                                  )
                                })}
                              </div>
                            )}
                          </section>
                        </div>
                      )
                    })()}

                    {adminSection === 'production' && (
                      <div className="admin-page-stack">
                        <section className="admin-panel admin-pricing-panel">
                          <div className="admin-panel-head">
                            <div>
                              <p className="kicker">COMMERCIAL SETTINGS</p>
                              <h2>Prices</h2>
                              <span>Set the live advert price for each production run and the flat shipping charge for free packaging orders.</span>
                            </div>
                          </div>
                          <div className="admin-shipping-setting">
                            <div>
                              <strong>Packaging order shipping</strong>
                              <span>Flat delivery charge per takeaway order</span>
                            </div>
                            <form onSubmit={(event) => {
                              event.preventDefault()
                              const form = new FormData(event.currentTarget)
                              void updateShippingPrice(Number(form.get('shipping_price')))
                            }}>
                              <label>£
                                <input name="shipping_price" type="number" min="0" step="0.01" defaultValue={(shippingPricePence / 100).toFixed(2)} />
                              </label>
                              <button type="submit">Save shipping</button>
                            </form>
                          </div>
                        </section>

                        <section className="admin-panel">
                          <div className="admin-panel-head">
                            <div>
                              <p className="kicker">PRODUCTION</p>
                              <h2>Production runs</h2>
                              <span>Move each bag run through advertising, artwork and print.</span>
                            </div>
                          </div>

                          <div className="admin-production-grid">
                            {adminRuns.map((item) => {
                              const bag = firstRelation(item.bag_sizes)
                              const sales = adminRunSales[item.id] ?? { sold: 0, reserved: 0 }
                              const capacity = bag?.total_square_count ?? 0
                              const soldPercent = capacity > 0 ? Math.round((sales.sold / capacity) * 100) : 0
                              const stage = RUN_PROGRESS.find((step) => step.key === item.status)?.label ?? item.status.replaceAll('_', ' ')
                              const paidBookings = adminBookings.filter((booking) =>
                                firstRelation(booking.production_runs)?.id === item.id && booking.status === 'paid',
                              )
                              const approvedArtwork = paidBookings.filter((booking) =>
                                booking.artwork_review_status === 'approved' && Boolean(booking.artwork_path),
                              )
                              const artworkOutstanding = Math.max(0, paidBookings.length - approvedArtwork.length)
                              const printReady = paidBookings.length > 0 && artworkOutstanding === 0

                              return (
                                <article className="admin-production-card" key={item.id}>
                                  <div className="admin-production-title">
                                    <div><strong>{bag?.name ?? 'Bag'}</strong><span>{item.run_code}</span></div>
                                    <span className={`admin-status ${printReady ? 'admin-status-approved' : 'admin-status-pending'}`}>
                                      {printReady ? 'Print ready' : `${artworkOutstanding} artwork pending`}
                                    </span>
                                  </div>
                                  <div className="admin-production-sales">
                                    <div><span>{stage}</span><strong>{soldPercent}% sold</strong></div>
                                    <div className="campaign-sales-bar"><i style={{ width: `${Math.min(100, soldPercent)}%` }} /></div>
                                    <small>{sales.sold} sold · {sales.reserved} reserved · {capacity} total spaces</small>
                                  </div>
                                  <form className="admin-run-price" onSubmit={(event) => {
                                    event.preventDefault()
                                    const form = new FormData(event.currentTarget)
                                    void updateRunPrice(item.id, Number(form.get('ad_price')))
                                  }}>
                                    <div>
                                      <span>Advert price</span>
                                      <small>Per 3cm square</small>
                                    </div>
                                    <label>£
                                      <input name="ad_price" type="number" min="0" step="0.01" defaultValue={(item.price_per_square_pence / 100).toFixed(2)} />
                                    </label>
                                    <button type="submit">Save price</button>
                                  </form>

                                  <div className="admin-production-controls">
                                    <label>
                                      Current stage
                                      <select value={item.status} onChange={(event) => updateRunStatus(item.id, event.target.value as any)}>
                                        <option value="selling">Recruiting advertisers</option>
                                        <option value="funded">Advertising sold</option>
                                        <option value="artwork_review">Artwork approval</option>
                                        <option value="sent_to_print" disabled={!printReady}>Sent for print</option>
                                        <option value="printing" disabled={!printReady}>Printing</option>
                                        <option value="shipping" disabled={!printReady}>Shipping</option>
                                        <option value="in_stock" disabled={!printReady}>In stock</option>
                                        <option value="distributing" disabled={!printReady}>Distribution</option>
                                        <option value="completed" disabled={!printReady}>Completed</option>
                                      </select>
                                    </label>
                                  </div>
                                  <div className="admin-production-actions">
                                    <button onClick={() => updateRunDetails(item)}>Update advertiser message</button>
                                    <button
                                      className="primary"
                                      disabled={adminExportingRun === item.id || !printReady}
                                      onClick={() => void exportProductionPack(item)}
                                    >
                                      <Download size={15} /> {adminExportingRun === item.id ? 'Building pack…' : 'Export print pack'}
                                    </button>
                                  </div>
                                  {(item.status_note || item.estimated_stage_date) && (
                                    <div className="admin-production-note">
                                      {item.status_note && <span>{item.status_note}</span>}
                                      {item.estimated_stage_date && <small>Estimated: {item.estimated_stage_date}</small>}
                                    </div>
                                  )}
                                </article>
                              )
                            })}
                          </div>
                        </section>
                      </div>
                    )}

                    {adminSection === 'orders' && (
                      <div className="admin-page-stack">
                        <section className="admin-panel">
                          <div className="admin-panel-head">
                            <div>
                              <p className="kicker">TAKEAWAYS</p>
                              <h2>Free bag orders</h2>
                              <span>{adminOrders.length} order{adminOrders.length === 1 ? '' : 's'} in total</span>
                            </div>
                          </div>

                          {adminOrders.length === 0 ? (
                            <p className="admin-empty">No takeaway orders yet.</p>
                          ) : (
                            <div className="admin-table-wrap">
                              <table className="admin-table">
                                <thead><tr><th>Business</th><th>Postcode</th><th>Boxes</th><th>Bags</th><th>Shipping</th><th>Ordered</th><th>Status</th></tr></thead>
                                <tbody>
                                  {adminOrders.map((order) => {
                                    const business = firstRelation(order.takeaway_businesses)
                                    const boxes = order.takeaway_order_items.reduce((sum, item) => sum + item.boxes, 0)
                                    const bags = order.takeaway_order_items.reduce((sum, item) => sum + item.boxes * item.bags_per_box, 0)
                                    return (
                                      <tr key={order.id}>
                                        <td><strong>{business?.business_name ?? 'Takeaway'}</strong><small>#{order.id.slice(0, 8).toUpperCase()}</small></td>
                                        <td>{business?.postcode ?? '—'}</td>
                                        <td><strong>{boxes}</strong></td>
                                        <td>{bags.toLocaleString('en-GB')}</td>
                                        <td><strong>£{(order.shipping_pence / 100).toFixed(2)}</strong><small>{order.shipping_paid_at ? 'Paid' : order.shipping_pence > 0 ? 'Awaiting payment' : 'Free'}</small></td>
                                        <td><small>{new Date(order.created_at).toLocaleDateString('en-GB')}</small></td>
                                        <td>
                                          <select className="admin-order-select" value={order.status} onChange={(event) => updateOrderStatus(order.id, event.target.value as any)}>
                                            <option value="submitted">Submitted</option>
                                            <option value="approved">Approved</option>
                                            <option value="dispatching">Dispatching</option>
                                            <option value="dispatched">Dispatched</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                          </select>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </section>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {paymentSuccessOpen && paymentSuccess && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPaymentSuccessOpen(false)}>
          <section
            className="checkout-modal payment-success-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Advertising payment confirmation"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setPaymentSuccessOpen(false)} aria-label="Close confirmation">
              <X size={20} />
            </button>

            <div className="payment-success-check"><Check size={28} /></div>
            <p className="kicker">PAYMENT CONFIRMED</p>
            <h2>Your advertising space is secured.</h2>
            <p className="checkout-intro">
              Your booking is now in your FreePack account. You can follow the production run from advertiser recruitment through printing, shipping and distribution.
            </p>

            {(() => {
              const runRelation = firstRelation(paymentSuccess.production_runs)
              const bagRelation = firstRelation(runRelation?.bag_sizes)
              const campaignStatus = RUN_PROGRESS.find((item) => item.key === runRelation?.status)?.label ?? 'Recruiting advertisers'
              const soldPercent = paymentSuccessSales && paymentSuccessSales.capacity > 0
                ? Math.round((paymentSuccessSales.sold / paymentSuccessSales.capacity) * 100)
                : 0

              return (
                <>
                  <div className="payment-receipt-grid">
                    <div>
                      <span>Booking reference</span>
                      <strong>{paymentSuccess.id.slice(0, 8).toUpperCase()}</strong>
                    </div>
                    <div>
                      <span>Bag run</span>
                      <strong>{bagRelation?.name ?? 'Bag'} · {runRelation?.run_code ?? 'Run'}</strong>
                    </div>
                    <div>
                      <span>Your space</span>
                      <strong>{paymentSuccess.height_cells} × {paymentSuccess.width_cells} · {paymentSuccess.panel}</strong>
                    </div>
                    <div>
                      <span>Amount paid</span>
                      <strong>£{(paymentSuccess.total_pence / 100).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Artwork</span>
                      <strong>{paymentSuccess.artwork_review_status.replaceAll('_', ' ')}</strong>
                    </div>
                    <div>
                      <span>Campaign stage</span>
                      <strong>{campaignStatus}</strong>
                    </div>
                  </div>

                  {paymentSuccessSales && (
                    <div className="payment-campaign-progress">
                      <div>
                        <strong>Advertiser recruitment</strong>
                        <span>{paymentSuccessSales.sold} of {paymentSuccessSales.capacity} spaces sold</span>
                      </div>
                      <strong>{soldPercent}%</strong>
                      <div className="campaign-sales-bar">
                        <i style={{ width: `${Math.min(100, soldPercent)}%` }} />
                      </div>
                    </div>
                  )}
                </>
              )
            })()}

            <div className="payment-success-actions">
              <button
                className="button button-dark"
                onClick={() => {
                  setPaymentSuccessOpen(false)
                  setAccountOpen(true)
                }}
              >
                View campaign progress
              </button>
              <button className="button button-light" onClick={() => setPaymentSuccessOpen(false)}>
                Done
              </button>
            </div>
          </section>
        </div>
      )}

      {accountOpen && userId && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setAccountOpen(false)}>
          <section
            className="checkout-modal account-modal"
            role="dialog"
            aria-modal="true"
            aria-label="My Freepack account"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setAccountOpen(false)} aria-label="Close account">
              <X size={20} />
            </button>

            <div className="checkout-icon"><UserRound size={22} /></div>
            <p className="kicker">MY FREEPACK</p>
            <div className="account-title-row">
              <h2>Your account</h2>
              <button
                className="account-signout"
                onClick={async () => {
                  await supabase.auth.signOut()
                  setAccountOpen(false)
                }}
              >
                Sign out
              </button>
            </div>
            <p className="checkout-intro">Track your advertising bookings and free takeaway bag orders in one place.</p>

            {accountLoading && <div className="account-loading">Loading your activity…</div>}
            {accountError && <div className="auth-message">{accountError}</div>}

            {!accountLoading && !accountError && (
              <div className="account-sections">
                <section className="account-section">
                  <div className="account-section-heading">
                    <WalletCards size={18} />
                    <div>
                      <strong>Advertising</strong>
                      <span>{accountBookings.length} booking{accountBookings.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  {accountBookings.length === 0 ? (
                    <p className="account-empty">You haven’t booked any advertising space yet.</p>
                  ) : (
                    <div className="account-list">
                      {accountBookings.map((booking) => {
                        const runRelation = firstRelation(booking.production_runs)
                        const bagRelation = firstRelation(runRelation?.bag_sizes)
                        const statusLabel = booking.status.replaceAll('_', ' ')
                        const runStatus = runRelation?.status ?? 'selling'
                        const progressStep = runProgressStep(runStatus)
                        const sales = runRelation ? accountRunSales[runRelation.id] : undefined
                        const capacity = bagRelation?.total_square_count ?? 0
                        const sold = sales?.sold ?? 0
                        const reserved = sales?.reserved ?? 0
                        const soldPercent = capacity > 0 ? Math.round((sold / capacity) * 100) : 0

                        return (
                          <article className="advertiser-tracker" key={booking.id}>
                            <div className="advertiser-tracker-head">
                              <div>
                                <strong>{bagRelation?.name ?? 'Bag'} · {runRelation?.run_code ?? 'Run'}</strong>
                                <span>{booking.panel} · {booking.square_count} square{booking.square_count === 1 ? '' : 's'} · £{(booking.total_pence / 100).toFixed(2)}</span>
                              </div>
                              <span className={`status-pill status-${booking.status}`}>{statusLabel}</span>
                            </div>

                            <div className={`artwork-review-card artwork-review-${booking.artwork_review_status}`}>
                              <div>
                                <strong>Artwork</strong>
                                <span>{booking.artwork_review_status.replaceAll('_', ' ')}</span>
                              </div>
                              {booking.artwork_review_notes && <p>{booking.artwork_review_notes}</p>}
                              {(booking.artwork_review_status === 'changes_requested' || booking.artwork_review_status === 'rejected') && (
                                <label className="replacement-upload">
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                    hidden
                                    disabled={replacementUploading === booking.id}
                                    onChange={(event) => {
                                      const file = event.target.files?.[0]
                                      void uploadReplacementArtwork(booking, file)
                                      event.currentTarget.value = ''
                                    }}
                                  />
                                  <span className="button button-dark">
                                    {replacementUploading === booking.id ? 'Uploading…' : 'Upload revised artwork'}
                                  </span>
                                </label>
                              )}
                              {booking.artwork_review_status === 'pending' && booking.artwork_path && (
                                <small>Your latest artwork is waiting for FreePack review.</small>
                              )}
                              {booking.artwork_review_status === 'approved' && accountArtworkUrls[booking.id] && (
                                <div className="account-artwork-preview">
                                  <img
                                    src={accountArtworkUrls[booking.id]}
                                    alt={`Approved artwork for ${bagRelation?.name ?? 'bag'} ${runRelation?.run_code ?? 'run'}`}
                                  />
                                </div>
                              )}
                              {booking.artwork_review_status === 'approved' && (
                                <small>Approved for this production run.</small>
                              )}
                            </div>

                            <div className="campaign-sales">
                              <div className="campaign-sales-copy">
                                <strong>{runStatus === 'selling' ? 'Recruiting advertisers' : 'Advertising sales'}</strong>
                                <span>{sold} of {capacity || '—'} spaces sold{reserved ? ` · ${reserved} currently reserved` : ''}</span>
                              </div>
                              <strong>{capacity ? `${soldPercent}%` : '—'}</strong>
                            </div>
                            <div className="campaign-sales-bar">
                              <i style={{ width: `${Math.min(100, soldPercent)}%` }} />
                            </div>

                            {(runRelation?.status_note || runRelation?.estimated_stage_date) && (
                              <div className="campaign-update">
                                <strong>Latest update</strong>
                                {runRelation.status_note && <span>{runRelation.status_note}</span>}
                                {runRelation.estimated_stage_date && (
                                  <small>Estimated date: {new Date(`${runRelation.estimated_stage_date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
                                )}
                              </div>
                            )}

                            <div className="run-timeline" aria-label="Production progress">
                              {RUN_PROGRESS.map((step, index) => {
                                const complete = index < progressStep
                                const current = index === progressStep
                                return (
                                  <div className={`run-step ${complete ? 'complete' : ''} ${current ? 'current' : ''}`} key={step.key}>
                                    <i>{complete ? <Check size={11} /> : index + 1}</i>
                                    <span>{step.label}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </section>

                <section className="account-section">
                  <div className="account-section-heading">
                    <PackageCheck size={18} />
                    <div>
                      <strong>Free bag orders</strong>
                      <span>{accountOrders.length} order{accountOrders.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  {accountOrders.length === 0 ? (
                    <p className="account-empty">You haven’t submitted any free bag orders yet.</p>
                  ) : (
                    <div className="account-list">
                      {accountOrders.map((order) => {
                        const business = firstRelation(order.takeaway_businesses)
                        const boxCount = order.takeaway_order_items.reduce((sum, item) => sum + item.boxes, 0)
                        const bagCount = order.takeaway_order_items.reduce((sum, item) => sum + item.boxes * item.bags_per_box, 0)

                        return (
                          <article className="account-item" key={order.id}>
                            <div>
                              <strong>{business?.business_name ?? 'Takeaway order'}</strong>
                              <span>{boxCount} box{boxCount === 1 ? '' : 'es'} · {bagCount.toLocaleString()} bags</span>
                            </div>
                            <div className="account-item-right">
                              <strong>£{(order.shipping_pence / 100).toFixed(2)} shipping</strong>
                              <span className={`status-pill status-${order.status}`}>{order.status.replaceAll('_', ' ')}</span>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}
          </section>
        </div>
      )}

      {takeawayCheckoutOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setTakeawayCheckoutOpen(false)}>
          <section
            className="checkout-modal takeaway-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Takeaway bag order"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setTakeawayCheckoutOpen(false)} aria-label="Close">
              <X size={20} />
            </button>

            <div className="checkout-icon"><Truck size={22} /></div>
            <p className="kicker">FREE BAG ORDER</p>
            <h2>{takeawayOrderId ? 'Order received' : 'Delivery details'}</h2>

            {takeawayOrderId ? (
              <>
                <div className="order-success">
                  <Check size={22} />
                  <div>
                    <strong>Submitted successfully</strong>
                    <span>Reference {takeawayOrderId.slice(0, 8).toUpperCase()}</span>
                  </div>
                </div>
                <p className="checkout-intro">
                  Your bags remain free. The order is awaiting business verification and stock confirmation.
                </p>
                <button
                  className="button button-dark modal-primary"
                  onClick={() => {
                    setTakeawayCheckoutOpen(false)
                    setTakeawayOrderId(null)
                    setTakeawayMessage('')
                  }}
                >
                  Done
                </button>
              </>
            ) : (
              <form className="takeaway-form" onSubmit={submitTakeawayOrder}>
                <div className="takeaway-order-mini-summary">
                  <strong>{totalBoxes} box{totalBoxes === 1 ? '' : 'es'}</strong>
                  <span>{totalBags.toLocaleString()} bags · shipping £{(takeawayShippingPence / 100).toFixed(2)}</span>
                </div>

                <div className="form-grid">
                  <label className="full">
                    Business name
                    <input
                      required
                      value={takeawayDetails.businessName}
                      onChange={(event) => setTakeawayDetails({ ...takeawayDetails, businessName: event.target.value })}
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      value={takeawayDetails.phone}
                      onChange={(event) => setTakeawayDetails({ ...takeawayDetails, phone: event.target.value })}
                    />
                  </label>
                  <label>
                    Postcode
                    <input
                      required
                      value={takeawayDetails.postcode}
                      onChange={(event) => setTakeawayDetails({ ...takeawayDetails, postcode: event.target.value })}
                    />
                  </label>
                  <label className="full">
                    Address line 1
                    <input
                      required
                      value={takeawayDetails.address1}
                      onChange={(event) => setTakeawayDetails({ ...takeawayDetails, address1: event.target.value })}
                    />
                  </label>
                  <label className="full">
                    Address line 2
                    <input
                      value={takeawayDetails.address2}
                      onChange={(event) => setTakeawayDetails({ ...takeawayDetails, address2: event.target.value })}
                    />
                  </label>
                  <label className="full">
                    Town / city
                    <input
                      value={takeawayDetails.townCity}
                      onChange={(event) => setTakeawayDetails({ ...takeawayDetails, townCity: event.target.value })}
                    />
                  </label>
                  <label className="full">
                    Delivery notes
                    <textarea
                      rows={3}
                      value={takeawayDetails.deliveryNotes}
                      onChange={(event) => setTakeawayDetails({ ...takeawayDetails, deliveryNotes: event.target.value })}
                    />
                  </label>
                </div>

                {takeawayMessage && <div className="auth-message">{takeawayMessage}</div>}

                <button className="button button-dark modal-primary" disabled={takeawaySubmitting}>
                  {takeawaySubmitting
                    ? 'Processing…'
                    : takeawayShippingPence > 0
                      ? `Continue to pay £${(takeawayShippingPence / 100).toFixed(2)} shipping`
                      : 'Submit free bag order'}
                </button>
                <small className="summary-note">
                  Orders are reviewed before dispatch so we can verify the takeaway and manage fair stock allocation.
                </small>
              </form>
            )}
          </section>
        </div>
      )}

      {authOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => { setAuthOpen(false); setAuthReturnTo(null) }}>
          <section
            className="checkout-modal auth-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              authMode === 'signin'
                ? 'Sign in'
                : authMode === 'signup'
                  ? 'Create account'
                  : authMode === 'forgot'
                    ? 'Reset password'
                    : 'Choose new password'
            }
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => { setAuthOpen(false); setAuthReturnTo(null) }} aria-label="Close">
              <X size={20} />
            </button>
            <div className="checkout-icon"><UserRound size={22} /></div>
            <p className="kicker">FREEPACK ACCOUNT</p>
            <h2>
              {authMode === 'signin'
                ? 'Sign in'
                : authMode === 'signup'
                  ? 'Create your account'
                  : authMode === 'forgot'
                    ? 'Reset your password'
                    : 'Choose a new password'}
            </h2>
            <p className="checkout-intro">
              {authMode === 'forgot'
                ? 'Enter your email and we’ll send a secure reset link from FreePack.'
                : authMode === 'reset'
                  ? 'Enter a new password for your account.'
                  : 'Use one account for advertising bookings or free takeaway bag orders.'}
            </p>

            {authMode === 'forgot' ? (
              <form className="auth-form" onSubmit={requestPasswordReset}>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="you@company.co.uk"
                  />
                </label>
                {authMessage && <div className="auth-message">{authMessage}</div>}
                <button className="button button-dark modal-primary" disabled={authLoading}>
                  {authLoading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            ) : authMode === 'reset' ? (
              <form className="auth-form" onSubmit={submitNewPassword}>
                <label>
                  New password
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder="At least 8 characters"
                  />
                </label>
                <label>
                  Confirm new password
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={authConfirmPassword}
                    onChange={(event) => setAuthConfirmPassword(event.target.value)}
                    placeholder="Repeat your password"
                  />
                </label>
                {authMessage && <div className="auth-message">{authMessage}</div>}
                <button className="button button-dark modal-primary" disabled={authLoading}>
                  {authLoading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            ) : (
              <>
                <form className="auth-form" onSubmit={handleAuth}>
                  <label>
                    Email
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(event) => setAuthEmail(event.target.value)}
                      placeholder="you@company.co.uk"
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={authPassword}
                      onChange={(event) => setAuthPassword(event.target.value)}
                      placeholder="At least 8 characters"
                    />
                  </label>
                  {authMessage && <div className="auth-message">{authMessage}</div>}
                  <button className="button button-dark modal-primary" disabled={authLoading}>
                    {authLoading ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                </form>

                {authMode === 'signin' && (
                  <button
                    className="auth-switch auth-forgot"
                    onClick={() => {
                      setAuthMode('forgot')
                      setAuthMessage('')
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </>
            )}

            {authMode !== 'reset' && (
              <button
                className="auth-switch"
                onClick={() => {
                  setAuthMode(authMode === 'signin' || authMode === 'forgot' ? 'signup' : 'signin')
                  setAuthMessage('')
                }}
              >
                {authMode === 'signin' || authMode === 'forgot'
                  ? 'New to Freepack? Create an account'
                  : 'Already have an account? Sign in'}
              </button>
            )}

            {authMode === 'forgot' && (
              <button
                className="auth-switch"
                onClick={() => {
                  setAuthMode('signin')
                  setAuthMessage('')
                }}
              >
                Back to sign in
              </button>
            )}
          </section>
        </div>
      )}

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
              <div><span>Current price</span><strong>£{((selectedCount * squarePricePence) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
            </div>

            <div className="checkout-notice">
              Your selected cells are reserved while you complete checkout. Stripe handles the card payment securely; Freepack never receives your card details.
            </div>

            {reservationMessage && (
              <div className={`reservation-message ${activeBookingId ? 'success' : ''}`}>
                {reservationMessage}
              </div>
            )}

            {!activeBookingId ? (
              <button
                className="button button-dark modal-primary"
                onClick={reserveSelection}
                disabled={reservationLoading}
              >
                {reservationLoading
                  ? 'Reserving…'
                  : userId
                    ? 'Reserve space'
                    : 'Sign in & reserve'}
              </button>
            ) : (
              <button
                className="button stripe-pay-button modal-primary"
                onClick={startStripeCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? 'Opening Stripe…' : 'Pay securely with Stripe'}
              </button>
            )}
          </section>
        </div>
      )}

      <footer className="shell site-footer">
        <a className="footer-brand" href="#" aria-label="Freepack home">
          <img src="/freepack-logo-navy.svg" alt="Freepack" />
        </a>
        <div className="footer-copy">
          <strong>Good packaging goes further.</strong>
          <span>Free takeaway packaging. Paid for by advertising.</span>
        </div>
      </footer>
    </main>
  )
}
