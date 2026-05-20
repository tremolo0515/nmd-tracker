"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Moon, ChevronLeft, ChevronRight, Camera, X } from "lucide-react"
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

const STORAGE_KEY = "nmd-tracker-data"
const FP_STORAGE_KEY = "nmd-tracker-fp"
const FP_MODE_KEY = "nmd-tracker-fp-mode"

// セル単位のFP記録: appeared 時に何FP進んだか、GETしたか
interface FpCellEntry {
  fpGained: number   // そのセルで増加したFP（出現ボーナス3 + サブレ分）
  gotPartner: boolean // GETした（仲間にした）かどうか
}

interface FpPokemonData {
  current: number  // 現在の累計FP
  max: number      // 上限
  // セル別履歴: キーは "${monthKey}:${day}"
  cells: Record<string, FpCellEntry>
}

type FpData = Record<string, FpPokemonData>

/**
 * 全記録データの型。
 * 構造: { [月キー "YYYY-MM"]: { [pokemon.id]: [日1, 日2, 日3] } }
 *
 * POKEMON_CONFIG にポケモンを追加しても既存の localStorage データとは互換。
 * 新ポケモンの id キーが存在しない月は、読み取り時に "unrecorded" のデフォルトで補完される。
 * → データ移行・マイグレーション不要。
 */
type TrackerData = Record<string, Record<string, [CellState, CellState, CellState]>>

// Layout constants
const CELL_W = 64  // px — width of each day cell (matches w-16)
const CELL_H = 72  // px — height of each day cell (matches h-18)
const CELL_GAP = 5 // px — gap between cells within same month
const MONTH_PX = 6 // px — left/right padding within a month group
// Total width of one month column: padding×2 + cell×3 + gap×2 = 214px
const MONTH_W = MONTH_PX * 2 + CELL_W * 3 + CELL_GAP * 2
const LEFT_W = 88  // px — fixed left column (character select portrait)
const ROW_H = CELL_H + 8      // px — total row height per pokemon (cell + vertical padding)

/**
 * 指定セルの直前から遡って連続ハズレ数 N を計算する（月跨ぎ対応）。
 *
 * ルール（仕様書より）:
 *   - "missed"    → N をインクリメントして遡る
 *   - "unrecorded"→ N を維持したまま遡る（未計測はNをリセットしない）
 *   - "appeared" / "pending" に当たった時点で停止
 *   - 月をまたいで引き継ぐ（月次リセットなし）
 *   - N の上限は 2（N=2 で確率 100% のため N=3 は存在しない）
 *
 * この関数はポケモンの種類に依存しない。
 * POKEMON_CONFIG にポケモンを追加しても変更不要。
 */
function getNBeforeCell(
  allData: TrackerData,
  months: string[],
  pokemonId: string,
  monthKey: string,
  dayIdx: number
): number {
  let n = 0
  let curMonth = monthKey
  let curDay = dayIdx - 1

  while (true) {
    if (curDay < 0) {
      // 前月の最終日（3日目 = index 2）へ遡る
      const mIdx = months.indexOf(curMonth)
      if (mIdx <= 0) break // 記録の始まりより前は遡れない
      curMonth = months[mIdx - 1]
      curDay = 2
    }
    const state = allData[curMonth]?.[pokemonId]?.[curDay] ?? "pending"
    if (state === "missed") {
      n++
      curDay--
    } else if (state === "unrecorded") {
      curDay-- // N を維持したまま素通り
    } else {
      break // appeared / pending で停止
    }
  }

  return Math.min(n, 2)
}

function ShareCell({ state, accentColor }: { state: CellState; accentColor: string }) {
  const symbol =
    state === "appeared"   ? "○" :
    state === "missed"     ? "×" :
    state === "unrecorded" ? "−" : "?"

  return (
    <div
      className="w-9 h-10 rounded-lg flex items-center justify-center text-base font-bold"
      style={{
        background:
          state === "appeared"
            ? `linear-gradient(135deg, ${accentColor}35, ${accentColor}15)`
            : state === "missed"
            ? "rgba(15,23,42,0.6)"
            : "rgba(30,41,59,0.5)",
        border: `1px solid ${
          state === "appeared" ? `${accentColor}80` :
          state === "missed"   ? "rgba(51,65,85,0.5)" :
                                 "rgba(51,65,85,0.3)"
        }`,
        boxShadow: state === "appeared" ? `0 0 8px ${accentColor}30` : "none",
        color:
          state === "appeared"   ? "#fff" :
          state === "missed"     ? "rgb(100,116,139)" :
          state === "unrecorded" ? "rgb(71,85,105)" : "rgb(100,116,139)",
      }}
    >
      {symbol}
    </div>
  )
}

