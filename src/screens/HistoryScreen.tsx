import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ShowerSession } from '../types';
import { getAllSessions, clearAllSessions, deleteSession, calculateStreak } from '../utils/storage';

type HistoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'History'>;

interface Props {
  navigation: HistoryScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const CELL_SIZE = Math.floor((width - 40 - 32) / 7);

// ユーティリティ関数（コンポーネント外に配置して再生成を防止）
const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
};

// カレンダーコンポーネント
interface CalendarProps {
  sessions: ShowerSession[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

const CalendarHeatmap: React.FC<CalendarProps> = React.memo(({ sessions, selectedDate, onSelectDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const { weeks, daysWithSessions, year, month } = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    
    // その月の達成日を取得
    const sessionsMap = new Map<number, string>();
    sessions.forEach(s => {
      const date = new Date(s.timestamp);
      if (date.getFullYear() === y && date.getMonth() === m) {
        sessionsMap.set(date.getDate(), `${y}/${m + 1}/${date.getDate()}`);
      }
    });
    
    // カレンダーの日付配列を作成
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    
    const days: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (days.length % 7 !== 0) days.push(null);
    
    // 週ごとに分割
    const weeksArray: (number | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeksArray.push(days.slice(i, i + 7));
    }
    
    return { weeks: weeksArray, daysWithSessions: sessionsMap, year: y, month: m };
  }, [currentMonth, sessions]);

  const monthCount = daysWithSessions.size;

  const isSelectedInMonth = useMemo(() => {
    if (!selectedDate) return false;
    const [y, m] = selectedDate.split('/').map(Number);
    return y === year && m === month + 1;
  }, [selectedDate, year, month]);

  const handleDayPress = useCallback((day: number) => {
    const dateStr = `${year}/${month + 1}/${day}`;
    onSelectDate(selectedDate === dateStr ? null : (daysWithSessions.has(day) ? dateStr : null));
  }, [year, month, selectedDate, daysWithSessions, onSelectDate]);

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    if (next <= new Date()) setCurrentMonth(next);
  }, [currentMonth]);

  const now = new Date();
  const isCurrentMonth = currentMonth.getMonth() === now.getMonth() && 
                         currentMonth.getFullYear() === now.getFullYear();

