# フレンドポイントゲージ 実装計画書

Last-modified: 2026-05-19

## 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|----------|----------|------|
| `config/pokemon.ts` | 修正 | `PokemonConfig` に `maxFp` 追加、各ポケモンに値を設定 |
| `app/page.tsx` | 修正 | FP ステート追加・ゲージモードトグル・出現連動・ ROW_H 調整 |
| `components/fp-gauge.tsx` | 新規 | FP ゲージ + 増減ボタンのコンポーネント |

---

## フェーズ 1: データ層の変更

### 1-1. `config/pokemon.ts`

`PokemonConfig` インターフェースに `maxFp: number` を追加する。

```typescript
export interface PokemonConfig {
  id: string
  name: string
  color: string
  accentColor: string
  backgroundImage?: string
  maxFp: number  // ← 追加
}
```

各エントリに値を設定する。

```typescript
{ id: "darkrai", ..., maxFp: 25 }
{ id: "mew",     ..., maxFp: 25 }
```

### 1-2. `app/page.tsx` — ストレージキーと型定義の追加

```typescript
const FP_STORAGE_KEY = "nmd-tracker-fp"

type FpData = Record<string, { current: number; max: number }>
```

---

## フェーズ 2: ステート・ロジックの追加（`app/page.tsx`）

### 2-1. ステート追加

```typescript
const [fpData, setFpData] = useState<FpData>({})
const [fpMode, setFpMode] = useState(false)
```

### 2-2. FP データの localStorage 読み込み

既存の `useEffect` の直下に追加する。

```typescript
useEffect(() => {
  try {
    const saved = localStorage.getItem(FP_STORAGE_KEY)
    if (saved) setFpData(JSON.parse(saved) as FpData)
  } catch { /* ignore */ }
}, [])
```

### 2-3. FP 更新ヘルパー

```typescript
const handleFpChange = (pokemonId: string, delta: number) => {
  setFpData(prev => {
    const pokemon = POKEMON_CONFIG.find(p => p.id === pokemonId)!
    const entry = prev[pokemonId] ?? { current: 0, max: pokemon.maxFp }
    const next = {
      ...prev,
      [pokemonId]: {
        current: Math.min(Math.max(entry.current + delta, 0), entry.max),
        max: entry.max,
      },
    }
    try { localStorage.setItem(FP_STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    return next
  })
}
```

### 2-4. `handleStateChange` の出現連動（既存関数を修正）

```typescript
// appeared になったタイミングで出現ボーナス +3 FP を自動加算
// （ゲーム内仕様: 幻のポケモンが出現すると固定で +3 FP が付与される）
if (newState === "appeared") {
  handleFpChange(pokemonId, 3)
}
```

### 2-5. ROW_H の条件分岐

ゲージ行（28px）はモード ON 時のみ行高さに加算する。

```typescript
const getRowH = (fpMode: boolean) => fpMode ? CELL_H + 8 + 28 : CELL_H + 8
```

ただし左列と右スクロール列で ROW_H が一致している必要があるため、`fpMode` を両方に渡す。

> **注意**: `ROW_H` は現在定数として定義されている。`fpMode` を参照する変数へ変更する。スクロール位置計算（`MONTH_W`）は ROW_H に依存しないため影響なし。

---

## フェーズ 3: FP ゲージコンポーネント（新規ファイル）

### `components/fp-gauge.tsx`

**Props**

```typescript
interface FpGaugeProps {
  current: number
  max: number
  accentColor: string
  onIncrement: () => void
  onDecrement: () => void
}
```

**レイアウト**

```
<div style={{ width: LEFT_W, height: 28 }}>
  <button onClick={onDecrement} disabled={current === 0}>−</button>
  <div /* ゲージ */ >
    {Array.from({ length: max }).map((_, i) => (
      <div key={i} /* セグメント、i < current で塗りつぶし */ />
    ))}
  </div>
  <button onClick={onIncrement} disabled={current === max}>+</button>
</div>
```

**セグメントサイズ計算**

左列幅 88px から左右ボタン各 20px、余白 8px を引いた 40px 以上を `max` 個のセグメントで均等割り。

---

## フェーズ 4: ヘッダーへのトグルボタン追加（`app/page.tsx`）

カメラアイコンの左隣に配置する。

```tsx
<button
  onClick={() => setFpMode(v => !v)}
  className={cn(
    "absolute left-4 top-1/2 -translate-y-1/2 p-1.5 transition-colors",
    fpMode ? "text-pink-400" : "text-slate-600 hover:text-slate-400"
  )}
  aria-label="フレンドポイントゲージ表示切替"
>
  <Heart className="w-4 h-4" />
</button>
```

---

## フェーズ 5: 左列ポートレートへのゲージ埋め込み（`app/page.tsx`）

既存のポートレート `<div>` の直下（`border-b` の内側）に `FpGauge` を条件レンダリングで追加する。

```tsx
{fpMode && (
  <FpGauge
    current={fpData[pokemon.id]?.current ?? 0}
    max={pokemon.maxFp}
    accentColor={pokemon.accentColor}
    onIncrement={() => handleFpChange(pokemon.id, 1)}
    onDecrement={() => handleFpChange(pokemon.id, -1)}
  />
)}
```

---

## 実装順序

1. `config/pokemon.ts` — `maxFp` フィールド追加
2. `components/fp-gauge.tsx` — コンポーネント単体実装
3. `app/page.tsx` — ストレージ・ステート・ヘルパー追加
4. `app/page.tsx` — `handleStateChange` に出現連動を追加
5. `app/page.tsx` — ROW_H の動的化
6. `app/page.tsx` — ヘッダートグルボタン追加
7. `app/page.tsx` — 左列へのゲージ埋め込み
8. 動作確認（FP 増減・出現連動・モードトグル・localStorage 永続化）

---

## リスク・注意点

| リスク | 対策 |
|--------|------|
| 左列と右スクロール列の行高さずれ | `fpMode` を単一の変数で管理し、両列で同じ値を参照する |
| `ROW_H` を定数から変数にすることによる型エラー | `const ROW_H = fpMode ? ... : ...` のようにレンダリングスコープ内で計算する |
| `appeared` 記録時の FP 二重加算（連続タップ） | `handleStateChange` は state が変わる場合のみ呼ばれるため問題なし |
| 25 個セグメントが 88px に収まらない | セグメントに最小幅 1px + gap 1px を設定し、overflow-hidden でクリップ |
