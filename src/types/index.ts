// 型定義ファイル

export interface TodoItem {
  category: string;
  memo: string;
}

export interface ShowerSession {
  id: string;
  timestamp: string; // ISO format
  todos: TodoItem[];
  feedback: string;
  duration?: number; // シャワー時間（秒）
}

// 通知設定の型
export type RepeatType = 'none' | 'daily' | 'weekly';

export interface NotificationSetting {
  id: string;
  hour: number;
  minute: number;
  repeatType: RepeatType;
  weekdays?: number[]; // 0=日曜, 1=月曜, ... 6=土曜 (weekly用、複数選択可)
  enabled: boolean;
  notificationIds?: string[]; // expo-notificationsのID（複数曜日対応）
}

// ナビゲーション用の型定義
export type RootStackParamList = {
  Home: undefined;
  History: undefined;
  Todo: { timestamp: string; duration?: number };
  Feedback: { timestamp: string; todos: TodoItem[]; duration?: number };
  Notification: undefined;
};
