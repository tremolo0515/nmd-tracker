// ============================================================
// ポケモン設定ファイル
//
// 【新しいポケモンを追加する唯一の変更箇所】
// POKEMON_CONFIG 配列にエントリを1つ追加するだけで
// UI・データ保存・確率計算のすべてに自動で反映される。
//
// 詳細な手順は docs/add-pokemon.md を参照。
// ============================================================

export interface PokemonConfig {
  /** データ保存キー。英小文字・ハイフンのみ。一度決めたら変更不可（既存データのキーと一致しなくなる）。 */
  id: string
  /** 画面上の表示名（日本語可） */
  name: string
  /** ポートレート背景・グラデーションのベースカラー（hex） */
  color: string
  /** セル発光・確率テキストのアクセントカラー（hex） */
  accentColor: string
  /** ポートレートに表示するポケモン画像のパス。public/ からの相対パス。省略可。 */
  backgroundImage?: string
}

export const POKEMON_CONFIG: PokemonConfig[] = [
  // ── 既存ポケモン ──────────────────────────────────────
  {
    id: "darkrai",
    name: "ダークライ",
    color: "#6B3FA0",
    accentColor: "#C084FC",
    backgroundImage: "/pokemon/darkrai.png",
  },
  {
    id: "mew",
    name: "ミュウ",
    color: "#C2185B",
    accentColor: "#F48FB1",
    backgroundImage: "/pokemon/mew.png",
  },

  // ── 新ポケモンはここに追記する ──────────────────────────
  // 例:
  // {
  //   id: "jirachi",          // 英小文字・ハイフンのみ（変更不可）
  //   name: "ジラーチ",
  //   color: "#B8860B",       // ベースカラー
  //   accentColor: "#FFD700", // アクセントカラー
  //   backgroundImage: "/pokemon/jirachi.png", // public/pokemon/ に画像を配置
  // },
]

/**
 * 連続ハズレ数 N（0〜2）から出現確率を計算する。
 *
 * 確率モデル: P = (N+1)(N+2) / 12
 *   N=0 → 16.7%（1/6）
 *   N=1 → 50.0%（3/6）
 *   N=2 → 100%  （6/6、必ず出現）
 *
 * この関数はポケモンの種類に依存しない。
 * 全ポケモンで共通の確率モデルを使う前提。
 * 将来ポケモンごとに確率モデルが異なる場合は PokemonConfig にモデルを持たせること。
 */
export function calculateProbability(consecutiveMisses: number): number {
  const n = Math.min(Math.max(consecutiveMisses, 0), 2)
  return ((n + 1) * (n + 2) / 12) * 100
}