export default function NewMoonDayTracker() {
  const months = generateMonths(24)
  const todayKey = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })()
  const initialIndex = Math.max(0, months.indexOf(todayKey) >= 0 ? months.indexOf(todayKey) : Math.floor(months.length / 2))

  const [data, setData] = useState<TrackerData>({})
  const dataRef = useRef<TrackerData>({})
  const [fpData, setFpData] = useState<FpData>({})
  const fpDataRef = useRef<FpData>({})
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [shareMode, setShareMode] = useState(false)
  const [fpMode, setFpMode] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 星: クライアント側でのみ生成してhydrationミスマッチを防ぐ
  const [stars, setStars] = useState<Array<{
    w: number; h: number; left: number; top: number
    opacity: number; duration: number; delay: number
  }>>([])
  useEffect(() => {
    setStars([...Array(30)].map(() => ({
      w: 1 + Math.random() * 1.5,
      h: 1 + Math.random() * 1.5,
      left: Math.random() * 100,
      top: Math.random() * 100,
      opacity: 0.15 + Math.random() * 0.3,
      duration: 4 + Math.random() * 4,
      delay: Math.random() * 5,
    })))
  }, [])

  // localStorage から読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setData(JSON.parse(saved) as TrackerData)
    } catch { /* ignore */ }
    try {
      if (localStorage.getItem(FP_MODE_KEY) === "1") setFpMode(true)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FP_STORAGE_KEY)
      if (saved) {
        const raw = JSON.parse(saved) as Record<string, unknown>
        // 旧型（cells なし）を新型に移行
        const migrated: FpData = Object.fromEntries(
          Object.entries(raw).map(([id, v]) => {
            const entry = v as { current: number; max: number; cells?: Record<string, FpCellEntry> }
            return [id, { current: entry.current, max: entry.max, cells: entry.cells ?? {} }]
          })
        )
        fpDataRef.current = migrated
        setFpData(migrated)
      }
    } catch { /* ignore */ }
  }, [])

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

  const saveFpData = (next: FpData) => {
    fpDataRef.current = next
    try { localStorage.setItem(FP_STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    setFpData(next)
  }

  // FP入力ダイアログ用ステート（fpGainedはこのセルで加算したFP累計）
  const [fpDialog, setFpDialog] = useState<{
    pokemonId: string
    monthKey: string
    day: number
    fpGained: number
  } | null>(null)

  const handleStateChange = (pokemonId: string, monthKey: string, day: number, newState: CellState) => {
    const prevState = (dataRef.current[monthKey]?.[pokemonId] ?? ["pending", "pending", "pending"])[day]

    const monthData = dataRef.current[monthKey] ?? {}
    const states = monthData[pokemonId] ?? ["pending", "pending", "pending"]
    const next = [...states] as [CellState, CellState, CellState]
    next[day] = newState
    const updated = { ...dataRef.current, [monthKey]: { ...monthData, [pokemonId]: next } }
    dataRef.current = updated

    setData(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch { /* ignore */ }

    if (newState === "appeared") {
      // 出現ボーナス +3 は確定なのでダイアログを開く前に即加算
      const APPEARANCE_BONUS = 3
      const pokemon = POKEMON_CONFIG.find(p => p.id === pokemonId)!
      const prev = fpDataRef.current[pokemonId] ?? { current: 0, max: pokemon.maxFp, cells: {} }
      const cellKey = `${monthKey}:${day}`
      const newCurrent = Math.min(prev.current + APPEARANCE_BONUS, prev.max)
      const gotPartner = newCurrent >= prev.max
      saveFpData({
        ...fpDataRef.current,
        [pokemonId]: {
          current: gotPartner ? 0 : newCurrent,
          max: prev.max,
          cells: { ...prev.cells, [cellKey]: { fpGained: APPEARANCE_BONUS, gotPartner } },
        },
      })
      if (!gotPartner) {
        setFpDialog({ pokemonId, monthKey, day, fpGained: APPEARANCE_BONUS })
      }
    } else if (prevState === "appeared") {
      // appeared から戻したらそのセルのFP記録を取り消す
      const cellKey = `${monthKey}:${day}`
      const prev = fpDataRef.current[pokemonId]
      if (prev?.cells[cellKey]) {
        const cellEntry = prev.cells[cellKey]
        const newCells = { ...prev.cells }
        delete newCells[cellKey]
        // GETしていた場合は取り消し後のFPは不定なので0にリセット、していない場合は引き戻す
        const restoredFp = cellEntry.gotPartner ? prev.current : Math.max(0, prev.current - cellEntry.fpGained)
        saveFpData({
          ...fpDataRef.current,
          [pokemonId]: { ...prev, current: restoredFp, cells: newCells },
        })
      }
    }
  }

  // FPダイアログ: ボタン押下で加算確定・保存
  const handleFpDialogAdd = (delta: number, isGet: boolean) => {
    if (!fpDialog) return
    const { pokemonId, monthKey, day } = fpDialog
    const pokemon = POKEMON_CONFIG.find(p => p.id === pokemonId)!
    const prev = fpDataRef.current[pokemonId] ?? { current: 0, max: pokemon.maxFp, cells: {} }
    const cellKey = `${monthKey}:${day}`

    const newFpGained = fpDialog.fpGained + delta
    const rawTotal = Math.max(0, prev.current + delta)
    const gotPartner = isGet || rawTotal >= prev.max
    const newCurrent = gotPartner ? 0 : Math.min(rawTotal, prev.max)

    saveFpData({
      ...fpDataRef.current,
      [pokemonId]: {
        current: newCurrent,
        max: prev.max,
        cells: { ...prev.cells, [cellKey]: { fpGained: newFpGained, gotPartner } },
      },
    })
    setFpDialog(d => d ? { ...d, fpGained: newFpGained } : d)

    if (gotPartner) setFpDialog(null)
  }

  // FPダイアログを閉じる（入力なしで確定）
  const handleFpDialogClose = () => {
    if (!fpDialog) return
    const { pokemonId, monthKey, day, fpGained } = fpDialog
    if (fpGained === 0) {
      // 何も加算しなかった場合はセル記録のみ残してFPは変化なし
      setFpDialog(null)
      return
    }
    // 既に saveFpData 済みなので閉じるだけ
    setFpDialog(null)
  }


  const currentMonthKey = months[currentIndex]

  const fpDialogPokemon = fpDialog ? POKEMON_CONFIG.find(p => p.id === fpDialog.pokemonId)! : null
  const fpCurrent = fpDialog ? (fpDataRef.current[fpDialog.pokemonId]?.current ?? 0) : 0

  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden">

      {/* FP入力ダイアログ */}
      {fpDialog && fpDialogPokemon && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center px-4"
          style={{ background: "rgba(2,6,23,0.75)", backdropFilter: "blur(4px)" }}
          onClick={handleFpDialogClose}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-700/50 p-5"
            style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* ポケモン名 + FP進捗バー（±ボタン付き） */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 self-stretch rounded-full"
                style={{ background: `linear-gradient(to bottom, ${fpDialogPokemon.accentColor}, ${fpDialogPokemon.color})` }} />
              <div className="flex-1">
                <p className="text-[11px] text-slate-400 leading-none mb-1">{fpDialogPokemon.name}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFpDialogAdd(-1, false)}
                    disabled={fpCurrent === 0}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
                    style={{
                      background: "rgba(30,41,59,0.9)",
                      color: fpCurrent === 0 ? "rgba(71,85,105,0.4)" : "rgba(148,163,184,0.9)",
                    }}
                  >−</button>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min((fpCurrent / fpDialogPokemon.maxFp) * 100, 100)}%`,
                        background: fpDialogPokemon.accentColor,
                        boxShadow: `0 0 6px ${fpDialogPokemon.accentColor}80`,
                      }} />
                  </div>
                  <button
                    onClick={() => handleFpDialogAdd(1, false)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
                    style={{ background: "rgba(30,41,59,0.9)", color: "rgba(148,163,184,0.9)" }}
                  >+</button>
                  <span className="text-xs font-bold shrink-0" style={{ color: fpDialogPokemon.accentColor }}>
                    {fpCurrent}<span className="text-slate-500 font-normal">/{fpDialogPokemon.maxFp}</span>
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">この出現で食べさせたサブレをタップ（複数可）</p>

            {/* サブレボタン: 押すたびに加算 */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {([
                { label: "+1", delta: 1, sub: ["ポケサブ"], color: "rgba(148,163,184,0.15)", textColor: "rgba(148,163,184,0.9)" },
                { label: "+3", delta: 3, sub: ["スパサブ", "ボナサブ"], color: "rgba(148,163,184,0.15)", textColor: "rgba(148,163,184,0.9)" },
                { label: "+4", delta: 4, sub: ["ボナサブ+"], color: "rgba(148,163,184,0.15)", textColor: "rgba(148,163,184,0.9)" },
                { label: "+5", delta: 5, sub: ["ハイサブ"], color: "rgba(148,163,184,0.15)", textColor: "rgba(148,163,184,0.9)" },
                { label: "GET", delta: fpDialogPokemon.maxFp, sub: ["超成功"], color: "rgba(245,158,11,0.2)", textColor: "#fbbf24" },
              ] as const).map(({ label, delta, sub, color, textColor }) => (
                <button
                  key={label}
                  onClick={() => handleFpDialogAdd(delta, label === "GET")}
                  className="flex flex-col items-center justify-center rounded-xl py-2.5 gap-0.5 transition-all active:scale-95"
                  style={{ background: color, border: `1px solid ${textColor}30` }}
                >
                  <span className="text-sm font-bold leading-none" style={{ color: textColor }}>{label}</span>
                  <span className="text-[8px] text-center leading-tight" style={{ color: textColor, opacity: 0.6 }}>
                    {sub.map((s, i) => <span key={i}>{i > 0 && <br />}{s}</span>)}
                  </span>
                </button>
              ))}
            </div>


{/* 今回の加算合計 */}
            {fpDialog.fpGained !== 0 && (
              <p className="text-center text-[11px] text-slate-500 mb-3">
                今回 <span style={{ color: fpDialogPokemon.accentColor, fontWeight: 700 }}>{fpDialog.fpGained > 0 ? "+" : ""}{fpDialog.fpGained}</span>
              </p>
            )}

            {/* 閉じる */}
            <button
              onClick={handleFpDialogClose}
              className="w-full py-2 rounded-xl text-xs text-slate-500 transition-colors"
              style={{ background: "rgba(30,41,59,0.5)" }}
            >
              完了
            </button>
          </div>
        </div>
      )}

      {/* シェアモード オーバーレイ */}
      {shareMode && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center px-6">
          {/* 閉じるボタン */}
          <button
            onClick={() => setShareMode(false)}
            className="absolute top-4 left-4 p-2 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>

          {/* シェアカード */}
          <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-slate-700/50"
            style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)" }}>

            {/* カードヘッダー */}
            <div className="px-5 pt-5 pb-3 border-b border-slate-700/40">
              <span className="text-[10px] text-slate-400 tracking-widest uppercase">Mythical Pokémon Tracker</span>
              <p className="text-xl font-semibold text-slate-100">
                {formatMonthLabel(currentMonthKey)}
              </p>
            </div>

            {/* ポケモン行 */}
            {POKEMON_CONFIG.map(pokemon => {
              const states = data[currentMonthKey]?.[pokemon.id] ?? ["pending", "pending", "pending"]
              // 全月累計
              const allAppeared = Object.values(data).reduce((sum, monthData) => {
                const s = monthData[pokemon.id] ?? []
                return sum + s.filter(c => c === "appeared").length
              }, 0)
              const allRecorded = Object.values(data).reduce((sum, monthData) => {
                const s = monthData[pokemon.id] ?? []
                return sum + s.filter(c => c === "appeared" || c === "missed").length
              }, 0)
              const rate = allRecorded > 0 ? Math.round(allAppeared / allRecorded * 100) : null
              const appeared = allAppeared
              const recorded = allRecorded

              return (
                <div key={pokemon.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60 last:border-b-0">

                  {/* ポートレートサムネイル */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0"
                    style={{ background: "#0f172a", boxShadow: `inset 0 0 0 1px ${pokemon.accentColor}30` }}>
                    {pokemon.backgroundImage && (
                      <Image
                        src={pokemon.backgroundImage}
                        alt={pokemon.name}
                        fill
                        className="object-cover"
                        style={{ objectPosition: "left top", transform: "scale(1.2)", transformOrigin: "left top" }}
                      />
                    )}
                    <div className="absolute left-0 inset-y-0 w-0.5"
                      style={{ background: `linear-gradient(to bottom, ${pokemon.accentColor}, ${pokemon.color})` }} />
                  </div>

                  {/* ポケモン名 + 累計出現率 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-slate-300 leading-none mb-1">{pokemon.name}</p>
                    {rate !== null ? (
                      <p className="text-[10px] text-slate-500 leading-none">
                        累計出現率{" "}
                        <span className="font-semibold" style={{ color: pokemon.accentColor }}>
                          {rate}%
                        </span>
                        <span className="text-slate-600 ml-0.5">({appeared}/{recorded})</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-600 leading-none">記録なし</p>
                    )}
                  </div>

                  {/* 3日分セル（読み取り専用） */}
                  <div className="flex gap-1 shrink-0">
                    {states.map((state, i) => (
                      <ShareCell key={i} state={state} accentColor={pokemon.accentColor} />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* カードフッター */}
            <div className="px-5 py-3 flex items-center justify-end border-t border-slate-700/40">
              <span className="text-[9px] text-slate-600">@ikkyu_pokesle</span>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-slate-600">スクリーンショットして X に投稿しよう</p>
        </div>
      )}

      {/* 星 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {stars.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${s.w}px`,
              height: `${s.h}px`,
              left: `${s.left}%`,
              top: `${s.top}%`,
              opacity: s.opacity,
              animation: `twinkle ${s.duration}s ease-in-out infinite`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-lg mx-auto py-6 pb-24">
        {/* ヘッダー */}
        <header className="relative text-center mb-4 px-4">
          <div className="flex items-center justify-center gap-2">
            <Moon className="w-4 h-4 text-slate-400" />
            <h1 className="text-base font-medium text-slate-300 tracking-wide">
              Mythical Pokémon Tracker
            </h1>
          </div>
          <button
            onClick={() => setFpMode(v => {
              const next = !v
              try { localStorage.setItem(FP_MODE_KEY, next ? "1" : "0") } catch { /* ignore */ }
              return next
            })}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 transition-colors"
            aria-label="フレンドポイントゲージ表示切替"
          >
            <span className="text-[9px] font-medium leading-none tracking-wide"
              style={{ color: fpMode ? "rgb(148,163,184)" : "rgb(71,85,105)" }}>
              FPゲージ管理
            </span>
            {/* Apple風トグルスイッチ */}
            <span
              className="relative inline-block rounded-full transition-all duration-200 shrink-0"
              style={{
                width: 28, height: 16,
                background: fpMode ? "#34d399" : "rgba(51,65,85,0.8)",
              }}
            >
              <span
                className="absolute top-0.5 rounded-full bg-white transition-all duration-200"
                style={{
                  width: 12, height: 12,
                  left: fpMode ? 14 : 2,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                }}
              />
            </span>
          </button>
          <button
            onClick={() => setShareMode(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-slate-400 transition-colors"
            aria-label="シェア用画面を表示"
          >
            <Camera className="w-4 h-4" />
          </button>
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

          {/* 固定左列: キャラセレクト風ポートレート
              POKEMON_CONFIG の配列順に自動で行が増える。変更不要。 */}
          <div className="flex-shrink-0 border-r border-slate-700/50" style={{ width: LEFT_W }}>
            {/* 月ラベル行のスペーサー（右側スクロール列のヘッダー高さに合わせる） */}
            <div style={{ height: 28 }} />
            {POKEMON_CONFIG.map(pokemon => {
              const states = data[currentMonthKey]?.[pokemon.id] ?? ["pending", "pending", "pending"]
              // 全月累計
              const appeared = Object.values(data).reduce((sum, monthData) => {
                const s = monthData[pokemon.id] ?? []
                return sum + s.filter(c => c === "appeared").length
              }, 0)
              const recorded = Object.values(data).reduce((sum, monthData) => {
                const s = monthData[pokemon.id] ?? []
                return sum + s.filter(c => c === "appeared" || c === "missed").length
              }, 0)
              // 次セルのN（最後に記録済みのセルの直後を計算）
              const nextDayIdx = states.findIndex(s => s === "pending" || s === "unrecorded")
              const nextN = nextDayIdx >= 0 ? getNBeforeCell(data, months, pokemon.id, currentMonthKey, nextDayIdx) : null
              const nextProb = nextN !== null && nextDayIdx >= 0 && !states.slice(0, nextDayIdx).some(s => s === "pending" || s === "unrecorded")
                ? calculateProbability(nextN) : null

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

                  {/* 累計出現率: 左上 */}
                  {recorded > 0 && (
                    <>
                      <div className="absolute top-0 left-0 w-full h-14 pointer-events-none"
                        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)" }} />
                      <div className="absolute top-1.5 left-2 flex flex-col gap-0.5">
                        <span className="text-[8px] font-semibold text-slate-300 leading-none tracking-wide">累計出現率</span>
                        <span className="text-[11px] font-semibold leading-none text-white">
                          {`${Math.round(appeared / recorded * 100)}%`}
                          <span className="text-[11px] font-semibold text-slate-300 ml-0.5">
                            ({appeared}/{recorded})
                          </span>
                        </span>
                      </div>
                    </>
                  )}

                  {/* 現在FP: 右下 */}
                  {fpMode && (
                    <>
                      <div className="absolute bottom-0 left-0 w-full h-14 pointer-events-none"
                        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)" }} />
                      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 pb-1">
                        <span className="text-[11px] font-semibold text-slate-300 leading-none tracking-wide">現在FP</span>
                        <span className="text-[11px] font-semibold leading-none" style={{ color: pokemon.accentColor }}>
                          {fpData[pokemon.id]?.current ?? 0}
                          <span className="text-[11px] font-semibold ml-0.5" style={{ color: pokemon.accentColor }}>/{pokemon.maxFp}</span>
                        </span>
                      </div>
                    </>
                  )}
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
                    {/* 日番号ヘッダー: 現在月のみ表示 */}
                    <div className="flex items-center" style={{ height: 28, paddingLeft: MONTH_PX, gap: CELL_GAP }}>
                      {[1, 2, 3].map(d => (
                        <div key={d} className="flex items-center justify-center text-[11px] text-slate-500" style={{ width: CELL_W }}>
                          {dist === 0 ? d : ""}
                        </div>
                      ))}
                    </div>

                    {/* ポケモン行: POKEMON_CONFIG の配列順に自動で行が増える。変更不要。 */}
                    {POKEMON_CONFIG.map(pokemon => {
                      const states = data[monthKey]?.[pokemon.id] ?? ["pending", "pending", "pending"]

                      // 前月（現在月の直後 = 次に来る月）の全3セルが記録済みか
                      const isNextMonth = mIdx === currentIndex + 1
                      const prevMonthKey = months[currentIndex]
                      const prevMonthStates = data[prevMonthKey]?.[pokemon.id] ?? ["pending", "pending", "pending"]
                      const prevMonthAllFilled = prevMonthStates.every(s => s !== "pending")

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
                            const prevUnrecorded = states.slice(0, day).some(s => s === "pending" || s === "unrecorded")
                            const n = getNBeforeCell(data, months, pokemon.id, monthKey, day)
                            const prob = !prevUnrecorded ? calculateProbability(n) : undefined

                            // 確率表示: 現在月は常に表示、次月は1日目のみ・前月全記録済みの場合のみ
                            const showProb = dist === 0 || (isNextMonth && day === 0 && prevMonthAllFilled)

                            const cellKey = `${monthKey}:${day}`
                            const cellEntry = fpData[pokemon.id]?.cells[cellKey]
                            const gotPartner = cellEntry?.gotPartner ?? false
                            const fpGained = cellEntry?.fpGained

                            return (
                              <DayCell
                                key={day}
                                state={state}
                                accentColor={pokemon.accentColor}
                                probability={prob}
                                showProbability={showProb}
                                gotPartner={gotPartner}
                                fpGained={fpMode ? fpGained : undefined}
                                onStateChange={(s) => handleStateChange(pokemon.id, monthKey, day, s)}
                                onEdit={state === "appeared" && fpMode ? () => setFpDialog({ pokemonId: pokemon.id, monthKey, day, fpGained: cellEntry?.fpGained ?? 0 }) : undefined}
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
          <span>? 未入力</span>
          <span>○ 出現</span>
          <span>× 出現なし</span>
          <span>− 計測失敗</span>
        </div>

        {/* フッター */}
        <footer className="fixed bottom-0 inset-x-0 pb-4 pt-2 px-4 text-center text-[10px] text-slate-600 leading-relaxed bg-slate-950/80 backdrop-blur-sm">
          <p>©2023 Pokémon. ©1995-2023 Nintendo/Creatures Inc./GAME FREAK inc.</p>
          <p>Pokémon Sleep is developed by SELECT BUTTON inc.</p>
          <p className="mt-1">ポケットモンスター・Pokémonの著作権及び商標は株式会社任天堂・クリーチャーズ・ゲームフリークに帰属します。</p>
          <p className="mt-3">
            作者の{" "}
            <a href="https://x.com/ikkyu_pokesle" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-slate-400 transition-colors">X</a>
            {" / "}
            <a href="https://stoic-dojo.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-slate-400 transition-colors">ブログ</a>
          </p>
        </footer>
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
