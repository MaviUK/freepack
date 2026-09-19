import { useEffect, useMemo, useRef, useState } from 'react'
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
  UserRound,
  WalletCards,
  ShieldCheck,
  X,
} from 'lucide-react'
import Bag3D from './Bag3D'
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
  bag_sizes: { name: string; total_square_count: number } | { name: string; total_square_count: number }[] | null
}

type AccountBooking = {
  id: string
  status: string
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
  const face = gridCount(run.faceWidth, run.height)
  const side = gridCount(run.sideWidth, run.height)

  return {
    front: { label: 'Front', shortLabel: 'Front', cols: face.cols, rows: face.rows, widthMm: run.faceWidth },
    right: { label: 'Right side', shortLabel: 'Right', cols: side.cols, rows: side.rows, widthMm: run.sideWidth },
    back: { label: 'Back', shortLabel: 'Back', cols: face.cols, rows: face.rows, widthMm: run.faceWidth },
    left: { label: 'Left side', shortLabel: 'Left', cols: side.cols, rows: side.rows, widthMm: run.sideWidth },
  }
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
  const [runs, setRuns] = useState<BagRun[]>(BAG_RUNS)
  const [runsLoading, setRunsLoading] = useState(true)
  const [runId, setRunId] = useState('L-001')
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
  const [artworkFile, setArtworkFile] = useState<File | null>(null)
  const [reservationLoading, setReservationLoading] = useState(false)
  const [reservationMessage, setReservationMessage] = useState('')
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [paymentBanner, setPaymentBanner] = useState('')
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccess | null>(null)
  const [paymentSuccessSales, setPaymentSuccessSales] = useState<{ sold: number; capacity: number } | null>(null)
  const [paymentSuccessOpen, setPaymentSuccessOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountLoading, setAccountLoading] = useState(false)
  const [accountBookings, setAccountBookings] = useState<AccountBooking[]>([])
  const [accountRunSales, setAccountRunSales] = useState<Record<string, { sold: number; reserved: number }>>({})
  const [accountOrders, setAccountOrders] = useState<AccountOrder[]>([])
  const [accountError, setAccountError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminMessage, setAdminMessage] = useState('')
  const [adminBookings, setAdminBookings] = useState<AdminBooking[]>([])
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([])
  const [adminRuns, setAdminRuns] = useState<AdminRun[]>([])
  const [adminRunSales, setAdminRunSales] = useState<Record<string, { sold: number; reserved: number }>>({})
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
  const panel = panels[panelKey]
  const soldCells = useMemo(() => new Set(run.soldByPanel[panelKey]), [run, panelKey])

  const panelSquares = panel.cols * panel.rows
  const panelSold = run.soldByPanel[panelKey].length
  const panelAvailable = panelSquares - panelSold
  const panelAvailability = Math.round((panelAvailable / panelSquares) * 100)

  const totalSold = PANEL_ORDER.reduce((sum, key) => sum + run.soldByPanel[key].length, 0)
  const totalAvailable = run.totalBagSquares - totalSold
  const totalAvailability = Math.round((totalAvailable / run.totalBagSquares) * 100)
  const squarePricePence = run.pricePerSquarePence ?? DEMO_SQUARE_PRICE * 100

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const payment = params.get('payment')
    const sessionId = params.get('session_id')
    const confirmToken = params.get('confirm_token')
    const confirmType = params.get('confirm_type')
    const resetToken = params.get('reset_token')
    const resetType = params.get('reset_type')
    setPaymentSessionId(sessionId)

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
      setPaymentBanner('Payment was cancelled. Your reserved space remains held until the reservation expires.')
    }

    async function syncAuthState() {
      const { data } = await supabase.auth.getClaims()
      const id = data?.claims?.sub ?? null
      setUserId(id)

      if (!id) {
        setIsAdmin(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', id)
        .maybeSingle()

      setIsAdmin(profile?.account_type === 'admin')
    }

    syncAuthState()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async () => {
      await syncAuthState()
    })

    return () => subscription.unsubscribe()
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
        (payload) => {
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
    if (!accountOpen || !userId) return

    let cancelled = false

    async function loadAccountData() {
      setAccountLoading(true)
      setAccountError('')

      const [bookingsResult, ordersResult] = await Promise.all([
        supabase
          .from('ad_bookings')
          .select(`
            id,
            status,
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
            submitted_at,
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
            bag_sizes (name, total_square_count)
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

  async function updateRunStatus(runDbId: string, status: 'selling' | 'funded' | 'artwork_review' | 'sent_to_print' | 'printing' | 'shipping' | 'in_stock' | 'distributing' | 'completed') {
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
    setPanelKey(key)
    clearSelection()
  }

  function rotatePanel(direction: 1 | -1) {
    const index = PANEL_ORDER.indexOf(panelKey)
    const nextIndex = (index + direction + PANEL_ORDER.length) % PANEL_ORDER.length
    changePanel(PANEL_ORDER[nextIndex])
  }

  function chooseGridCell(targetPanel: PanelKey, point: Point) {
    const targetSoldCells = new Set(run.soldByPanel[targetPanel])
    const key = `${point.row}-${point.col}`
    if (targetSoldCells.has(key)) return

    const changingPanel = targetPanel !== panelKey

    if (!selection || changingPanel) {
      const rect = makeRect(point, point)
      if (changingPanel) setPanelKey(targetPanel)
      setPreview(rect)
      setSelection(rect)
      setPlacementMessage('1 × 1 selected. Tap a free square directly beside it to add a row or column.')
      setArtwork(null)
      setArtworkFile(null)
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
    const blocked = addedCells.some((cellKey) => targetSoldCells.has(cellKey))

    if (blocked) {
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

  return (
    <main>
      {paymentBanner && (
        <div className="payment-banner">
          <span>{paymentBanner}</span>
          <button onClick={() => setPaymentBanner('')} aria-label="Dismiss payment message"><X size={16} /></button>
        </div>
      )}
      <header className="nav shell">
        <a className="brand" href="#" aria-label="freepack home">freepack.</a>
        <nav>
          <a href="#how">How it works</a>
          <a href="#bags">Free bags</a>
          <a href="#advertise">Advertise</a>
        </nav>
        {userId ? (
          <div className="nav-actions">
            {isAdmin && (
              <button className="button button-light admin-nav-button" onClick={() => setAdminOpen(true)}>
                Admin
              </button>
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
          <p>Choose a run, rotate the bag, tap a 3 cm × 3 cm unit and grow a rectangular space directly on the 3D bag before uploading your artwork.</p>
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
            <button
              className="button button-dark takeaway-continue"
              disabled={totalBoxes === 0}
              onClick={openTakeawayCheckout}
            >
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
            Build your advert directly on the bag. Start with 1 × 1, tap left or right to add a column,
            then tap above or below to add a row. For example: 1 × 1 → 1 × 2 → 2 × 2 → 3 × 2.
          </p>

          {runsLoading && <div className="live-data-note">Loading live run availability…</div>}
          <div className="run-switcher" aria-label="Choose bag run">
            {runs.map((item) => (
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
              <strong>£{(squarePricePence / 100).toFixed(2)}</strong>
            </div>
            <div className="quote-total">
              <span>Demo total</span>
              <strong>£{((selectedCount * squarePricePence) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            <small>Live pricing is loaded from the production run. The same square price applies across every bag face.</small>
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

        <div className="bag-wrap bag-wrap-true3d">
          <Bag3D
            widthMm={run.faceWidth}
            depthMm={run.sideWidth}
            heightMm={run.height}
            panels={panels}
            soldByPanel={run.soldByPanel}
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
              ? `Selected: ${shapeLabel(selection)} on ${panel.label}. Rotate the bag and tap a free square beside the selected edge to grow it.`
              : 'Rotate the bag freely, then tap any available grid square to start with 1 × 1.'}
          </p>
        </div>
      </section>

      {adminOpen && isAdmin && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setAdminOpen(false)}>
          <section
            className="checkout-modal admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Freepack admin"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setAdminOpen(false)} aria-label="Close admin">
              <X size={20} />
            </button>

            <div className="checkout-icon"><ShieldCheck size={22} /></div>
            <p className="kicker">PLATFORM ADMIN</p>
            <h2>Freepack control room</h2>
            <p className="checkout-intro">Approve artwork, progress takeaway orders and move production runs through the workflow.</p>

            {adminLoading && <div className="account-loading">Loading live platform data…</div>}
            {adminMessage && <div className="auth-message">{adminMessage}</div>}

            {!adminLoading && (
              <div className="admin-sections">
                <section className="admin-section">
                  <div className="account-section-heading">
                    <ImagePlus size={18} />
                    <div>
                      <strong>Artwork review</strong>
                      <span>{adminBookings.filter((booking) => booking.artwork_review_status === 'pending').length} pending</span>
                    </div>
                  </div>

                  <div className="admin-list">
                    {adminBookings.length === 0 && <p className="account-empty">No advertising bookings yet.</p>}
                    {adminBookings.map((booking) => {
                      const runRelation = firstRelation(booking.production_runs)
                      const bagRelation = firstRelation(runRelation?.bag_sizes)
                      const profile = firstRelation(booking.profiles)

                      return (
                        <article className="admin-item" key={booking.id}>
                          {adminArtworkUrls[booking.id] ? (
                            <img src={adminArtworkUrls[booking.id]} alt="Advertiser artwork" />
                          ) : (
                            <div className="admin-art-placeholder">No preview</div>
                          )}
                          <div className="admin-item-copy">
                            <strong>{bagRelation?.name ?? 'Bag'} · {runRelation?.run_code ?? 'Run'} · {booking.panel}</strong>
                            <span>{profile?.display_name ?? 'Advertiser'} · {booking.square_count} squares · £{(booking.total_pence / 100).toFixed(2)}</span>
                            <span className={`status-pill status-${booking.artwork_review_status}`}>{booking.artwork_review_status.replaceAll('_', ' ')}</span>
                            {booking.artwork_review_notes && <small>{booking.artwork_review_notes}</small>}
                          </div>
                          <div className="admin-actions">
                            <button onClick={() => updateArtworkReview(booking.id, 'approved')}>Approve</button>
                            <button onClick={() => updateArtworkReview(booking.id, 'changes_requested')}>Changes</button>
                            <button onClick={() => updateArtworkReview(booking.id, 'rejected')}>Reject</button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>

                <section className="admin-section">
                  <div className="account-section-heading">
                    <Truck size={18} />
                    <div>
                      <strong>Takeaway orders</strong>
                      <span>{adminOrders.length} total</span>
                    </div>
                  </div>

                  <div className="admin-list compact">
                    {adminOrders.length === 0 && <p className="account-empty">No takeaway orders yet.</p>}
                    {adminOrders.map((order) => {
                      const business = firstRelation(order.takeaway_businesses)
                      const boxes = order.takeaway_order_items.reduce((sum, item) => sum + item.boxes, 0)

                      return (
                        <article className="admin-item order-admin-item" key={order.id}>
                          <div className="admin-item-copy">
                            <strong>{business?.business_name ?? 'Takeaway'}</strong>
                            <span>{business?.postcode ?? 'No postcode'} · {boxes} box{boxes === 1 ? '' : 'es'}</span>
                          </div>
                          <select value={order.status} onChange={(event) => updateOrderStatus(order.id, event.target.value as any)}>
                            <option value="submitted">Submitted</option>
                            <option value="approved">Approved</option>
                            <option value="dispatching">Dispatching</option>
                            <option value="dispatched">Dispatched</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </article>
                      )
                    })}
                  </div>
                </section>

                <section className="admin-section">
                  <div className="account-section-heading">
                    <Box size={18} />
                    <div>
                      <strong>Production runs</strong>
                      <span>{adminRuns.length} runs</span>
                    </div>
                  </div>

                  <div className="admin-list compact">
                    {adminRuns.map((item) => {
                      const bag = firstRelation(item.bag_sizes)
                      const sales = adminRunSales[item.id] ?? { sold: 0, reserved: 0 }
                      const capacity = bag?.total_square_count ?? 0
                      const soldPercent = capacity > 0 ? Math.round((sales.sold / capacity) * 100) : 0
                      const stage = RUN_PROGRESS.find((step) => step.key === item.status)?.label ?? item.status.replaceAll('_', ' ')

                      return (
                        <article className="admin-campaign-item" key={item.id}>
                          <div className="admin-campaign-head">
                            <div className="admin-item-copy">
                              <strong>{bag?.name ?? 'Bag'} · {item.run_code}</strong>
                              <span>{stage} · £{(item.price_per_square_pence / 100).toFixed(2)} / square</span>
                            </div>
                            <strong>{capacity ? `${soldPercent}% sold` : '—'}</strong>
                          </div>

                          <div className="admin-campaign-sales">
                            <span>{sales.sold} sold · {sales.reserved} reserved · {capacity || '—'} total spaces</span>
                            <div className="campaign-sales-bar">
                              <i style={{ width: `${Math.min(100, soldPercent)}%` }} />
                            </div>
                          </div>

                          <div className="admin-campaign-controls">
                            <label>
                              Campaign stage
                              <select value={item.status} onChange={(event) => updateRunStatus(item.id, event.target.value as any)}>
                                <option value="selling">Recruiting advertisers</option>
                                <option value="funded">Advertising sold</option>
                                <option value="artwork_review">Artwork approval</option>
                                <option value="sent_to_print">Sent for print</option>
                                <option value="printing">Printing</option>
                                <option value="shipping">Shipping</option>
                                <option value="in_stock">In stock</option>
                                <option value="distributing">Distribution</option>
                                <option value="completed">Completed</option>
                              </select>
                            </label>
                            <button className="button button-light" onClick={() => updateRunDetails(item)}>
                              Update advertiser message
                            </button>
                          </div>

                          {(item.status_note || item.estimated_stage_date) && (
                            <div className="admin-campaign-note">
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
                              <strong>£0.00</strong>
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
                  <span>{totalBags.toLocaleString()} bags · £0.00</span>
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
                  {takeawaySubmitting ? 'Submitting…' : 'Submit free bag order'}
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

      <footer className="shell">
        <span className="brand">freepack.</span>
        <span>Free packaging. Paid for by advertising.</span>
      </footer>
    </main>
  )
}
