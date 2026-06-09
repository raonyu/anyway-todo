import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable, Modal, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ScreenProps {
  activeCategory: '개인' | '학업' | '성장';
  setActiveCategory: (cat: '개인' | '학업' | '성장') => void;
  categoryConfig: { colors: string[]; activeColor: string; };
  navigation: any;
  route: any;
  setIsLoggedIn: (status: boolean) => void;
}

const CAT_COLORS = { '개인': '#ffb31b', '학업': '#b5e7a0', '성장': '#cda8e4' };

const CONDITION_OPTIONS = ['침대에게 승리', '침대와 협상 중', '침대에게 패배'] as const;
const CONDITION_COLORS = { '침대에게 승리': '#5a9aff', '침대와 협상 중': '#ffb31b', '침대에게 패배': '#ff5a5a' };
const CONDITION_EMOJIS = { 
  '침대에게 승리': 'ദ്ദി(៸៸ > ᴗ < ៸៸)', 
  '침대와 협상 중': '( ᖛ ̫ ᖛ )', 
  '침대에게 패배': '( ⩌﹏⩌)' 
};

const SERVER_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function MainScreen({ activeCategory, setActiveCategory, categoryConfig, setIsLoggedIn }: ScreenProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isConditionModalVisible, setConditionModalVisible] = useState(false);
  const [todayCondition, setTodayCondition] = useState<string | null>(null);

  useEffect(() => {
    const checkCondition = async () => {
      try {
        const now = new Date();
        const todayString = now.toISOString().split('T')[0];
        const currentHour = now.getHours();

        const savedDate = await AsyncStorage.getItem('conditionDate');
        const savedCondition = await AsyncStorage.getItem('conditionValue');

        if (savedDate === todayString && savedCondition) {
          setTodayCondition(savedCondition);
        } else if (currentHour >= 7) {
          setConditionModalVisible(true);
        }
      } catch (error) {
        console.error("컨디션 확인 에러:", error);
      }
    };
    checkCondition();
  }, []);

  const handleConditionSelect = async (condition: string) => {
    try {
      const now = new Date();
      const todayString = now.toISOString().split('T')[0];

      await AsyncStorage.setItem('conditionDate', todayString);
      await AsyncStorage.setItem('conditionValue', condition);
      
      setTodayCondition(condition);
      setConditionModalVisible(false);

      await fetch(`${SERVER_URL}/users/condition`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 1,
          condition: condition
        })
      });

    } catch (error) {
      console.error("컨디션 저장 에러:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      setIsLoggedIn(false);
    } catch (error) {
      console.error("로그아웃 에러:", error);
    }
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsDropdownOpen(!isDropdownOpen)}>
          <Text style={styles.categoryText}>
            ▼ 카테고리 분류: {activeCategory}
          </Text>
        </TouchableOpacity>
        
        {isDropdownOpen && (
          <View style={styles.dropdownMenu}>
            {(['개인', '학업', '성장'] as const).map(cat => (
              <Pressable 
                key={cat} 
                onPress={() => { setActiveCategory(cat); setIsDropdownOpen(false); }}
                style={styles.dropdownItem}
              >
                {({ pressed }) => (
                  <Text style={[styles.dropdownText, { color: pressed ? CAT_COLORS[cat] : '#1a0f00' }]}>
                    {cat}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.contentArea}>
        {todayCondition ? (
          <Text style={styles.conditionText}>
            오늘의 컨디션: {todayCondition} {CONDITION_EMOJIS[todayCondition as keyof typeof CONDITION_EMOJIS]}
          </Text>
        ) : (
          <Text style={styles.conditionText}>컨디션을 기록해 주세요!</Text>
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      <Modal visible={isConditionModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.conditionModalBox}>
            <Text style={styles.conditionModalTitle}>오늘의 컨디션은 어떠신가요?</Text>
            <View style={styles.conditionBtnGroup}>
              {CONDITION_OPTIONS.map(cond => (
                <TouchableOpacity 
                  key={cond} 
                  style={styles.conditionBtn}
                  onPress={() => handleConditionSelect(cond)}
                >
                  <Text style={[styles.conditionBtnText, { color: CONDITION_COLORS[cond] }]}>
                    {cond}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 15, zIndex: 10 },
  categoryText: { fontFamily: 'Galmuri9', fontSize: 16, color: '#1a0f00' },
  dropdownMenu: { position: 'absolute', top: 30, left: 10, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 5, alignItems: 'center' },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 15 },
  dropdownText: { fontFamily: 'Galmuri9', fontSize: 14 },

  contentArea: { 
    flex: 1, 
    justifyContent: 'flex-start', 
    alignItems: 'flex-start', 
    paddingHorizontal: 10,
    paddingTop: 15, 
    zIndex: 1 
  },
  conditionText: { 
    fontFamily: 'Galmuri9', 
    fontSize: 16, 
    color: '#1a0f00', 
    textAlign: 'left' 
  },
  
  logoutBtn: { padding: 20, alignItems: 'center', marginBottom: 20 },
  logoutText: { fontFamily: 'Galmuri9', fontSize: 14, color: '#a0a0a0', textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  conditionModalBox: { backgroundColor: '#2c2c2e', padding: 25, borderRadius: 16, width: '70%', alignItems: 'center' },
  conditionModalTitle: { fontFamily: 'Galmuri9', fontSize: 14, color: '#fff', marginBottom: 25, textAlign: 'center', lineHeight: 20 },
  conditionBtnGroup: { flexDirection: 'column', gap: 20, width: '100%' }, 
  conditionBtn: { paddingVertical: 8, width: '100%', alignItems: 'center' },
  conditionBtnText: { fontFamily: 'Galmuri9', fontSize: 15, textDecorationLine: 'underline' }
});