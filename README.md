# ShawaRun (シャワラン！)

#### 🚿 シャワーを浴びて、一日の行動スイッチをONに！

朝のシャワー習慣化を支援するReact Native/Expoアプリです。

---

## ✨ 主な機能

| 機能 | 説明 |
|------|------|
| 🚿 **シャワータイマー** | 「今から入る」ボタンでタイマー開始、シャワー時間を自動記録 |
| 📝 **Todoリスト** | シャワー後にその日のタスクをカテゴリ別に記入 |
| 💭 **感想記録** | シャワー後の気持ちを記録、過去の感想がホーム画面に浮遊表示 |
| 🔔 **通知リマインダー** | 毎日/毎週の通知スケジュール設定、複数曜日選択対応 |
| 📅 **カレンダー履歴** | 月別カレンダーで達成日を可視化、日付タップで詳細表示 |
| 🔥 **ストリーク追跡** | 連続日数・最長記録・今週の達成数を表示 |
| 📊 **統計ダッシュボード** | カテゴリ別タスク数、平均シャワー時間を分析 |
| 🎉 **SNSシェア** | シャワー完了後にストリークをシェアカードで共有 |

---

## 🛠️ クイックスタート

### 前提条件
- Node.js (v18以上推奨)
- npm または yarn
- Expo Go アプリ (スマホで動作確認する場合)

### インストール手順

```bash
# 1. 依存関係をインストール
npm install

# 2. Expoを起動
npx expo start
```

### 動作確認
1. ターミナルにQRコードが表示されます
2. **iOS**: カメラアプリでQRコードをスキャン
3. **Android**: Expo Goアプリでスキャン
4. シミュレータ/エミュレータで実行する場合:
   - iOS: `i` キーを押す
   - Android: `a` キーを押す
   - Web: `w` キーを押す

---

## 📂 プロジェクト構造

```
ShawaRun/
├── App.tsx                        # メインエントリポイント・ナビゲーション設定
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx         # ホーム画面（タイマー・ストリーク・浮遊アニメーション）
│   │   ├── TodoScreen.tsx         # Todo作成画面（カテゴリ選択・メモ入力）
│   │   ├── FeedbackScreen.tsx     # 感想入力画面（SNSシェア機能付き）
│   │   ├── HistoryScreen.tsx      # 履歴画面（カレンダー・統計・詳細表示）
│   │   └── NotificationScreen.tsx # 通知設定画面（スケジュール管理）
│   ├── types/
│   │   └── index.ts               # TypeScript型定義
│   └── utils/
│       └── storage.ts             # AsyncStorage操作・データ計算
├── package.json
├── app.json
└── tsconfig.json
```

---

## 🎨 技術スタック

| カテゴリ | 技術 |
|----------|------|
| **フレームワーク** | React Native (Expo SDK 52) |
| **言語** | TypeScript |
| **ナビゲーション** | React Navigation v7 (Native Stack) |
| **データ永続化** | AsyncStorage |
| **通知** | expo-notifications |
| **UI** | expo-linear-gradient |
| **フォント** | @expo-google-fonts/sorts-mill-goudy |
| **日時選択** | @react-native-community/datetimepicker |

---

## 📱 画面フロー

```
┌─────────────┐
│   Home      │ ← ストリーク表示・浮遊する過去の感想
│  🚿 今から入る │
└──────┬──────┘
       │ タイマー完了
       ▼
┌─────────────┐
│    Todo     │ ← カテゴリ選択・メモ入力
│  タスク追加   │
└──────┬──────┘
       │ 次へ
       ▼
┌─────────────┐
│  Feedback   │ ← 感想入力・SNSシェア
│  感想を記録   │
└──────┬──────┘
       │ 完了
       ▼
┌─────────────┐
│   Home      │ ← Done状態（今日のタスク確認モーダル）
└─────────────┘

サイドメニュー:
├── 📅 History     → カレンダー・統計・履歴詳細
└── 🔔 Notification → 通知スケジュール設定
```

---

## 🗂️ データ構造

### ShowerSession
```typescript
interface ShowerSession {
  id: string;              // ユニークID
  timestamp: string;       // 記録日時
  todos: TodoItem[];       // タスクリスト
  feedback: string;        // 感想
  duration?: number;       // シャワー時間（秒）
}
```

### NotificationSetting
```typescript
interface NotificationSetting {
  id: string;
  hour: number;
  minute: number;
  enabled: boolean;
  repeat: 'none' | 'daily' | 'weekly';
  weekdays?: number[];     // 0=日曜〜6=土曜
}
```

---

## 🎯 設計コンセプト

### 習慣化の仕組み
1. **トリガー**: 通知リマインダーでシャワーを促す
2. **行動**: タイマーで実際のシャワー時間を計測
3. **報酬**: ストリーク表示・過去の感想で達成感を演出
4. **記録**: 履歴とカレンダーで継続を可視化

### パフォーマンス最適化
- `React.memo` によるコンポーネントメモ化
- `useCallback` / `useMemo` による再レンダリング防止
- ユーティリティ関数のコンポーネント外配置
- `Promise.all` による並列データ読み込み

---

## 📄 ライセンス

MIT License