"use client"

interface FpGaugeProps {
  current: number
  max: number
  accentColor: string
  onIncrement: () => void
  onDecrement: () => void
}

const ROW1 = 13 // 上段セグメント数
const SEG_H_FILLED = 7
const SEG_H_EMPTY = 5

function SegmentRow({ from, to, current, accentColor }: {
  from: number; to: number; current: number; accentColor: string
}) {
  return (
    <div className="flex items-center w-full" style={{ gap: 1.5, height: SEG_H_FILLED + 1 }}>
      {Array.from({ length: to - from }).map((_, i) => {
        const idx = from + i
        const filled = idx < current
        return (
          <div
            key={idx}
            className="flex-1 rounded-full"
            style={{
              height: filled ? SEG_H_FILLED : SEG_H_EMPTY,
              background: filled ? accentColor : "rgba(30,41,59,0.9)",
              boxShadow: filled ? `0 0 3px ${accentColor}60` : "none",
              transition: "background 0.15s, height 0.15s",
            }}
          />
        )
      })}
    </div>
  )
}

export function FpGauge({ current, max, accentColor, onIncrement, onDecrement }: FpGaugeProps) {
  const row1End = Math.min(ROW1, max)
  const row2End = max

  return (
    <div className="flex flex-col" style={{ paddingTop: 4, paddingBottom: 4, gap: 3 }}>
      {/* 数値表示 */}
      <div className="flex items-center justify-center" style={{ lineHeight: 1 }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: accentColor,
          opacity: 0.9,
        }}>
          {current}
          <span style={{ opacity: 0.5, fontWeight: 400 }}>/{max}</span>
        </span>
      </div>

      {/* ゲージ行 + ボタン */}
      <div className="flex items-center justify-between px-1" style={{ height: 24 }}>
        {/* − ボタン */}
        <button
          onClick={onDecrement}
          disabled={current === 0}
          className="flex items-center justify-center w-5 h-5 rounded text-xs font-bold transition-colors shrink-0"
          style={{
            color: current === 0 ? "rgba(71,85,105,0.5)" : "rgba(148,163,184,0.9)",
            background: current === 0 ? "transparent" : "rgba(30,41,59,0.8)",
          }}
          aria-label="フレンドポイントを減らす"
        >
          −
        </button>

        {/* ゲージ: 上下2行 */}
        <div className="flex-1 flex flex-col justify-center mx-1" style={{ gap: 2 }}>
          <SegmentRow from={0} to={row1End} current={current} accentColor={accentColor} />
          {max > ROW1 && (
            <SegmentRow from={row1End} to={row2End} current={current} accentColor={accentColor} />
          )}
        </div>

        {/* + ボタン */}
        <button
          onClick={onIncrement}
          disabled={current === max}
          className="flex items-center justify-center w-5 h-5 rounded text-xs font-bold transition-colors shrink-0"
          style={{
            color: current === max ? "rgba(71,85,105,0.5)" : "rgba(148,163,184,0.9)",
            background: current === max ? "transparent" : "rgba(30,41,59,0.8)",
          }}
          aria-label="フレンドポイントを増やす"
        >
          +
        </button>
      </div>
    </div>
  )
}
