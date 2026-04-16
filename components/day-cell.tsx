"use client"

import { cn } from "@/lib/utils"

export type CellState = "unrecorded" | "appeared" | "missed"

interface DayCellProps {
  day: number
  state: CellState
  accentColor: string
  probability?: number
  onStateChange: (newState: CellState) => void
}

export function DayCell({ day, state, accentColor, probability, onStateChange }: DayCellProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextState: CellState =
      state === "unrecorded" ? "appeared" :
      state === "appeared" ? "missed" : "unrecorded"
    onStateChange(nextState)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5",
        "w-16 h-18 rounded-xl transition-all duration-200",
        "active:scale-95 touch-manipulation select-none",
        state === "unrecorded" && "bg-slate-800/50 border border-slate-700/50",
        state === "appeared" && "border",
        state === "missed" && "bg-slate-900/60 border border-slate-800/50",
      )}
      style={{
        ...(state === "appeared" && {
          background: `linear-gradient(135deg, ${accentColor}35 0%, ${accentColor}15 100%)`,
          borderColor: `${accentColor}80`,
          boxShadow: `0 0 12px ${accentColor}40`,
        }),
      }}
    >
      {/* 日付ラベル */}
      <span className={cn(
        "text-[10px] font-medium",
        state === "appeared" ? "text-white/90" : "text-slate-500"
      )}>
        {day}日目
      </span>

      {/* 状態アイコン */}
      <div className={cn(
        "text-lg font-bold leading-none transition-all duration-200",
        state === "unrecorded" && "text-slate-600",
        state === "appeared" && "text-white",
        state === "missed" && "text-slate-600",
      )}>
        {state === "unrecorded" && "−"}
        {state === "appeared" && "○"}
        {state === "missed" && "×"}
      </div>

      {/* 未記録セルの確率 */}
      {state === "unrecorded" && probability !== undefined && (
        <span className="text-[9px] font-medium text-slate-500 leading-none">
          {probability >= 100 ? "確定" : `${probability.toFixed(0)}%`}
        </span>
      )}
    </button>
  )
}
