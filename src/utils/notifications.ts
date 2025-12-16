import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { NotificationSetting } from '../types';
import { getNotificationSettings, updateAllNotificationSettings, deleteNotificationSetting } from './storage';

// 通知の表示設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 通知権限をリクエスト
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Device.isDevice) {
    console.log('通知はシミュレーターでは動作しません');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('通知権限が許可されていません');
    return false;
  }

  // Android用チャンネル設定
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A7FC1',
    });
  }

  return true;
};

// 通知をスケジュール（複数曜日対応）
export const scheduleNotification = async (setting: NotificationSetting): Promise<string[] | null> => {
  try {
    // 既存の通知をキャンセル
    if (setting.notificationIds && setting.notificationIds.length > 0) {
      for (const id of setting.notificationIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    }

    const notificationIds: string[] = [];

    if (setting.repeatType === 'daily') {
      // 毎日繰り返し
      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: setting.hour,
        minute: setting.minute,
      };
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚿 ShawaRun',
          body: '朝のシャワーの時間です！素敵な一日を始めましょう！',
          data: { screen: 'Home' },
        },
        trigger,
      });
      notificationIds.push(id);
    } else if (setting.repeatType === 'weekly' && setting.weekdays && setting.weekdays.length > 0) {
      // 毎週特定の曜日に繰り返し（複数曜日対応）
      for (const weekday of setting.weekdays) {
        const trigger: Notifications.NotificationTriggerInput = {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: weekday + 1, // expo-notificationsは1=日曜
          hour: setting.hour,
          minute: setting.minute,
        };
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚿 ShawaRun',
            body: '朝のシャワーの時間です！素敵な一日を始めましょう！',
            data: { screen: 'Home' },
          },
          trigger,
        });
        notificationIds.push(id);
      }
    } else {
      // 一回のみ - 次の指定時刻を計算
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(setting.hour, setting.minute, 0, 0);
      
      // 既に過ぎている場合は翌日に設定
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: scheduledTime,
      };
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚿 ShawaRun',
          body: '朝のシャワーの時間です！素敵な一日を始めましょう！',
          data: { screen: 'Home' },
        },
        trigger,
      });
      notificationIds.push(id);
    }

    return notificationIds.length > 0 ? notificationIds : null;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
};

// 通知をキャンセル
export const cancelNotification = async (notificationId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
};

// 一回きりの通知が鳴った後に設定を無効化
export const handleOneTimeNotificationFired = async (notificationId: string): Promise<void> => {
  const settings = await getNotificationSettings();
  const updated = settings.map(s => {
    if (s.notificationIds?.includes(notificationId) && s.repeatType === 'none') {
      return { ...s, enabled: false, notificationIds: undefined };
    }
    return s;
  });
  await updateAllNotificationSettings(updated);
};

// 複数の通知をキャンセル
export const cancelNotifications = async (notificationIds: string[]): Promise<void> => {
  for (const id of notificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }
};

// 全ての通知をキャンセル
export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// スケジュールされた通知一覧を取得
export const getScheduledNotifications = async () => {
  return await Notifications.getAllScheduledNotificationsAsync();
};
