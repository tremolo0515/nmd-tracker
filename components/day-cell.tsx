"use client"

import { cn } from "@/lib/utils"

export type CellState = "pending" | "missed" | "appeared" | "unrecorded"

interface DayCellProps {
  state: CellState
  accentColor: string
  probability?: number
  showProbability?: boolean
  onStateChange: (newState: CellState) => void
}

export function DayCell({ state, accentColor, probability, showProbability = true, onStateChange }: DayCellProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextState: CellState =
      state === "pending" ? "missed" :
      state === "missed" ? "appeared" :
      state === "appeared" ? "unrecorded" : "pending"
    onStateChange(nextState)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative flex flex-col items-center justify-center",
        "w-16 h-18 rounded-xl transition-all duration-200",
        "active:scale-95 touch-manipulation select-none",
        state === "pending" && "bg-slate-800/50 border border-slate-700/50",
        state === "appeared" && "border",
        state === "missed" && "bg-slate-900/60 border border-slate-800/50",
        state === "unrecorded" && "bg-slate-800/30 border border-slate-700/30",
      )}
      style={{
        ...(state === "appeared" && {
          background: `linear-gradient(135deg, ${accentColor}35 0%, ${accentColor}15 100%)`,
          borderColor: `${accentColor}80`,
          boxShadow: `0 0 12px ${accentColor}40`,
        }),
      }}
    >
      {/* 状態アイコン: 中央固定 */}
      <div className={cn(
        "text-xl font-bold leading-none transition-all duration-200",
        state === "pending" && "text-slate-500",
        state === "appeared" && "text-white",
        state === "missed" && "text-slate-500",
        state === "unrecorded" && "text-slate-600",
      )}>
        {state === "pending" && "?"}
        {state === "appeared" && "○"}
        {state === "missed" && "×"}
        {state === "unrecorded" && "−"}
      </div>

      {/* 確率表示: 下辺固定・確率に応じて視差 */}
      <span className={cn(
        "absolute bottom-1.5 leading-none font-semibold transition-all duration-300",
        state === "pending" && probability !== undefined && showProbability ? (
          probability >= 100
            ? "text-[14px] text-amber-300"   // 100%: 大・金色
            : probability >= 50
            ? "text-[13px] text-slate-300"   // 50%: 中・明るいグレー
            : "text-[12px] text-slate-500"   // 17%: 小・暗いグレー
        ) : "invisible text-[12px]",
      )}
      style={
        state === "pending" && probability !== undefined && showProbability ? (
          probability >= 100
            ? { textShadow: `0 0 6px rgba(251,191,36,0.35)` }  // 100%: 金色グロー（控えめ）
            : probability >= 50
            ? { textShadow: `0 0 4px rgba(148,163,184,0.2)` } // 50%: 薄いグロー（控えめ）
            : undefined
        ) : undefined
      }>
        {probability !== undefined && (probability >= 100 ? "100%" : `${probability.toFixed(0)}%`)}
      </span>
    </button>
  )
}
