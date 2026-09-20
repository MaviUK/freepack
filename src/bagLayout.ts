export type BagLayoutConfig = {
  cols: number
  rows: number
  widthMm: number
}

export type BagSizeName = 'Small' | 'Medium' | 'Large' | 'XL'

export const AD_CELL_MM = 30
export const MAX_GAP_MM = 3
export const SAFE_MARGIN_MM = 10
export const VERTICAL_EDGE_MARGIN_MM = 6
export const BRAND_TO_AD_GAP_MM = 3

export const BRAND_GAP_AFTER_ROW_BY_SIZE: Record<BagSizeName, number | null> = {
  Small: 3,
  Medium: 4,
  Large: 4,
  XL: 5,
}

export function panelLayout(
  config: BagLayoutConfig,
  heightMm: number,
  brandRows: number[] = [],
  brandGapAfterRow: number | null = null,
) {
  const horizontalGapMm = config.cols <= 1
    ? 0
    : config.cols === 6 && config.widthMm <= 200
      ? 1
      : Math.min(
          MAX_GAP_MM,
          Math.max(
            0,
            (config.widthMm - SAFE_MARGIN_MM * 2 - config.cols * AD_CELL_MM) / (config.cols - 1),
          ),
        )

  const stepXmm = AD_CELL_MM + horizontalGapMm
  const gridWidthMm = config.cols * AD_CELL_MM + Math.max(0, config.cols - 1) * horizontalGapMm
  const offsetXmm = config.cols === 6 && config.widthMm <= 200
    ? Math.max(0, (config.widthMm - gridWidthMm) / 2)
    : Math.max(SAFE_MARGIN_MM, (config.widthMm - gridWidthMm) / 2)
  const rowYmm = Array.from({ length: config.rows }, () => 0)

  if (!brandRows.length && brandGapAfterRow === null) {
    const gridHeightMm = config.rows * AD_CELL_MM + Math.max(0, config.rows - 1) * MAX_GAP_MM
    const offsetYmm = Math.max(VERTICAL_EDGE_MARGIN_MM, (heightMm - gridHeightMm) / 2)

    for (let row = 0; row < config.rows; row += 1) {
      rowYmm[row] = offsetYmm + row * (AD_CELL_MM + MAX_GAP_MM)
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
      MAX_GAP_MM,
      Math.max(0, (availableHeight - rowCount * AD_CELL_MM) / (rowCount - 1)),
    )
  }

  if (topRows.length) {
    const topEndMm = brandZoneTopMm - BRAND_TO_AD_GAP_MM
    const availableHeight = topEndMm - VERTICAL_EDGE_MARGIN_MM
    const gap = fitGap(topRows.length, availableHeight)
    const blockHeight = topRows.length * AD_CELL_MM + (topRows.length - 1) * gap
    const startMm = topEndMm - blockHeight

    topRows.forEach((row, index) => {
      rowYmm[row] = startMm + index * (AD_CELL_MM + gap)
    })
  }

  if (bottomRows.length) {
    const bottomStartMm = brandZoneBottomMm + BRAND_TO_AD_GAP_MM
    const availableHeight = heightMm - VERTICAL_EDGE_MARGIN_MM - bottomStartMm
    const gap = fitGap(bottomRows.length, availableHeight)

    bottomRows.forEach((row, index) => {
      rowYmm[row] = bottomStartMm + index * (AD_CELL_MM + gap)
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

export function placementRectMm(
  layout: ReturnType<typeof panelLayout>,
  topRow: number,
  leftCol: number,
  widthCells: number,
  heightCells: number,
) {
  const bottomRow = topRow + heightCells - 1
  const xMm = layout.offsetXmm + leftCol * layout.stepMm
  const yMm = layout.rowYmm[topRow]
  const rightMm = xMm + widthCells * AD_CELL_MM + Math.max(0, widthCells - 1) * layout.horizontalGapMm
  const bottomMm = layout.rowYmm[bottomRow] + AD_CELL_MM

  return {
    xMm,
    yMm,
    widthMm: rightMm - xMm,
    heightMm: bottomMm - yMm,
  }
}
