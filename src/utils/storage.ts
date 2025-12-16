import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShowerSession, NotificationSetting } from '../types';

const STORAGE_KEY = 'SHAWARUN_SESSIONS';
const NOTIFICATION_KEY = 'SHAWARUN_NOTIFICATIONS';

// 全てのセッションを取得
export const getAllSessions = async (): Promise<ShowerSession[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to load sessions:', e);
    return [];
  }
};

// セッションを保存（追記）
export const saveSession = async (session: ShowerSession): Promise<void> => {
  try {
    const existingSessions = await getAllSessions();
    const updatedSessions = [session, ...existingSessions]; // 新しいものを先頭に
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
  } catch (e) {
    console.error('Failed to save session:', e);
  }
};

// 全てのセッションを削除
export const clearAllSessions = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear sessions:', e);
  }
};

// 特定のセッションを削除
export const deleteSession = async (sessionId: string): Promise<void> => {
  try {
    const existingSessions = await getAllSessions();
    const updatedSessions = existingSessions.filter(s => s.id !== sessionId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
  } catch (e) {
    console.error('Failed to delete session:', e);
  }
};

// ===== 通知設定関連 =====

// 全ての通知設定を取得
export const getNotificationSettings = async (): Promise<NotificationSetting[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(NOTIFICATION_KEY);
    return jsonValue ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to load notification settings:', e);
    return [];
  }
};

// 通知設定を保存
export const saveNotificationSetting = async (setting: NotificationSetting): Promise<void> => {
  try {
    const existing = await getNotificationSettings();
    const index = existing.findIndex(s => s.id === setting.id);
    if (index >= 0) {
      existing[index] = setting;
    } else {
      existing.push(setting);
    }
    await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save notification setting:', e);
  }
};

// 通知設定を削除
export const deleteNotificationSetting = async (settingId: string): Promise<void> => {
  try {
    const existing = await getNotificationSettings();
    const updated = existing.filter(s => s.id !== settingId);
    await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete notification setting:', e);
  }
};

// 全ての通知設定を更新
export const updateAllNotificationSettings = async (settings: NotificationSetting[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to update notification settings:', e);
  }
};

// ===== 統計・分析関連 =====

// 日付を YYYY-MM-DD 形式に変換
const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 連続記録（Streak）を計算
export const calculateStreak = async (): Promise<{ currentStreak: number; longestStreak: number; thisWeekCount: number }> => {
  const sessions = await getAllSessions();
  if (sessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, thisWeekCount: 0 };
  }

  // 日付ごとにグループ化
  const dateSet = new Set<string>();
  sessions.forEach(s => {
    const date = new Date(s.timestamp);
    dateSet.add(formatDateKey(date));
  });

  const sortedDates = Array.from(dateSet).sort().reverse(); // 新しい順

  // 今日の日付
  const today = new Date();
  const todayKey = formatDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  // 現在のStreak計算
  let currentStreak = 0;
  let checkDate = new Date(today);
  
  // 今日やっていない場合は昨日から始める
  if (!dateSet.has(todayKey)) {
    if (!dateSet.has(yesterdayKey)) {
      currentStreak = 0;
    } else {
      checkDate = yesterday;
    }
  }

  if (dateSet.has(todayKey) || dateSet.has(yesterdayKey)) {
    while (dateSet.has(formatDateKey(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // 最長Streak計算
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  sortedDates.reverse().forEach(dateStr => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day);
    
    if (prevDate === null) {
      tempStreak = 1;
    } else {
      const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    prevDate = currentDate;
  });
  longestStreak = Math.max(longestStreak, tempStreak);

  // 今週の回数
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // 日曜始まり
  weekStart.setHours(0, 0, 0, 0);
  
  const thisWeekCount = sessions.filter(s => {
    const sessionDate = new Date(s.timestamp);
    return sessionDate >= weekStart;
  }).length;

  return { currentStreak, longestStreak, thisWeekCount };
};

// 完了時刻の統計（ベスト時間の提案用）
export const getCompletionTimeStats = async (): Promise<{ bestHour: number; bestMinute: number; avgHour: number; avgMinute: number; count: number } | null> => {
  const sessions = await getAllSessions();
  if (sessions.length < 3) return null; // 最低3回以上のデータが必要

  // 時刻ごとにカウント
  const hourCounts: { [key: number]: number } = {};
  sessions.forEach(s => {
    const date = new Date(s.timestamp);
    const hour = date.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  // 最も多い時間を見つける
  let bestHour = 7;
  let maxCount = 0;
  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > maxCount) {
      maxCount = count;
      bestHour = parseInt(hour);
    }
  });

  // その時間帯の平均分を計算
  const minutesInBestHour = sessions
    .filter(s => new Date(s.timestamp).getHours() === bestHour)
    .map(s => new Date(s.timestamp).getMinutes());
  
  const avgMinute = Math.round(minutesInBestHour.reduce((a, b) => a + b, 0) / minutesInBestHour.length);
  const bestMinute = Math.round(avgMinute / 5) * 5; // 5分単位に丸める

  // 全体の平均時刻も計算
  const allHours = sessions.map(s => new Date(s.timestamp).getHours());
  const allMinutes = sessions.map(s => new Date(s.timestamp).getMinutes());
  const avgHour = Math.round(allHours.reduce((a, b) => a + b, 0) / allHours.length);
  const avgMin = Math.round(allMinutes.reduce((a, b) => a + b, 0) / allMinutes.length);

  return { bestHour, bestMinute, avgHour, avgMinute: avgMin, count: sessions.length };
};

// カレンダーデータを取得（月ごと）
export const getCalendarData = async (year: number, month: number): Promise<Set<number>> => {
  const sessions = await getAllSessions();
  const daysWithSessions = new Set<number>();
  
  sessions.forEach(s => {
    const date = new Date(s.timestamp);
    if (date.getFullYear() === year && date.getMonth() === month) {
      daysWithSessions.add(date.getDate());
    }
  });
  
  return daysWithSessions;
};

// 今日シャワーしたかチェック
export const didShowerToday = async (): Promise<boolean> => {
  const sessions = await getAllSessions();
  const today = formatDateKey(new Date());
  return sessions.some(s => formatDateKey(new Date(s.timestamp)) === today);
};
