/**
 * ポケモン設定ファイル
 * 
 * 新しいポケモンを追加するには、以下の配列に新しいオブジェクトを追加してください。
 * 
 * 例:
 * { id: "newpokemon", name: "新ポケモン", color: "#HEXCODE", accentColor: "#HEXCODE" }
 * 
 * - id: 一意の識別子（英小文字、データ保存用）
 * - name: 表示名（日本語OK）
 * - color: メインカラー（カード背景のグラデーションに使用）
 * - accentColor: アクセントカラー（光るエフェクトに使用）
 */

export interface PokemonConfig {
  id: string
  name: string
  color: string
  accentColor: string
  /** 背景に薄く表示するポケモン画像のURL（オプション） */
  backgroundImage?: string
}

export const POKEMON_CONFIG: PokemonConfig[] = [
  { 
    id: "darkrai", 
    name: "ダークライ", 
    color: "#6B3FA0", 
    accentColor: "#C084FC",
    backgroundImage: "/pokemon/darklay.png",
  },
  { 
    id: "mew", 
    name: "ミュウ", 
    color: "#C2185B", 
    accentColor: "#F48FB1",
    backgroundImage: "/pokemon/myu.png",
  },
  // 将来の追加例:
  // { id: "xxx", name: "XXX", color: "#...", accentColor: "#...", backgroundImage: "/pokemon/xxx.png" },
]

/**
 * 出現確率を計算する
 * @param consecutiveMisses 連続でハズレた日数 (0〜2)
 * @returns 出現確率 (0〜100)
 */
export function calculateProbability(consecutiveMisses: number): number {
  const n = Math.min(Math.max(consecutiveMisses, 0), 2)
  return ((n + 1) * (n + 2) / 12) * 100
}
