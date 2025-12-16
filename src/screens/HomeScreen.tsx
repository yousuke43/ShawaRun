import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, SortsMillGoudy_400Regular } from '@expo-google-fonts/sorts-mill-goudy';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ShowerSession, TodoItem } from '../types';
import { getAllSessions, calculateStreak, didShowerToday } from '../utils/storage';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');
const BUTTON_SIZE = width * 0.5;

// 今日の一言メリット
const DAILY_TIPS = [
  '🧠 シャワーで脳を起こそう',
  '✨ 気持ちをリセット',
  '💪 今日のスイッチを入れる',
  '🌅 新しい一日の始まり',
  '🎯 集中力アップ',
  '😊 気分転換に3分だけでも',
  '🚀 やる気スイッチON',
  '💡 アイデアはシャワー中に',
];

// ふわふわ浮かぶ感想バブル
interface FloatingBubble {
  id: string;
  text: string;
  x: number;
  animatedY: Animated.Value;
  animatedOpacity: Animated.Value;
  animatedX: Animated.Value;
  size: 'small' | 'medium' | 'large';
}

const FloatingFeedback: React.FC<{ bubble: FloatingBubble }> = ({ bubble }) => {
  const sizeStyles = {
    small: { fontSize: 11, padding: 8, maxWidth: 120 },
    medium: { fontSize: 13, padding: 10, maxWidth: 160 },
    large: { fontSize: 14, padding: 12, maxWidth: 200 },
  };
  const style = sizeStyles[bubble.size];

  return (
    <Animated.View
      style={[
        styles.floatingBubble,
        {
          left: bubble.x,
          transform: [
            { translateY: bubble.animatedY },
            { translateX: bubble.animatedX },
          ],
          opacity: bubble.animatedOpacity,
          padding: style.padding,
          maxWidth: style.maxWidth,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.floatingText, { fontSize: style.fontSize }]} numberOfLines={3}>
        {bubble.text}
      </Text>
    </Animated.View>
  );
};

// 励ましメッセージ
const SHOWER_MESSAGES = [
  '🚿 シャワー中... リラックス!',
  '💧 水の音を楽しんで',
  '✨ 今日も頑張るあなたへ',
  '🌟 朝シャワーで脳が目覚める!',
  '💪 3分でもOK!',
];

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    SortsMillGoudy_400Regular,
  });
  const [feedbacks, setFeedbacks] = useState<string[]>([]);
  const [bubbles, setBubbles] = useState<FloatingBubble[]>([]);
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, thisWeekCount: 0 });
  const [showeredToday, setShoweredToday] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [dailyTip] = useState(() => DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)]);
  const [recentTodos, setRecentTodos] = useState<string[]>([]);
  const bubbleIdRef = useRef(0);
  const bubbleCountRef = useRef(0);
  const feedbacksRef = useRef<string[]>([]);
  
  // シャワータイマー用state
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showerMessage] = useState(() => SHOWER_MESSAGES[Math.floor(Math.random() * SHOWER_MESSAGES.length)]);
  const [showerStartTime, setShowerStartTime] = useState<string>('');
  
  // 今日のセッションデータ（複数回対応）
  const [todayTodos, setTodayTodos] = useState<TodoItem[]>([]);
  const [todayTotalDuration, setTodayTotalDuration] = useState<number>(0);
  const [todaySessionCount, setTodaySessionCount] = useState<number>(0);
  const [todayFeedbacks, setTodayFeedbacks] = useState<string[]>([]);

  // 過去の感想と統計を読み込む
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const sessions = await getAllSessions();
        
        // 感想を読み込む
        const allFeedbacks = sessions
          .filter(s => s.feedback && s.feedback.trim() !== '')
          .map(s => s.feedback);
        setFeedbacks(allFeedbacks);
        feedbacksRef.current = allFeedbacks;
        
        // 統計を読み込む
        const streakData = await calculateStreak();
        setStreak(streakData);
        
        // 今日シャワーしたか + 今日のセッションデータを取得
        const today = await didShowerToday();
        setShoweredToday(today);
        
        // 今日の全セッションを取得
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todaySessions = sessions.filter(s => {
          const sessionDate = new Date(s.timestamp);
          return sessionDate >= todayStart;
        });
        
        if (todaySessions.length > 0) {
          // 全セッションのTodoを集約
          const allTodayTodos: TodoItem[] = [];
          let totalDuration = 0;
          const feedbacks: string[] = [];
          
          todaySessions.forEach(s => {
            allTodayTodos.push(...s.todos);
            if (s.duration) totalDuration += s.duration;
            if (s.feedback) feedbacks.push(s.feedback);
          });
          
          setTodayTodos(allTodayTodos);
          setTodayTotalDuration(totalDuration);
          setTodaySessionCount(todaySessions.length);
          setTodayFeedbacks(feedbacks);
        } else {
          setTodayTodos([]);
          setTodayTotalDuration(0);
          setTodaySessionCount(0);
          setTodayFeedbacks([]);
        }
        
        // よく使うTodoカテゴリを取得
        const todoCounts: { [key: string]: number } = {};
        sessions.forEach(s => {
          s.todos.forEach(t => {
            todoCounts[t.category] = (todoCounts[t.category] || 0) + 1;
          });
        });
        const sortedTodos = Object.entries(todoCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat]) => cat);
        setRecentTodos(sortedTodos);
      };
      loadData();
    }, [])
  );

  // ふわふわアニメーション
  useEffect(() => {
    if (feedbacks.length === 0) return;

    const createBubble = () => {
      if (bubbleCountRef.current >= 5) return;
      
      const currentFeedbacks = feedbacksRef.current;
      if (currentFeedbacks.length === 0) return;

      bubbleCountRef.current++;
      const id = `bubble-${bubbleIdRef.current++}`;
      const text = currentFeedbacks[Math.floor(Math.random() * currentFeedbacks.length)];
      const x = Math.random() * (width - 150) + 20;
      const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      
      const animatedY = new Animated.Value(height);
      const animatedOpacity = new Animated.Value(0);
      const animatedX = new Animated.Value(0);

      const newBubble: FloatingBubble = {
        id,
        text,
        x,
        animatedY,
        animatedOpacity,
        animatedX,
        size,
      };

      setBubbles(prev => [...prev, newBubble]);

      // ふわふわ左右に揺れる（easing追加でスムーズに）
      const swayDuration = 2500 + Math.random() * 1000;
      const swayAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedX, {
            toValue: 12,
            duration: swayDuration,
            useNativeDriver: true,
            easing: (t) => Math.sin(t * Math.PI),
          }),
          Animated.timing(animatedX, {
            toValue: -12,
            duration: swayDuration,
            useNativeDriver: true,
            easing: (t) => Math.sin(t * Math.PI),
          }),
        ])
      );

      // 上昇アニメーション
      const riseDuration = 14000 + Math.random() * 4000;
      Animated.parallel([
        Animated.timing(animatedY, {
          toValue: -100,
          duration: riseDuration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(animatedOpacity, {
            toValue: 0.85,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.delay(riseDuration - 5000),
          Animated.timing(animatedOpacity, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        bubbleCountRef.current--;
        setBubbles(prev => prev.filter(b => b.id !== id));
      });

      swayAnimation.start();
    };

    // 初期バブルを少し遅らせて生成
    const initialTimeout = setTimeout(() => {
      createBubble();
    }, 1000);

    // 定期的にバブルを生成（固定間隔）
    const interval = setInterval(() => {
      createBubble();
    }, 4000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [feedbacks.length]);

  const handleShowerComplete = () => {
    const timestamp = new Date().toISOString();
    navigation.navigate('Todo', { timestamp });
  };

  const handleMainButtonPress = () => {
    setShowActionModal(true);
  };

  const handleGoingToShower = () => {
    setShowActionModal(false);
    setTimerSeconds(0);
    setShowerStartTime(new Date().toISOString());
    setShowTimerModal(true);
  };

  // シャワータイマー
  useEffect(() => {
    if (!showTimerModal) return;
    
    const interval = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimerModal]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDurationDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
  };

  const handleShowerDone = () => {
    setShowTimerModal(false);
    navigation.navigate('Todo', { timestamp: showerStartTime, duration: timerSeconds });
  };

  const handleFinishedShower = () => {
    setShowActionModal(false);
    const timestamp = new Date().toISOString();
    navigation.navigate('Todo', { timestamp });
  };

  const handleViewHistory = () => {
    navigation.navigate('History');
  };

  const handleNotificationSettings = () => {
    navigation.navigate('Notification');
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A6FA5" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#FFFFFF','#EFF8FE' ,'#207DBC']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      {/* ふわふわ浮かぶ過去の感想 */}
      {bubbles.map(bubble => (
        <FloatingFeedback key={bubble.id} bubble={bubble} />
      ))}

      {/* Title */}
      <Text style={styles.title}>ShawaRun</Text>

      {/* 今日の一言メリット */}
      <View style={styles.tipContainer}>
        <Text style={styles.tipText}>{dailyTip}</Text>
      </View>

      {/* 連続記録 */}
      {streak.currentStreak > 0 && (
        <View style={styles.streakContainer}>
          <Text style={styles.streakNumber}>🔥 {streak.currentStreak}</Text>
          <Text style={styles.streakLabel}>日連続</Text>
        </View>
      )}

      {/* Main Button - 常に表示 */}
      <View style={styles.mainButtonContainer}>
        <TouchableOpacity
          style={[styles.mainButton, showeredToday && styles.mainButtonDone]}
          onPress={handleMainButtonPress}
          activeOpacity={0.8}
        >
          <Text style={styles.mainButtonText}>
            {showeredToday ? 'Done!' : 'Shower'}
          </Text>
          {!showeredToday && (
            <Text style={styles.mainButtonSubtext}>タップして開始</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 今週の進捗 */}
      <View style={styles.weekProgressContainer}>
        <Text style={styles.weekProgressText}>
          今週 {streak.thisWeekCount} 回達成
        </Text>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.historyButtonContainer}>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={handleNotificationSettings}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FFFFFF', '#A8D0F0', '#7BB8E8']}
            locations={[0, 0.5, 1]}
            style={styles.notificationButtonGradient}
          >
            <Text style={styles.notificationButtonText}>🔔 通知設定</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={handleViewHistory}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FFFFFF', '#4A90D9']}
            locations={[0, 0.5]}
            style={styles.historyButtonGradient}
          >
            <Text style={styles.historyButtonText}>📊 History</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {showeredToday ? (
              // Done状態のモーダル
              <>
                <Text style={styles.modalTitle}>✅ 今日のシャワー完了！</Text>
                
                <View style={styles.modalStatsRow}>
                  {todaySessionCount > 0 && (
                    <Text style={styles.modalStatItem}>🚿 {todaySessionCount}回</Text>
                  )}
                  {todayTotalDuration > 0 && (
                    <Text style={styles.modalStatItem}>⏱️ {formatDurationDisplay(todayTotalDuration)}</Text>
                  )}
                </View>
                
                {todayFeedbacks.length > 0 && (
                  <Text style={styles.modalFeedback}>
                    「{todayFeedbacks[todayFeedbacks.length - 1]}」
                  </Text>
                )}
                
                {todayTodos.length > 0 && (
                  <View style={styles.modalTodosContainer}>
                    <Text style={styles.modalTodosLabel}>
                      今日のタスク（{todayTodos.length}件）
                    </Text>
                    <ScrollView 
                      style={styles.modalTodosScroll}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      {todayTodos.map((todo, index) => (
                        <View key={index} style={styles.modalTodoItem}>
                          <Text style={styles.modalTodoBadge}>{todo.category}</Text>
                          {todo.memo ? <Text style={styles.modalTodoMemo}>{todo.memo}</Text> : null}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                <Text style={styles.modalExtraLabel}>追加でシャワーする？</Text>
                
                <View style={styles.modalSmallButtons}>
                  <TouchableOpacity
                    style={styles.modalSmallBtn}
                    onPress={handleGoingToShower}
                  >
                    <Text style={styles.modalSmallBtnText}>🚿 今から入る</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalSmallBtnAlt}
                    onPress={handleFinishedShower}
                  >
                    <Text style={styles.modalSmallBtnAltText}>✨ 入った</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // 未完了状態のモーダル
              <>
                <Text style={styles.modalTitle}>シャワーの準備は？</Text>
                
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleGoingToShower}
                >
                  <LinearGradient
                    colors={['#A8D0F0', '#7BB8E8']}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonEmoji}>🚿</Text>
                    <Text style={styles.modalButtonText}>今から入る</Text>
                    <Text style={styles.modalButtonSubtext}>3分だけでもOK!</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleFinishedShower}
                >
                  <LinearGradient
                    colors={['#4A90D9', '#4A7FC1']}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonEmoji}>✨</Text>
                    <Text style={styles.modalButtonTextWhite}>入った！</Text>
                    <Text style={styles.modalButtonSubtextWhite}>今日のタスクを記録</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {recentTodos.length > 0 && (
                  <View style={styles.recentTodosHint}>
                    <Text style={styles.recentTodosText}>
                      よく記録: {recentTodos.join(' / ')}
                    </Text>
                  </View>
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowActionModal(false)}
            >
              <Text style={styles.modalCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Shower Timer Modal */}
      <Modal
        visible={showTimerModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2', '#6B8DD6']}
          style={styles.timerModalOverlay}
        >
          <Text style={styles.timerEmoji}>🚿</Text>
          <Text style={styles.timerMessage}>{showerMessage}</Text>
          
          <View style={styles.timerCircle}>
            <Text style={styles.timerText}>{formatTimer(timerSeconds)}</Text>
          </View>

          <View style={styles.timerTips}>
            {timerSeconds >= 180 && (
              <Text style={styles.timerTipText}>✨ 3分達成！いい調子!</Text>
            )}
            {timerSeconds >= 300 && (
              <Text style={styles.timerTipText}>🌟 5分達成！完璧です!</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.timerDoneButton}
            onPress={handleShowerDone}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F0F8FF']}
              style={styles.timerDoneButtonGradient}
            >
              <Text style={styles.timerDoneButtonText}>完了して記録する ✓</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.timerHint}>シャワー後にタップ</Text>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 150,
  },
  title: {
    fontSize: 42,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#5270B9',
    marginBottom: 8,
  },
  tipContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 15,
    color: '#4A7FC1',
    fontWeight: '500',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  streakLabel: {
    fontSize: 16,
    color: '#FF6B35',
    marginLeft: 4,
    fontWeight: '500',
  },
  mainButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#DEEEFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A0C4E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mainButtonDone: {
    backgroundColor: '#C8E6C9',
  },
  mainButtonText: {
    fontSize: 36,
    fontFamily: 'SortsMillGoudy_400Regular',
    color: '#0C2359',
  },
  mainButtonSubtext: {
    fontSize: 12,
    color: '#6B8AB8',
    marginTop: 4,
  },
  weekProgressContainer: {
    marginBottom: 16,
  },
  weekProgressText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  historyButtonContainer: {
    marginBottom: 50,
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  notificationButton: {
    width: width * 0.55,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#A0C4E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  notificationButtonText: {
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: '500',
    color: '#2C3E50',
  },
  historyButton: {
    width: width * 0.55,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#A0C4E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  historyButtonText: {
    fontSize: 20,
    fontStyle: 'italic',
    fontWeight: '500',
    color: '#0C2359',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  floatingBubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 217, 0.3)',
    shadowColor: '#4A90D9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  floatingText: {
    color: '#2C3E50',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 20,
  },
  modalButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  modalButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalButtonEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  modalButtonTextWhite: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonSubtext: {
    fontSize: 12,
    color: '#6B8AB8',
    marginTop: 4,
  },
  modalButtonSubtextWhite: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  recentTodosHint: {
    marginTop: 8,
    marginBottom: 8,
  },
  recentTodosText: {
    fontSize: 12,
    color: '#8BA4C4',
    fontStyle: 'italic',
  },
  modalCloseButton: {
    marginTop: 8,
    paddingVertical: 12,
  },
  modalCloseText: {
    fontSize: 14,
    color: '#8BA4C4',
  },
  // Done状態モーダルのスタイル
  modalStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  modalStatItem: {
    fontSize: 15,
    color: '#4A90D9',
    fontWeight: '500',
  },
  modalFeedback: {
    fontSize: 15,
    color: '#6B8AB8',
    fontStyle: 'italic',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalTodosContainer: {
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 16,
    maxHeight: 200,
  },
  modalTodosScroll: {
    maxHeight: 150,
  },
  modalTodosLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A7FC1',
    marginBottom: 8,
  },
  modalTodoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTodoBadge: {
    backgroundColor: '#E8F4FC',
    color: '#4A7FC1',
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
    overflow: 'hidden',
  },
  modalTodoMemo: {
    fontSize: 12,
    color: '#2C3E50',
    flex: 1,
  },
  modalExtraLabel: {
    fontSize: 13,
    color: '#8BA4C4',
    marginBottom: 12,
  },
  modalSmallButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  modalSmallBtn: {
    backgroundColor: '#F0F8FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4A90D9',
  },
  modalSmallBtnText: {
    fontSize: 13,
    color: '#4A90D9',
    fontWeight: '500',
  },
  modalSmallBtnAlt: {
    backgroundColor: '#4A90D9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  modalSmallBtnAltText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  // Timer Modal Styles
  timerModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timerEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  timerMessage: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '500',
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 30,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  timerTips: {
    minHeight: 50,
    marginBottom: 20,
    alignItems: 'center',
  },
  timerTipText: {
    fontSize: 18,
    color: '#FFD700',
    fontWeight: '600',
    marginVertical: 4,
  },
  timerDoneButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  timerDoneButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 50,
  },
  timerDoneButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A7FC1',
  },
  timerHint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
  },
});

export default HomeScreen;
