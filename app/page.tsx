"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Moon, ChevronLeft, ChevronRight } from "lucide-react"
import { POKEMON_CONFIG, calculateProbability } from "@/config/pokemon"
import { DayCell, type CellState } from "@/components/day-cell"

function generateMonths(count: number): string[] {
  const months: string[] = []
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - Math.floor(count / 2), 1)
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  return months
}

function formatMonthLabel(key: string, short = false): string {
  const [year, month] = key.split("-")
  return short ? `${parseInt(month)}月` : `${year}年${parseInt(month)}月`
}

const INITIAL_DATA: Record<string, Record<string, [CellState, CellState, CellState]>> = {
  "2026-02": { darkrai: ["appeared", "missed", "unrecorded"], mew: ["missed", "missed", "unrecorded"] },
  "2026-03": { darkrai: ["missed", "appeared", "missed"], mew: ["appeared", "appeared", "unrecorded"] },
  "2026-04": { darkrai: ["unrecorded", "unrecorded", "unrecorded"], mew: ["unrecorded", "unrecorded", "unrecorded"] },
}

// Layout constants
const CELL_W = 64  // px — width of each day cell (matches w-16)
const CELL_H = 72  // px — height of each day cell (matches h-18)
const CELL_GAP = 5 // px — gap between cells within same month
const MONTH_PX = 6 // px — left/right padding within a month group
// Total width of one month column: padding×2 + cell×3 + gap×2 = 214px
const MONTH_W = MONTH_PX * 2 + CELL_W * 3 + CELL_GAP * 2
const LEFT_W = 88  // px — fixed left column (character select portrait)
const ROW_H = CELL_H + 8 // px — total row height per pokemon (cell + vertical padding)

function getMissesBeforeDay(states: [CellState, CellState, CellState], dayIdx: number): number {
  let n = 0
  for (let i = dayIdx - 1; i >= 0; i--) {
    if (states[i] === "missed") n++
    else break
  }
  return Math.min(n, 2)
}

