import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Modal,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, ShowerSession } from '../types';
import { saveSession, calculateStreak } from '../utils/storage';

type FeedbackScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Feedback'>;
type FeedbackScreenRouteProp = RouteProp<RootStackParamList, 'Feedback'>;

interface Props {
  navigation: FeedbackScreenNavigationProp;
  route: FeedbackScreenRouteProp;
}

const { width } = Dimensions.get('window');
const MOODS = ['すっきり!!', 'やる気満々!!', '入ってよかった！！', 'リフレッシュ!!',];

const FeedbackScreen: React.FC<Props> = ({ navigation, route }) => {
  const { timestamp, todos, duration } = route.params;
  const [feedback, setFeedback] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [streakData, setStreakData] = useState({ currentStreak: 0, bestStreak: 0, weekCount: 0 });
  const [savedSession, setSavedSession] = useState<ShowerSession | null>(null);

  const handleCancel = () => {
    navigation.popToTop();
  };

  const handleComplete = async () => {
    const session: ShowerSession = {
      id: Date.now().toString(),
      timestamp,
      todos,
      feedback: selectedMood || feedback,
      duration,
    };

    try {
      await saveSession(session);
      const streak = await calculateStreak();
      setStreakData(streak);
      setSavedSession(session);
      setShowShareModal(true);
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const handleShare = async () => {
    const date = new Date();
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
    const message = `🚿 ${dateStr} 朝シャワー完了！\n\n` +
      `気分: ${savedSession?.feedback || 'スッキリ'}\n` +
      `🔥 連続 ${streakData.currentStreak} 日目\n\n` +
      `#ShawaRun #朝活 #朝シャワー習慣`;
    
    try {
      await Share.share({
        message,
      });
    } catch (error) {
      // ユーザーがキャンセルした場合など
    }
  };

  const handleCloseModal = () => {
    setShowShareModal(false);
    navigation.popToTop();
  };

  const isValid = selectedMood || feedback.trim();

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient
        colors={['#FFFFFF', '#EFF8FE', '#D6EAF8']}
        locations={[0, 0.6, 1]}
        style={styles.container}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.backBtn}>
              <LinearGradient
                colors={['#FFFFFF', '#A8D0F0', '#7BB8E8']}
                locations={[0, 0.5, 1]}
                style={styles.backBtnGradient}
              >
                <Text style={styles.backText}>← Back</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.title}>Feedback</Text>
            <View style={{ width: 80 }} />
          </View>

          {/* Mood Selection */}
          <Text style={styles.label}>How do you feel?</Text>
          <View style={styles.moodRow}>
            {MOODS.map((mood) => (
              <TouchableOpacity
                key={mood}
                style={[
                  styles.moodBtn,
                  selectedMood === mood && styles.moodBtnSelected,
                ]}
                onPress={() => {
                  setSelectedMood(mood);
                  setFeedback('');
                }}
              >
                <Text
                  style={[
                    styles.moodText,
                    selectedMood === mood && styles.moodTextSelected,
                  ]}
                >
                  {mood}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Free Input */}
          <Text style={styles.label}>Or write freely</Text>
          <TextInput
            style={styles.input}
            placeholder="気分を自由に書いてください..."
            placeholderTextColor="#8BA4C4"
            value={feedback}
            onChangeText={(t) => {
              setFeedback(t);
              setSelectedMood('');
            }}
            multiline
          />

          {/* Summary */}
          <Text style={styles.label}>Today's Tasks</Text>
          <View style={styles.summary}>
            {todos.length === 0 ? (
              <Text style={styles.emptyTaskText}>タスクなし</Text>
            ) : (
              todos.map((t, i) => (
                <View key={i} style={styles.taskItem}>
                  <Text style={styles.taskCategoryBadge}>{t.category}</Text>
                  <Text style={styles.taskMemo}>{t.memo || '(メモなし)'}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Complete Button */}
        <View style={styles.completeBtnContainer}>
          <TouchableOpacity
            style={[styles.completeBtn, !isValid && styles.completeBtnDisabled]}
            onPress={handleComplete}
            disabled={!isValid}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isValid ? ['#FFFFFF', '#A8D0F0', '#6AB0E8'] : ['#CCCCCC', '#AAAAAA']}
              locations={[0, 0.4, 1]}
              style={styles.completeBtnGradient}
            >
              <Text style={styles.completeBtnText}>Complete & Start! </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Share Modal */}
        <Modal
          visible={showShareModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.shareCard}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.shareCardGradient}
              >
                <Text style={styles.shareCardEmoji}>🚿✨</Text>
                <Text style={styles.shareCardTitle}>朝シャワー完了！</Text>
                <Text style={styles.shareCardMood}>{savedSession?.feedback}</Text>
                <View style={styles.shareCardStats}>
                  <View style={styles.shareCardStat}>
                    <Text style={styles.shareCardStatNumber}>🔥 {streakData.currentStreak}</Text>
                    <Text style={styles.shareCardStatLabel}>連続日数</Text>
                  </View>
                  <View style={styles.shareCardStatDivider} />
                  <View style={styles.shareCardStat}>
                    <Text style={styles.shareCardStatNumber}>🏆 {streakData.bestStreak}</Text>
                    <Text style={styles.shareCardStatLabel}>最高記録</Text>
                  </View>
                </View>
                <Text style={styles.shareCardDate}>
                  {new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
                </Text>
              </LinearGradient>
              
              <View style={styles.shareButtonsContainer}>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={handleShare}
                >
                  <LinearGradient
                    colors={['#4A90D9', '#4A7FC1']}
                    style={styles.shareButtonGradient}
                  >
                    <Text style={styles.shareButtonText}>📤 シェアする</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.skipButtonText}>スキップ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  title: {
    fontSize: 28,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#4A7FC1',
  },
  label: {
    fontSize: 20,
    fontStyle: 'italic',
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 12,
    marginTop: 16,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  moodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#E8F4FC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B8D4E8',
    marginRight: 10,
    marginBottom: 10,
  },
  moodBtnSelected: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  moodText: {
    fontSize: 14,
    color: '#4A6FA5',
    fontWeight: '500',
  },
  moodTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#E8F4FC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3A5F8A',
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#2C3E50',
  },
  summary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D0E4F0',
    minHeight: 80,
  },
  emptyTaskText: {
    color: '#8BA4C4',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskCategoryBadge: {
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
  taskMemo: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 1,
  },
  completeBtnContainer: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 16,
  },
  completeBtn: {
    width: width * 0.7,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#7BB8E8',
    shadowColor: '#4A90D9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  completeBtnDisabled: {
    opacity: 0.6,
    borderColor: '#CCCCCC',
  },
  completeBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeBtnText: {
    fontSize: 18,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#2C3E50',
  },
  // Share Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  shareCard: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  shareCardGradient: {
    padding: 30,
    alignItems: 'center',
  },
  shareCardEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  shareCardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  shareCardMood: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  shareCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  shareCardStat: {
    alignItems: 'center',
    flex: 1,
  },
  shareCardStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  shareCardStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  shareCardStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  shareCardDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  shareButtonsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  shareButton: {
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 12,
  },
  shareButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 10,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#8BA4C4',
  },
});

export default FeedbackScreen;
