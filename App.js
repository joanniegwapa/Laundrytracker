import React, { useState } from 'react';
import { 
  SafeAreaView, 
  StatusBar, 
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@laundry_items';

// Main App Component
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [laundryList, setLaundryList] = useState([]);
  const [type, setType] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load laundry
  const loadLaundry = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setLaundryList(JSON.parse(data));
      } else {
        // Add sample data
        const sample = [{
          id: Date.now().toString(),
          type: 'Dark Clothes',
          notes: 'Wash cold',
          createdAt: Date.now() - 3600000,
          completed: false,
          timeRemaining: 3600,
        }];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
        setLaundryList(sample);
        startTimer(sample[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Add laundry
  const addLaundry = async () => {
    if (!type.trim()) {
      Alert.alert('Error', 'Please enter laundry type');
      return;
    }

    setLoading(true);
    try {
      const newItem = {
        id: Date.now().toString(),
        type: type.trim(),
        notes: notes.trim(),
        createdAt: Date.now(),
        completed: false,
        timeRemaining: 3600,
      };
      const updated = [newItem, ...laundryList];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setLaundryList(updated);
      startTimer(newItem.id);
      setType('');
      setNotes('');
      setCurrentScreen('home');
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  // Timer
  const startTimer = (id) => {
    const interval = setInterval(() => {
      setLaundryList(current => {
        const updated = current.map(item => {
          if (item.id === id && !item.completed) {
            const newTime = Math.max(0, item.timeRemaining - 1);
            return { ...item, timeRemaining: newTime };
          }
          return item;
        });
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }, 1000);
  };

  // Complete laundry
  const completeLaundry = async (id) => {
    try {
      const updated = laundryList.map(item =>
        item.id === id ? { ...item, completed: true, timeRemaining: 0 } : item
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setLaundryList(updated);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Delete laundry
  const deleteLaundry = async (id) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = laundryList.filter(item => item.id !== id);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            setLaundryList(updated);
          } catch (error) {
            console.error('Error:', error);
          }
        }
      }
    ]);
  };

  // Laundry Card Component
  const LaundryCard = ({ item }) => {
    const [timeDisplay, setTimeDisplay] = useState('');

    React.useEffect(() => {
      const updateTimer = () => {
        if (!item.completed && item.timeRemaining > 0) {
          const mins = Math.floor(item.timeRemaining / 60);
          const secs = item.timeRemaining % 60;
          setTimeDisplay(`${mins}m ${secs}s`);
        } else if (item.completed) {
          setTimeDisplay('Done! 🎉');
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }, [item.timeRemaining, item.completed]);

    const getStatusColor = () => {
      if (item.completed) return '#4CAF50';
      if (item.timeRemaining <= 300) return '#f44336';
      if (item.timeRemaining <= 600) return '#FFA726';
      return '#4A90D9';
    };

    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
      <View style={[styles.card, item.completed && styles.completedCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            <Text style={styles.type}>{item.type}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>
                {item.completed ? 'Done!' : 'In Progress'}
              </Text>
            </View>
          </View>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>

        {item.notes ? <Text style={styles.notes}>📝 {item.notes}</Text> : null}

        {!item.completed && (
          <View style={styles.timerContainer}>
            <Ionicons name="timer-outline" size={20} color={getStatusColor()} />
            <Text style={[styles.timerText, { color: getStatusColor() }]}>
              {timeDisplay}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          {!item.completed && (
            <TouchableOpacity style={styles.completeButton} onPress={() => completeLaundry(item.id)}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.completeText}>Done</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.deleteButton} onPress={() => deleteLaundry(item.id)}>
            <Ionicons name="trash-outline" size={24} color="#f44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Home Screen
  const HomeScreen = () => (
    <View style={styles.container}>
      <FlatList
        data={laundryList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LaundryCard item={item} />}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await loadLaundry();
          setRefreshing(false);
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shirt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No laundry yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => setCurrentScreen('add')}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Add Screen
  const AddScreen = () => (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('home')}>
          <Ionicons name="arrow-back" size={24} color="#4A90D9" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>What are you washing? *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Dark clothes, Towels"
            value={type}
            onChangeText={setType}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any special instructions"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="timer-outline" size={24} color="#4A90D9" />
          <Text style={styles.infoText}>Your laundry will be ready in 1 hour</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={addLaundry}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Start Laundry 🧺'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Load laundry on start
  React.useEffect(() => {
    loadLaundry();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧺 Laundry Tracker</Text>
      </View>
      {currentScreen === 'home' ? <HomeScreen /> : <AddScreen />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#4A90D9',
  },
  header: {
    backgroundColor: '#4A90D9',
    padding: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#4A90D9',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
  // Card styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  completedCard: {
    opacity: 0.7,
    backgroundColor: '#f0f8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  typeContainer: {
    flex: 1,
    marginRight: 8,
  },
  type: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  time: {
    fontSize: 14,
    color: '#999',
  },
  notes: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 4,
  },
  completeText: {
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
  },
  // Add screen styles
  form: {
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: '#4A90D9',
    marginLeft: 8,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#4A90D9',
    marginLeft: 12,
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#4A90D9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});