export default function NewMoonDayTracker() {
  const months = generateMonths(24)
  const todayKey = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })()
  const initialIndex = Math.max(0, months.indexOf(todayKey) >= 0 ? months.indexOf(todayKey) : Math.floor(months.length / 2))

  const [data, setData] = useState(INITIAL_DATA)
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 初期スクロール位置
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = initialIndex * MONTH_W
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // scrollend: スクロールが完全に止まったときのみ発火（animation 中の中間値で上書きしない）
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScrollEnd = () => {
      const idx = Math.round(el.scrollLeft / MONTH_W)
      setCurrentIndex(Math.max(0, Math.min(idx, months.length - 1)))
    }
    el.addEventListener("scrollend", onScrollEnd)
    return () => el.removeEventListener("scrollend", onScrollEnd)
  }, [months.length])

  const scrollToIndex = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, months.length - 1))
    setCurrentIndex(clamped) // ヘッダーを即時更新（楽観的更新）
    scrollRef.current?.scrollTo({ left: clamped * MONTH_W, behavior: "smooth" })
  }

  const handleStateChange = (pokemonId: string, monthKey: string, day: number, newState: CellState) => {
    setData(prev => {
      const monthData = prev[monthKey] ?? {}
      const states = monthData[pokemonId] ?? ["unrecorded", "unrecorded", "unrecorded"]
      const next = [...states] as [CellState, CellState, CellState]
      next[day] = newState
      return { ...prev, [monthKey]: { ...monthData, [pokemonId]: next } }
    })
  }

  const currentMonthKey = months[currentIndex]

  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden">
      {/* 星 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${1 + Math.random() * 1.5}px`,
              height: `${1 + Math.random() * 1.5}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.15 + Math.random() * 0.3,
              animation: `twinkle ${4 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-lg mx-auto py-6">
        {/* ヘッダー */}
        <header className="text-center mb-4 px-4">
          <div className="flex items-center justify-center gap-2">
            <Moon className="w-4 h-4 text-slate-400" />
            <h1 className="text-base font-medium text-slate-300 tracking-wide">
              ニュームーンデー記録
            </h1>
          </div>
        </header>

        {/* 月ナビゲーション */}
        <div className="flex items-center justify-center gap-4 mb-5 px-4">
          <button
            onClick={() => scrollToIndex(currentIndex - 1)}
            className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="前の月"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-medium text-slate-200 min-w-[130px] text-center">
            {formatMonthLabel(currentMonthKey)}
          </span>
          <button
            onClick={() => scrollToIndex(currentIndex + 1)}
            className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="次の月"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* グリッド: 固定左列 + 横スクロール月列 */}
        <div className="flex">

          {/* 固定左列: キャラセレクト風ポートレート */}
          <div className="flex-shrink-0 border-r border-slate-700/50" style={{ width: LEFT_W }}>
            {/* 月ラベル行のスペーサー */}
            <div style={{ height: 28 }} />
            {POKEMON_CONFIG.map(pokemon => {
              return (
                <div
                  key={pokemon.id}
                  className="relative overflow-hidden border-b border-slate-800/60"
                  style={{
                    height: ROW_H,
                    background: "#0f172a",
                  }}
                >
                  {/* キャラクター画像: 左上基準でクロップ表示 */}
                  {pokemon.backgroundImage && (
                    <Image
                      src={pokemon.backgroundImage}
                      alt={pokemon.name}
                      fill
                      className="object-cover"
                      style={{ objectPosition: "left top", transform: "scale(1.1)", transformOrigin: "left top" }}
                    />
                  )}

                  {/* 左縁アクセントライン */}
                  <div
                    className="absolute left-0 inset-y-0 w-0.5"
                    style={{ background: `linear-gradient(to bottom, ${pokemon.accentColor}, ${pokemon.color})` }}
                  />

                  {/* 枠内グロー */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ boxShadow: `inset 0 0 0 1px ${pokemon.accentColor}25` }}
                  />
                </div>
              )
            })}
          </div>

          {/* 横スクロール: 月ごとのセル列 */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto"
            style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory" }}
          >
            <div className="flex">
              {months.map((monthKey, mIdx) => {
                const dist = Math.abs(mIdx - currentIndex)
                const opacity = dist === 0 ? 1 : dist === 1 ? 0.45 : 0.15

                return (
                  <div
                    key={monthKey}
                    className="flex-shrink-0 border-r border-slate-700/30 transition-opacity duration-300"
                    style={{ width: MONTH_W, opacity, scrollSnapAlign: "start" }}
                  >
                    {/* 月ラベル */}
                    <div className="flex items-center justify-center" style={{ height: 28 }}>
                      <span className="text-[10px] text-slate-500">
                        {formatMonthLabel(monthKey, true)}
                      </span>
                    </div>

                    {/* ポケモン行 */}
                    {POKEMON_CONFIG.map(pokemon => {
                      const states = data[monthKey]?.[pokemon.id] ?? ["unrecorded", "unrecorded", "unrecorded"]

                      return (
                        <div
                          key={pokemon.id}
                          className="flex items-start border-b border-slate-800/40"
                          style={{
                            paddingLeft: MONTH_PX,
                            paddingTop: 4,
                            paddingBottom: 4,
                            gap: CELL_GAP,
                            height: ROW_H,
                          }}
                        >
                          {states.map((state, day) => {
                            const prevUnrecorded = states.slice(0, day).some(s => s === "unrecorded")
                            const n = getMissesBeforeDay(states, day)
                            const prob = !prevUnrecorded ? calculateProbability(n) : undefined

                            return (
                              <DayCell
                                key={day}
                                day={day + 1}
                                state={state}
                                accentColor={pokemon.accentColor}
                                probability={prob}
                                onStateChange={(s) => handleStateChange(pokemon.id, monthKey, day, s)}
                              />
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* 凡例 */}
        <div className="mt-5 flex justify-center gap-6 text-xs text-slate-500 px-4">
          <span>○ 出現</span>
          <span>× ハズレ</span>
          <span>− 未記録</span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.6; }
        }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
