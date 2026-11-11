import { Children } from 'react'
import type { CSSProperties, ReactNode } from 'react'

type BalancedGridProps = {
  children: ReactNode
  className?: string
}

/**
 * Membagi item menjadi baris seimbang dengan maksimal empat item per baris.
 * Contoh: 5 item = 3/2, 6 item = 3/3, 10 item = 4/3/3.
 */
export default function BalancedGrid({ children, className = '' }: BalancedGridProps) {
  const items = Children.toArray(children)
  if (items.length === 0) return null

  const rowCount = Math.ceil(items.length / 4)
  const baseItemsPerRow = Math.floor(items.length / rowCount)
  const extraItems = items.length % rowCount
  let itemIndex = 0

  const rows = Array.from({ length: rowCount }, (_, rowIndex) => {
    const rowSize = baseItemsPerRow + (rowIndex < extraItems ? 1 : 0)
    const rowItems = items.slice(itemIndex, itemIndex + rowSize)
    itemIndex += rowSize
    return { rowSize, rowItems }
  })

  return (
    <div className={`balanced-grid ${className}`}>
      {rows.map(({ rowSize, rowItems }, rowIndex) => (
        <div
          key={rowIndex}
          className="balanced-grid-row"
          style={{ '--row-items': rowSize } as CSSProperties}
        >
          {rowItems.map((item, itemIndexInRow) => (
            <div key={itemIndexInRow} className="balanced-grid-item">
              {item}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
