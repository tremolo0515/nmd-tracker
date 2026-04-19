# シェアモード実装仕様

Twitter/X への投稿を想定したスクリーンショット用ビュー。
ボタン1つでオーバーレイ表示 → ユーザーがスクリーンショット → 閉じる。

---

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `app/page.tsx` | カメラボタン追加、`shareMode` state 追加、シェアカード JSX 追加 |
| `components/day-cell.tsx` | 変更なし（既存コンポーネントをそのまま流用） |

---

## 1. ボタン

### 配置
`app/page.tsx` のヘッダー `<header>` を `relative` にし、右端に絶対配置。

```tsx
// 変更前
<header className="text-center mb-4 px-4">
  <div className="flex items-center justify-center gap-2">
    <Moon className="w-4 h-4 text-slate-400" />
    <h1 ...>Mythical Pokémon Tracker</h1>
  </div>
</header>

// 変更後
<header className="relative text-center mb-4 px-4">
  <div className="flex items-center justify-center gap-2">
    <Moon className="w-4 h-4 text-slate-400" />
    <h1 ...>Mythical Pokémon Tracker</h1>
  </div>
  <button
    onClick={() => setShareMode(true)}
    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-slate-400 transition-colors"
    aria-label="シェア用画面を表示"
  >
    <Camera className="w-4 h-4" />
  </button>
</header>
```

### import 追加
```tsx
import { Moon, ChevronLeft, ChevronRight, Camera } from "lucide-react"
```

### state 追加
```tsx
const [shareMode, setShareMode] = useState(false)
```

---

## 2. シェアカード（オーバーレイ）

`return (...)` の `<div className="min-h-screen ...">` の直前の子として追加する。
`shareMode` が `true` のとき `fixed inset-0 z-50` でフルスクリーン表示。

### オーバーレイ全体構造

```tsx
{shareMode && (
  <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center px-6">

    {/* 閉じるボタン: 左上固定 */}
    <button
      onClick={() => setShareMode(false)}
      className="absolute top-4 left-4 p-2 text-slate-500 hover:text-slate-300 transition-colors"
      aria-label="閉じる"
    >
      <X className="w-5 h-5" />
    </button>

    {/* シェアカード本体 */}
    <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-slate-700/50"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)" }}>

      {/* カードヘッダー */}
      {/* ポケモン行 × n */}
      {/* カードフッター */}

    </div>

    {/* 操作ガイド */}
    <p className="mt-4 text-[11px] text-slate-600">スクリーンショットして X に投稿しよう</p>
  </div>
)}
```

### import 追加
```tsx
import { Moon, ChevronLeft, ChevronRight, Camera, X } from "lucide-react"
```

---

## 3. カードヘッダー

```tsx
{/* カードヘッダー */}
<div className="px-5 pt-5 pb-3 border-b border-slate-700/40">
  <div className="flex items-center gap-1.5 mb-0.5">
    <Moon className="w-3 h-3 text-slate-400" />
    <span className="text-[10px] text-slate-400 tracking-widest uppercase">Mythical Pokémon Tracker</span>
  </div>
  <p className="text-xl font-semibold text-slate-100">
    {formatMonthLabel(currentMonthKey)}
  </p>
</div>
```

---

## 4. ポケモン行

`POKEMON_CONFIG.map` で各ポケモンの行を生成。

### 各行のデータ計算（`page.tsx` の既存ロジックを流用）

```tsx
const states = data[currentMonthKey]?.[pokemon.id] ?? ["pending", "pending", "pending"]
const appeared = states.filter(s => s === "appeared").length
const recorded = states.filter(s => s === "appeared" || s === "missed").length
const rate = recorded > 0 ? Math.round(appeared / recorded * 100) : null
```

### 行 JSX

```tsx
{POKEMON_CONFIG.map(pokemon => {
  const states = data[currentMonthKey]?.[pokemon.id] ?? ["pending", "pending", "pending"]
  const appeared = states.filter(s => s === "appeared").length
  const recorded = states.filter(s => s === "appeared" || s === "missed").length
  const rate = recorded > 0 ? Math.round(appeared / recorded * 100) : null

  return (
    <div key={pokemon.id}
      className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60 last:border-b-0">

      {/* ポートレートサムネイル */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
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
        {/* 左縁アクセントライン */}
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

      {/* 3日分セル: 読み取り専用（クリック無効） */}
      <div className="flex gap-1 flex-shrink-0">
        {states.map((state, i) => (
          <ShareCell key={i} state={state} accentColor={pokemon.accentColor} />
        ))}
      </div>

    </div>
  )
})}
```

---

## 5. ShareCell コンポーネント（インライン定義）

`page.tsx` 内に小さなインライン関数として定義する（新ファイル不要）。
`DayCell` をそのまま使うとクリックが発生するため、読み取り専用の小型版を用意。

```tsx
// page.tsx 内、コンポーネント定義外のトップレベルに追加
function ShareCell({ state, accentColor }: { state: CellState; accentColor: string }) {
  const symbol =
    state === "appeared" ? "○" :
    state === "missed"   ? "×" :
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
```

---

## 6. カードフッター

```tsx
{/* カードフッター */}
<div className="px-5 py-3 flex items-center justify-between border-t border-slate-700/40">
  <span className="text-[9px] text-slate-600">Mythical Pokémon Tracker</span>
  <span className="text-[9px] text-slate-600">@ikkyu_pokesle</span>
</div>
```

---

## 7. 星背景の扱い

シェアカードは `fixed inset-0 z-50 bg-slate-950` で覆うため、背景の星は隠れる。
シェアカード内に星を再描画する必要はない（カードのグラデーション背景で十分）。

---

## 実装チェックリスト

- [ ] `Camera`, `X` を lucide-react からインポート
- [ ] `shareMode` state 追加（`useState(false)`）
- [ ] ヘッダーにカメラボタン追加
- [ ] `ShareCell` 関数をトップレベルに追加
- [ ] シェアオーバーレイ JSX を `return` 内の先頭に追加
- [ ] 型チェック通過確認（`npx tsc --noEmit`）
- [ ] dev サーバーで表示確認

---

## 注意事項

- `ShareCell` はクリックイベントなし・`pointer-events-none` 不要（div なのでクリック不可）
- `pending` セルは `?` 表示のまま（シェア時に未入力がわかる方が自然）
- カードの幅は `max-w-sm`（384px）でスマホ縦画面のスクリーンショットに最適
- オーバーレイ表示中はスクロール・背面操作をブロックする（`fixed inset-0` で自然にブロックされる）
