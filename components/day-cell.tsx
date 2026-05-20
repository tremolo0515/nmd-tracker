"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

export type CellState = "pending" | "missed" | "appeared" | "unrecorded"

interface DayCellProps {
  state: CellState
  accentColor: string
  probability?: number
  showProbability?: boolean
  gotPartner?: boolean
  fpGained?: number
  onStateChange: (newState: CellState) => void
  onEdit?: () => void
}

const MENU_OPTIONS: { label: string; state: CellState }[] = [
  { label: "出現", state: "appeared" },
  { label: "出現なし", state: "missed" },
  { label: "計測失敗", state: "unrecorded" },
  { label: "未入力", state: "pending" },
]

export function DayCell({ state, accentColor, probability, showProbability = true, gotPartner = false, fpGained, onStateChange, onEdit }: DayCellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 })
  const cellRef = useRef<HTMLButtonElement>(null)

  // メニューを開くときにセルの位置を取得
  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!menuOpen && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.top, left: rect.left, width: rect.width })
    }
    setMenuOpen(v => !v)
  }

  // 画面外クリックで閉じる
  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    window.addEventListener("pointerdown", close)
    return () => window.removeEventListener("pointerdown", close)
  }, [menuOpen])

  const handleSelect = (e: React.MouseEvent, newState: CellState) => {
    e.stopPropagation()
    setMenuOpen(false)
    if (newState !== state) onStateChange(newState)
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    onEdit?.()
  }

  const isGet = state === "appeared" && gotPartner

  // メニュー幅: 選択肢数 × 幅。FP編集がある場合は+1
  const optionCount = MENU_OPTIONS.filter(o => o.state !== state).length + (state === "appeared" && onEdit ? 1 : 0)
  const menuW = optionCount * 68
  // 画面右端にはみ出さないよう left を調整
  const menuLeft = typeof window !== "undefined"
    ? Math.min(menuPos.left, window.innerWidth - menuW - 8)
    : menuPos.left

  return (
    <div className="relative" style={{ width: 64 }}>
      {/* Fixed メニュー: 最前面・見切れなし */}
      {menuOpen && (
        <div
          className="fixed z-200 flex flex-row rounded-xl overflow-hidden"
          style={{
            top: menuPos.top - 44,
            left: menuLeft,
            background: "rgba(15,23,42,0.97)",
            border: "1px solid rgba(51,65,85,0.7)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          {MENU_OPTIONS.filter(o => o.state !== state).map(opt => (
            <div
              key={opt.state}
              role="button"
              onClick={e => handleSelect(e, opt.state)}
              className="px-3 py-2.5 text-[11px] font-semibold text-center whitespace-nowrap transition-colors active:bg-slate-700/60"
              style={{
                color: opt.state === "appeared" ? accentColor : "rgba(148,163,184,0.8)",
                borderRight: "1px solid rgba(51,65,85,0.4)",
              }}
            >
              {opt.label}
            </div>
          ))}
          {state === "appeared" && onEdit && (
            <div
              role="button"
              onClick={handleEditClick}
              className="px-3 py-2.5 text-[11px] font-semibold text-center whitespace-nowrap transition-colors active:bg-slate-700/60"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              FP編集
            </div>
          )}
        </div>
      )}

      {/* セル本体 */}
      <button
        ref={cellRef}
        onClick={handleCellClick}
        className={cn(
          "relative flex flex-col items-center justify-center",
          "w-16 h-18 rounded-xl transition-all duration-200",
          "touch-manipulation select-none",
          menuOpen && "scale-95",
          state === "pending" && "bg-slate-800/50 border border-slate-700/50",
          state === "appeared" && "border",
          state === "missed" && "bg-slate-900/60 border border-slate-800/50",
          state === "unrecorded" && "bg-slate-800/30 border border-slate-700/30",
        )}
        style={{
          ...(state === "appeared" && !isGet && {
            background: `linear-gradient(135deg, ${accentColor}35 0%, ${accentColor}15 100%)`,
            borderColor: `${accentColor}80`,
            boxShadow: `0 0 12px ${accentColor}40`,
          }),
          ...(isGet && {
            background: "linear-gradient(135deg, #f59e0b40 0%, #fbbf2420 50%, #f59e0b30 100%)",
            borderColor: "#fbbf2490",
            boxShadow: "0 0 16px #f59e0b50, 0 0 6px #fbbf2430",
          }),
        }}
      >
        {/* GET時の輝きオーバーレイ */}
        {isGet && (
          <div className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, transparent 60%)" }} />
        )}

        {/* 状態アイコン */}
        <div className={cn(
          "font-bold leading-none transition-all duration-200",
          isGet ? "text-lg" : "text-xl",
          state === "pending" && "text-slate-500",
          state === "appeared" && !isGet && "text-white",
          state === "missed" && "text-slate-500",
          state === "unrecorded" && "text-slate-600",
        )}
        style={isGet ? { color: "#fbbf24", textShadow: "0 0 8px #f59e0b80" } : undefined}>
          {state === "pending" && "?"}
          {state === "appeared" && "○"}
          {state === "missed" && "×"}
          {state === "unrecorded" && "−"}
        </div>

        {/* GET ラベル */}
        {isGet && (
          <span className="text-[9px] font-bold leading-none mt-0.5"
            style={{ color: "#fbbf24", letterSpacing: "0.08em", textShadow: "0 0 6px #f59e0b60" }}>
            GET
          </span>
        )}

        {/* FP加算表示: appeared時に下部に表示 */}
        {state === "appeared" && fpGained !== undefined && fpGained > 0 && (
          <span className="absolute bottom-1.5 leading-none font-semibold text-[10px]"
            style={{ color: accentColor, opacity: 0.8 }}>
            +{fpGained}
          </span>
        )}

        {/* 確率表示: 下辺固定 */}
        <span className={cn(
          "absolute bottom-1.5 leading-none font-semibold transition-all duration-300",
          state === "pending" && probability !== undefined && showProbability ? (
            probability >= 100
              ? "text-[14px] text-amber-300"
              : probability >= 50
              ? "text-[13px] text-slate-300"
              : "text-[12px] text-slate-500"
          ) : "invisible text-[12px]",
        )}
        style={
          state === "pending" && probability !== undefined && showProbability ? (
            probability >= 100
              ? { textShadow: `0 0 6px rgba(251,191,36,0.35)` }
              : probability >= 50
              ? { textShadow: `0 0 4px rgba(148,163,184,0.2)` }
              : undefined
          ) : undefined
        }>
          {probability !== undefined && (probability >= 100 ? "100%" : `${probability.toFixed(0)}%`)}
        </span>
      </button>
    </div>
  )
}
