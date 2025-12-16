import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Keyboard,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, TodoItem } from '../types';

type TodoScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Todo'>;
type TodoScreenRouteProp = RouteProp<RootStackParamList, 'Todo'>;

interface Props {
  navigation: TodoScreenNavigationProp;
  route: TodoScreenRouteProp;
}

const { width } = Dimensions.get('window');
const CATEGORIES = ['勉強', '家事', '運動', '仕事', '開発', 'その他'];

const TodoScreen: React.FC<Props> = ({ navigation, route }) => {
  const { timestamp, duration } = route.params;
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [memo, setMemo] = useState('');
  const [todos, setTodos] = useState<TodoItem[]>([]);

  const handleCancel = () => {
    navigation.popToTop();
  };

  const handleAddTodo = () => {
    if (!selectedCategory) return;
    setTodos([...todos, { category: selectedCategory, memo: memo.trim() }]);
    setSelectedCategory('');
    setMemo('');
    Keyboard.dismiss();
  };

  const handleRemoveTodo = (index: number) => {
    setTodos(todos.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    navigation.navigate('Feedback', { timestamp, todos, duration });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient
        colors={['#FFFFFF', '#EFF8FE', '#D6EAF8']}
        locations={[0, 0.6, 1]}
        style={styles.container}
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
        <Text style={styles.title}>Todo</Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryBtn,
              selectedCategory === cat && styles.categoryBtnSelected,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat && styles.categoryTextSelected,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Detail */}
      <Text style={styles.label}>Detail</Text>
      <TextInput
        style={styles.input}
        placeholder="詳細を入力"
        placeholderTextColor="#8BA4C4"
        value={memo}
        onChangeText={setMemo}
        multiline
      />

      {/* Add Button */}
      <View style={styles.addBtnContainer}>
        <TouchableOpacity
          style={[styles.addBtn, !selectedCategory && styles.addBtnDisabled]}
          onPress={handleAddTodo}
          disabled={!selectedCategory}
        >
          <LinearGradient
            colors={selectedCategory ? ['#FFFFFF', '#A8D0F0', '#7BB8E8'] : ['#CCCCCC', '#AAAAAA']}
            locations={[0, 0.5, 1]}
            style={styles.addBtnGradient}
          >
            <Text style={styles.addBtnText}>追加</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* List */}
      <Text style={styles.label}>List</Text>
      <View style={styles.listSection}>
        <FlatList
          data={todos}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item, index }) => (
            <View style={styles.todoItem}>
              <Text style={styles.todoText}>
                {item.category}: {item.memo || '(メモなし)'}
              </Text>
              <TouchableOpacity onPress={() => handleRemoveTodo(index)}>
                <Text style={styles.removeBtn}>×</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>タスクなし</Text>
          }
        />
      </View>

      {/* Go To Feedback Button */}
      <View style={styles.nextBtnContainer}>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FFFFFF', '#A8D0F0', '#6AB0E8']}
            locations={[0, 0.4, 1]}
            style={styles.nextBtnGradient}
          >
            <Text style={styles.nextBtnText}>Go To Feedback</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryBtn: {
    width: (width - 60) / 3,
    paddingVertical: 12,
    backgroundColor: '#E8F4FC',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#B8D4E8',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBtnSelected: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  categoryText: {
    fontSize: 14,
    color: '#4A6FA5',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#E8F4FC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3A5F8A',
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    color: '#2C3E50',
  },
  addBtnContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  addBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#A0C4E8',
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnGradient: {
    paddingVertical: 10,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
  listSection: {
    flex: 1,
    marginTop: 8,
  },
  todoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D0E4F0',
  },
  todoText: {
    fontSize: 14,
    flex: 1,
    color: '#2C3E50',
  },
  removeBtn: {
    fontSize: 20,
    color: '#FF6B6B',
    paddingLeft: 12,
  },
  emptyText: {
    color: '#8BA4C4',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  nextBtnContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 16,
  },
  nextBtn: {
    width: width * 0.6,
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
  nextBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 18,
    fontStyle: 'italic',
    fontWeight: '500',
    color: '#2C3E50',
  },
});

export default TodoScreen;