  return (
    <View style={calendarStyles.container}>
      {/* Month Navigation */}
      <View style={calendarStyles.monthNav}>
        <TouchableOpacity onPress={goToPrevMonth} style={calendarStyles.navBtn}>
          <Text style={calendarStyles.navText}>←</Text>
        </TouchableOpacity>
        <View style={calendarStyles.monthInfo}>
          <Text style={calendarStyles.monthText}>{year}年{month + 1}月</Text>
          <Text style={calendarStyles.monthCount}>{monthCount}日達成</Text>
        </View>
        <TouchableOpacity 
          onPress={goToNextMonth} 
          style={[calendarStyles.navBtn, isCurrentMonth && calendarStyles.navBtnDisabled]}
          disabled={isCurrentMonth}
        >
          <Text style={[calendarStyles.navText, isCurrentMonth && calendarStyles.navTextDisabled]}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View style={calendarStyles.weekdayRow}>
        {WEEKDAYS.map((day, i) => (
          <Text key={day} style={[calendarStyles.weekdayText, i === 0 && calendarStyles.sundayText]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={calendarStyles.grid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={calendarStyles.weekRow}>
            {week.map((day, dayIndex) => {
              const hasSession = day !== null && daysWithSessions.has(day);
              const dateStr = day !== null ? `${year}/${month + 1}/${day}` : '';
              const isSelected = selectedDate === dateStr;
              
              return (
                <TouchableOpacity 
                  key={dayIndex} 
                  style={calendarStyles.cell}
                  onPress={() => day !== null && handleDayPress(day)}
                  disabled={day === null || !hasSession}
                  activeOpacity={hasSession ? 0.7 : 1}
                >
                  {day !== null && (
                    <View style={[
                      calendarStyles.dayCircle,
                      hasSession && calendarStyles.dayCircleActive,
                      isSelected && calendarStyles.dayCircleSelected
                    ]}>
                      <Text style={[
                        calendarStyles.dayText,
                        hasSession && calendarStyles.dayTextActive,
                        isSelected && calendarStyles.dayTextSelected
                      ]}>
                        {day}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* 選択解除ボタン */}
      {selectedDate && isSelectedInMonth && (
        <TouchableOpacity 
          style={calendarStyles.clearSelection}
          onPress={() => onSelectDate(null)}
        >
          <Text style={calendarStyles.clearSelectionText}>✕ 選択解除</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const calendarStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D0E4F0',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navBtn: {
    padding: 8,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navText: {
    fontSize: 20,
    color: '#4A90D9',
    fontWeight: '600',
  },
  navTextDisabled: {
    color: '#B0B0B0',
  },
  monthInfo: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  monthCount: {
    fontSize: 12,
    color: '#4A90D9',
    marginTop: 2,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekdayText: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 12,
    color: '#8BA4C4',
    fontWeight: '500',
  },
  sundayText: {
    color: '#FF6B6B',
  },
  grid: {
    // 週ごとに行を配置
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: CELL_SIZE - 8,
    height: CELL_SIZE - 8,
    borderRadius: (CELL_SIZE - 8) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleActive: {
    backgroundColor: '#4A90D9',
  },
  dayCircleSelected: {
    backgroundColor: '#2C7BE5',
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  dayText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  dayTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  clearSelection: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#F0F5FA',
    borderRadius: 16,
  },
  clearSelectionText: {
    fontSize: 13,
    color: '#6B8AB8',
  },
});

const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [sessions, setSessions] = useState<ShowerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, thisWeekCount: 0 });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // カテゴリー別統計（上位5カテゴリ）
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => s.todos.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [sessions]);

  // 平均シャワー時間（直近10回）
  const avgDuration = useMemo(() => {
    const withDuration = sessions.filter(s => s.duration && s.duration > 0).slice(0, 10);
    if (withDuration.length === 0) return null;
    return Math.round(withDuration.reduce((sum, s) => sum + (s.duration || 0), 0) / withDuration.length);
  }, [sessions]);

  // 選択された日付のセッションをフィルタリング
  const filteredSessions = useMemo(() => {
    if (!selectedDate) return [];
    return sessions.filter(s => formatDate(s.timestamp) === selectedDate);
  }, [sessions, selectedDate]);

  // データ読み込み
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadSessions = async () => {
        setLoading(true);
        const [data, streakData] = await Promise.all([
          getAllSessions(),
          calculateStreak()
        ]);
        if (isMounted) {
          setSessions(data);
          setStreak(streakData);
          setLoading(false);
        }
      };
      loadSessions();
      return () => { isMounted = false; };
    }, [])
  );

  const handleDeleteAll = useCallback(() => {
    Alert.alert(
      '全ての履歴を削除',
      '本当に全ての履歴を削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await clearAllSessions();
            setSessions([]);
          },
        },
      ]
    );
  }, []);

  const handleDeleteOne = useCallback(async (sessionId: string) => {
    await deleteSession(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  const renderItem = useCallback(({ item }: { item: ShowerSession }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
            {item.duration && item.duration > 0 && (
              <Text style={styles.durationText}>（{formatDuration(item.duration)}）</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteOne(item.id)}
        >
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
      {item.feedback && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackLabel}>Feeling</Text>
          <Text style={styles.feedbackText}>{item.feedback}</Text>
        </View>
      )}
      {item.todos.length > 0 && (
        <View style={styles.todosContainer}>
          <Text style={styles.todosLabel}>Tasks</Text>
          {item.todos.map((todo, index) => (
            <View key={index} style={styles.todoItem}>
              <Text style={styles.todoCategoryBadge}>{todo.category}</Text>
              <Text style={styles.todoMemo}>{todo.memo || '(メモなし)'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  ), [handleDeleteOne]);

  const renderEmptyList = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🚿</Text>
      <Text style={styles.emptyText}>記録がありません</Text>
      <Text style={styles.emptySubtext}>シャワーを完了して記録を始めましょう！</Text>
    </View>
  ), []);

  const renderNoData = useCallback(() => (
    <View style={styles.noDataContainer}>
      <Text style={styles.noDataText}>この日の記録はありません</Text>
    </View>
  ), []);

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
        <Text style={styles.headerTitle}>History</Text>
        {sessions.length > 0 ? (
          <TouchableOpacity onPress={handleDeleteAll} style={styles.deleteAllBtn}>
            <Text style={styles.deleteAllText}>全削除</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={selectedDate ? filteredSessions : []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={sessions.length === 0 ? styles.emptyList : styles.listContent}
          ListHeaderComponent={
            sessions.length > 0 ? (
              <View>
                {/* 統計サマリー */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>🔥 {streak.currentStreak}</Text>
                    <Text style={styles.statLabel}>連続日数</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>🏆 {streak.longestStreak}</Text>
                    <Text style={styles.statLabel}>最長記録</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>📊 {sessions.length}</Text>
                    <Text style={styles.statLabel}>総回数</Text>
                  </View>
                </View>

                {/* 平均シャワー時間 */}
                {avgDuration && (
                  <View style={styles.avgTimeContainer}>
                    <Text style={styles.avgTimeLabel}>⏱️ 直近10回の平均</Text>
                    <Text style={styles.avgTimeValue}>{formatDuration(avgDuration)}</Text>
                  </View>
                )}

                {/* カテゴリー別統計 */}
                {categoryStats.length > 0 && (
                  <View style={styles.categoryStatsContainer}>
                    <Text style={styles.categoryStatsTitle}>📋 カテゴリー別タスク</Text>
                    <View style={styles.categoryStatsList}>
                      {categoryStats.map(([category, count]) => (
                        <View key={category} style={styles.categoryStatItem}>
                          <Text style={styles.categoryStatName}>{category}</Text>
                          <View style={styles.categoryStatBarContainer}>
                            <View 
                              style={[
                                styles.categoryStatBar, 
                                { width: `${Math.min(100, (count / categoryStats[0][1]) * 100)}%` }
                              ]} 
                            />
                          </View>
                          <Text style={styles.categoryStatCount}>{count}回</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* カレンダー */}
                <CalendarHeatmap 
                  sessions={sessions} 
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
                
                {/* 選択中の日付またはヒント表示 */}
                {selectedDate ? (
                  <Text style={styles.sectionTitle}>
                    📅 {selectedDate} の記録（{filteredSessions.length}件）
                  </Text>
                ) : (
                  <View style={styles.hintContainer}>
                    <Text style={styles.hintText}>💡 カレンダーの日付をタップして記録を確認</Text>
                  </View>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={selectedDate ? renderNoData : renderEmptyList}
          showsVerticalScrollIndicator={false}
        />
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
    fontSize: 28,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#4A7FC1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8BA4C4',
    fontStyle: 'italic',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyList: {
    flex: 1,
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F4FC',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A90D9',
    marginTop: 2,
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
  deleteAllBtn: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  deleteAllText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackContainer: {
    marginBottom: 12,
  },
  feedbackLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#8BA4C4',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 22,
  },
  todosContainer: {
    marginTop: 8,
  },
  todosLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#8BA4C4',
    marginBottom: 8,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  todoCategoryBadge: {
    backgroundColor: '#E8F4FC',
    color: '#4A7FC1',
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
    overflow: 'hidden',
  },
  todoMemo: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  },
  // Stats container styles
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#4A7FC1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: 12,
    color: '#8BA4C4',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E8F4FC',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A7FC1',
    marginBottom: 12,
    marginTop: 8,
  },
  // ヒント表示スタイル
  hintContainer: {
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F4FC',
    marginBottom: 12,
  },
  hintText: {
    fontSize: 14,
    color: '#8BA4C4',
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#8BA4C4',
    fontStyle: 'italic',
  },
  // 時間行スタイル
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 12,
    color: '#4A90D9',
    marginLeft: 4,
    fontWeight: '500',
  },
  // 平均時間スタイル
  avgTimeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0E4F0',
  },
  avgTimeLabel: {
    fontSize: 14,
    color: '#6B8AB8',
    fontWeight: '500',
  },
  avgTimeValue: {
    fontSize: 18,
    color: '#4A90D9',
    fontWeight: 'bold',
  },
  // カテゴリー統計スタイル
  categoryStatsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D0E4F0',
  },
  categoryStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  categoryStatsList: {
    gap: 10,
  },
  categoryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryStatName: {
    width: 60,
    fontSize: 13,
    color: '#2C3E50',
    fontWeight: '500',
  },
  categoryStatBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: '#E8F4FC',
    borderRadius: 8,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  categoryStatBar: {
    height: '100%',
    backgroundColor: '#4A90D9',
    borderRadius: 8,
  },
  categoryStatCount: {
    width: 40,
    fontSize: 13,
    color: '#6B8AB8',
    textAlign: 'right',
  },
});

export default HistoryScreen;
