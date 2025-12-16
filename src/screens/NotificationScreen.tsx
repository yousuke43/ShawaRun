import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList, NotificationSetting, RepeatType } from '../types';
import {
  getNotificationSettings,
  saveNotificationSetting,
  deleteNotificationSetting,
  getCompletionTimeStats,
} from '../utils/storage';
import {
  requestNotificationPermissions,
  scheduleNotification,
  cancelNotifications,
} from '../utils/notifications';

type NotificationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Notification'>;

interface Props {
  navigation: NotificationScreenNavigationProp;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const REPEAT_OPTIONS: { label: string; value: RepeatType }[] = [
  { label: '一回のみ', value: 'none' },
  { label: '毎日', value: 'daily' },
  { label: '毎週', value: 'weekly' },
];

const NotificationScreen: React.FC<Props> = ({ navigation }) => {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempTime, setTempTime] = useState(new Date());
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [bestTimeStats, setBestTimeStats] = useState<{
    bestHour: number;
    bestMinute: number;
    avgHour: number;
    avgMinute: number;
    count: number;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadBestTimeStats();
    }, [])
  );

  const loadSettings = async () => {
    const data = await getNotificationSettings();
    setSettings(data);
  };

  const loadBestTimeStats = async () => {
    const stats = await getCompletionTimeStats();
    if (stats && stats.count >= 3) {
      setBestTimeStats(stats);
    }
  };

  const handleApplyBestTime = async () => {
    if (!bestTimeStats) return;
    
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      Alert.alert('権限エラー', '通知を有効にするには、設定から通知権限を許可してください。');
      return;
    }

    // ベスト時間の15分前に通知
    let hour = bestTimeStats.bestHour;
    let minute = bestTimeStats.bestMinute - 15;
    if (minute < 0) {
      minute += 60;
      hour = hour === 0 ? 23 : hour - 1;
    }

    const newSetting: NotificationSetting = {
      id: Date.now().toString(),
      hour,
      minute,
      repeatType: 'daily',
      enabled: true,
    };

    const notificationIds = await scheduleNotification(newSetting);
    if (notificationIds) {
      newSetting.notificationIds = notificationIds;
    }

    await saveNotificationSetting(newSetting);
    setSettings([...settings, newSetting]);
    Alert.alert('設定完了', `ベスト時間の15分前（${formatTime(hour, minute)}）に通知を設定しました！`);
  };

  const handleAddNew = async () => {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      Alert.alert('権限エラー', '通知を有効にするには、設定から通知権限を許可してください。');
      return;
    }

    // 現在時刻の1時間後をデフォルトに
    const defaultTime = new Date();
    defaultTime.setHours(defaultTime.getHours() + 1, 0, 0, 0);
    setTempTime(defaultTime);
    setIsAddingNew(true);
    setEditingId(null);
    setShowTimePicker(true);
  };

  const handleConfirmNewTime = async (selectedTime: Date) => {
    const newSetting: NotificationSetting = {
      id: Date.now().toString(),
      hour: selectedTime.getHours(),
      minute: selectedTime.getMinutes(),
      repeatType: 'none',
      enabled: true,
    };

    // スケジュール
    const notificationIds = await scheduleNotification(newSetting);
    if (notificationIds) {
      newSetting.notificationIds = notificationIds;
    }

    await saveNotificationSetting(newSetting);
    setSettings([...settings, newSetting]);
    setIsAddingNew(false);
    setShowTimePicker(false);
  };

  const handleToggle = async (setting: NotificationSetting) => {
    const updated = { ...setting, enabled: !setting.enabled };

    if (updated.enabled) {
      const notificationIds = await scheduleNotification(updated);
      updated.notificationIds = notificationIds || undefined;
    } else if (setting.notificationIds && setting.notificationIds.length > 0) {
      await cancelNotifications(setting.notificationIds);
      updated.notificationIds = undefined;
    }

    await saveNotificationSetting(updated);
    setSettings(settings.map(s => s.id === updated.id ? updated : s));
  };

  const handleDelete = (setting: NotificationSetting) => {
    Alert.alert(
      '通知を削除',
      'この通知設定を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            if (setting.notificationIds && setting.notificationIds.length > 0) {
              await cancelNotifications(setting.notificationIds);
            }
            await deleteNotificationSetting(setting.id);
            setSettings(settings.filter(s => s.id !== setting.id));
          },
        },
      ]
    );
  };

  const handleTimePress = (setting: NotificationSetting) => {
    const time = new Date();
    time.setHours(setting.hour, setting.minute, 0, 0);
    setTempTime(time);
    setEditingId(setting.id);
    setShowTimePicker(true);
  };

  const handleTimeChange = async (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'dismissed') {
        setIsAddingNew(false);
        return;
      }
    }

    if (selectedTime) {
      setTempTime(selectedTime);
      
      // 新規追加モードの場合
      if (isAddingNew) {
        if (Platform.OS === 'android') {
          await handleConfirmNewTime(selectedTime);
        }
        // iOSの場合は完了ボタンで確定
        return;
      }

      // 既存の編集モードの場合
      if (editingId) {
        const setting = settings.find(s => s.id === editingId);
        if (setting) {
          const updated = {
            ...setting,
            hour: selectedTime.getHours(),
            minute: selectedTime.getMinutes(),
          };

          if (updated.enabled && updated.notificationIds && updated.notificationIds.length > 0) {
            await cancelNotifications(updated.notificationIds);
          }
          if (updated.enabled) {
            const notificationIds = await scheduleNotification(updated);
            updated.notificationIds = notificationIds || undefined;
          }

          await saveNotificationSetting(updated);
          setSettings(settings.map(s => s.id === updated.id ? updated : s));
        }
      }
    }
  };

  const handleRepeatChange = async (setting: NotificationSetting, repeatType: RepeatType) => {
    const updated = { 
      ...setting, 
      repeatType,
      weekdays: repeatType === 'weekly' ? [1] : undefined, // デフォルト月曜
    };

    if (updated.enabled && updated.notificationIds && updated.notificationIds.length > 0) {
      await cancelNotifications(updated.notificationIds);
    }
    if (updated.enabled) {
      const notificationIds = await scheduleNotification(updated);
      updated.notificationIds = notificationIds || undefined;
    }

    await saveNotificationSetting(updated);
    setSettings(settings.map(s => s.id === updated.id ? updated : s));
  };

  const handleWeekdayToggle = async (setting: NotificationSetting, weekday: number) => {
    const currentWeekdays = setting.weekdays || [];
    let newWeekdays: number[];
    
    if (currentWeekdays.includes(weekday)) {
      // 既に選択されている場合は削除（最低1つは残す）
      if (currentWeekdays.length > 1) {
        newWeekdays = currentWeekdays.filter(d => d !== weekday);
      } else {
        return; // 最後の1つは削除できない
      }
    } else {
      // 選択されていない場合は追加
      newWeekdays = [...currentWeekdays, weekday].sort((a, b) => a - b);
    }

    const updated = { ...setting, weekdays: newWeekdays };

    if (updated.enabled && updated.notificationIds && updated.notificationIds.length > 0) {
      await cancelNotifications(updated.notificationIds);
    }
    if (updated.enabled) {
      const notificationIds = await scheduleNotification(updated);
      updated.notificationIds = notificationIds || undefined;
    }

    await saveNotificationSetting(updated);
    setSettings(settings.map(s => s.id === updated.id ? updated : s));
  };

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const renderSettingCard = (setting: NotificationSetting) => (
    <View key={setting.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <TouchableOpacity onPress={() => handleTimePress(setting)}>
          <Text style={[styles.timeText, !setting.enabled && styles.disabledText]}>
            {formatTime(setting.hour, setting.minute)}
          </Text>
        </TouchableOpacity>
        <View style={styles.cardActions}>
          <Switch
            value={setting.enabled}
            onValueChange={() => handleToggle(setting)}
            trackColor={{ false: '#D0D0D0', true: '#A8D0F0' }}
            thumbColor={setting.enabled ? '#4A90D9' : '#F4F4F4'}
          />
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(setting)}
          >
            <Text style={styles.deleteBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 繰り返し設定 */}
      <View style={styles.repeatContainer}>
        <Text style={styles.repeatLabel}>繰り返し</Text>
        <View style={styles.repeatOptions}>
          {REPEAT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.repeatBtn,
                setting.repeatType === option.value && styles.repeatBtnActive,
              ]}
              onPress={() => handleRepeatChange(setting, option.value)}
            >
              <Text style={[
                styles.repeatBtnText,
                setting.repeatType === option.value && styles.repeatBtnTextActive,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 曜日選択（毎週の場合） */}
      {setting.repeatType === 'weekly' && (
        <View style={styles.weekdayContainer}>
          <Text style={styles.repeatLabel}>曜日（複数選択可）</Text>
          <View style={styles.weekdayOptions}>
            {WEEKDAYS.map((day, index) => {
              const isSelected = setting.weekdays?.includes(index) || false;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.weekdayBtn,
                    isSelected && styles.weekdayBtnActive,
                  ]}
                  onPress={() => handleWeekdayToggle(setting, index)}
                >
                  <Text style={[
                    styles.weekdayBtnText,
                    isSelected && styles.weekdayBtnTextActive,
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {setting.repeatType === 'none' && (
        <Text style={styles.noteText}>※ 一度通知されると自動的にオフになります</Text>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={['#FFFFFF', '#EFF8FE', '#D6EAF8']}
      locations={[0, 0.6, 1]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <LinearGradient
            colors={['#FFFFFF', '#A8D0F0', '#7BB8E8']}
            locations={[0, 0.5, 1]}
            style={styles.backBtnGradient}
          >
            <Text style={styles.backText}>← Back</Text>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>通知設定</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ベスト時間提案セクション */}
        {bestTimeStats && (
          <View style={styles.suggestionCard}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionEmoji}>💡</Text>
              <Text style={styles.suggestionTitle}>あなたのベスト時間</Text>
            </View>
            <Text style={styles.suggestionTime}>
              {formatTime(bestTimeStats.bestHour, bestTimeStats.bestMinute)}
            </Text>
            <Text style={styles.suggestionSubtext}>
              過去{bestTimeStats.count}回の記録から分析
            </Text>
            <TouchableOpacity 
              style={styles.suggestionBtn}
              onPress={handleApplyBestTime}
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.suggestionBtnGradient}
              >
                <Text style={styles.suggestionBtnText}>
                  この時間で通知を設定 🔔
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {settings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>通知設定がありません</Text>
            <Text style={styles.emptySubtext}>
              下のボタンから通知を追加して{'\n'}朝のシャワー習慣を始めましょう！
            </Text>
          </View>
        ) : (
          settings.map(renderSettingCard)
        )}
      </ScrollView>

      {/* 追加ボタン */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity onPress={handleAddNew} activeOpacity={0.8}>
          <LinearGradient
            colors={['#4A90D9', '#4A7FC1']}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ 通知を追加</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Time Picker */}
      {showTimePicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity 
                onPress={() => {
                  setShowTimePicker(false);
                  setIsAddingNew(false);
                }}
                style={styles.pickerCancelBtn}
              >
                <Text style={styles.pickerCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>
                {isAddingNew ? '通知時間を設定' : '時間を変更'}
              </Text>
              <TouchableOpacity 
                onPress={async () => {
                  if (isAddingNew) {
                    await handleConfirmNewTime(tempTime);
                  } else {
                    setShowTimePicker(false);
                  }
                }}
                style={styles.pickerDoneBtn}
              >
                <Text style={styles.pickerDoneText}>
                  {isAddingNew ? '追加' : '完了'}
                </Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempTime}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={handleTimeChange}
              style={styles.timePicker}
            />
          </View>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#A0C4E8',
  },
  backBtnGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
  },
  headerTitle: {
    fontSize: 24,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#4A7FC1',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D0E4F0',
    shadowColor: '#4A90D9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 42,
    fontWeight: '300',
    color: '#2C3E50',
    letterSpacing: 2,
  },
  disabledText: {
    color: '#B0B0B0',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 16,
  },
  repeatContainer: {
    marginBottom: 12,
  },
  repeatLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#8BA4C4',
    marginBottom: 8,
  },
  repeatOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  repeatBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F0F4F8',
    borderWidth: 1,
    borderColor: '#D0E4F0',
  },
  repeatBtnActive: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  repeatBtnText: {
    fontSize: 13,
    color: '#2C3E50',
  },
  repeatBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  weekdayContainer: {
    marginTop: 8,
  },
  weekdayOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  weekdayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F4F8',
    borderWidth: 1,
    borderColor: '#D0E4F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdayBtnActive: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  weekdayBtnText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  weekdayBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noteText: {
    fontSize: 11,
    color: '#8BA4C4',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A7FC1',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8BA4C4',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  addButton: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F4FC',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2C3E50',
  },
  pickerCancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pickerCancelText: {
    fontSize: 16,
    color: '#8BA4C4',
  },
  pickerDoneBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90D9',
  },
  timePicker: {
    height: 200,
  },
  // ベスト時間提案スタイル
  suggestionCard: {
    backgroundColor: 'rgba(255, 248, 220, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  suggestionEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B8860B',
  },
  suggestionTime: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginVertical: 8,
  },
  suggestionSubtext: {
    fontSize: 13,
    color: '#8B7355',
    textAlign: 'center',
    marginBottom: 16,
  },
  suggestionBtn: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  suggestionBtnGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  suggestionBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default NotificationScreen;
