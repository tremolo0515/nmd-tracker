"use client"

import Image from "next/image"
import type { PokemonConfig } from "@/config/pokemon"
import { calculateProbability } from "@/config/pokemon"
import { DayCell, type CellState } from "./day-cell"
import { cn } from "@/lib/utils"

interface PokemonCardProps {
  pokemon: PokemonConfig
  states: [CellState, CellState, CellState]
  onStateChange: (day: number, newState: CellState) => void
  showProbability?: boolean
}

export function PokemonCard({ pokemon, states, onStateChange, showProbability = true }: PokemonCardProps) {
  // 連続ハズレ日数を計算
  const calculateConsecutiveMisses = (cellStates: [CellState, CellState, CellState]): number => {
    let count = 0
    for (let i = cellStates.length - 1; i >= 0; i--) {
      if (cellStates[i] === "missed") {
        count++
      } else if (cellStates[i] === "appeared") {
        break
      }
    }
    return Math.min(count, 2)
  }

  const consecutiveMisses = calculateConsecutiveMisses(states)
  const probability = calculateProbability(consecutiveMisses)
  const glowIntensity = probability >= 100 ? "high" : probability >= 50 ? "medium" : "low"

  return (
    <div
      className="relative rounded-2xl overflow-hidden p-4"
      style={{
        background: `linear-gradient(145deg, ${pokemon.color}15 0%, ${pokemon.color}05 100%)`,
        boxShadow: glowIntensity === "high" 
          ? `0 0 24px ${pokemon.accentColor}30, inset 0 1px 0 rgba(255,255,255,0.08)`
          : glowIntensity === "medium"
          ? `0 0 16px ${pokemon.accentColor}20, inset 0 1px 0 rgba(255,255,255,0.08)`
          : `inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      {/* 背景のポケモン画像 */}
      {pokemon.backgroundImage && (
        <div className="absolute inset-0 flex items-center justify-end pointer-events-none overflow-hidden">
          <div className="relative w-32 h-32 -mr-4 opacity-[0.12]">
            <Image
              src={pokemon.backgroundImage}
              alt=""
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}

      <div className="relative flex items-center justify-between">
        {/* 3日分のセル */}
        <div className="flex gap-2">
          {states.map((state, dayIndex) => (
            <DayCell
              key={dayIndex}
              state={state}
              accentColor={pokemon.accentColor}
              onStateChange={(newState) => onStateChange(dayIndex, newState)}
            />
          ))}
        </div>

        {/* 確率表示 */}
        {showProbability && (
          <div className="text-right pl-4">
            <div className="text-[10px] text-slate-500 mb-0.5">次回</div>
            <div
              className={cn(
                "text-xl font-bold transition-all",
                glowIntensity === "high" && "animate-pulse"
              )}
              style={{
                color: pokemon.accentColor,
                textShadow: glowIntensity !== "low" ? `0 0 10px ${pokemon.accentColor}50` : undefined,
              }}
            >
              {probability.toFixed(1)}%
            </div>
            {probability >= 100 && (
              <div className="text-[10px] text-yellow-400 mt-0.5">確定</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
