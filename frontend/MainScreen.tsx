import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 💡 자동로그인용 추가

interface ScreenProps {
  activeCategory: '개인' | '학업' | '성장';
  setActiveCategory: (cat: '개인' | '학업' | '성장') => void;
  categoryConfig: { colors: string[]; activeColor: string; };
  navigation: any;
  route: any;
  setIsLoggedIn: (status: boolean) => void; // 💡 로그아웃 처리를 위해 App.tsx에서 받아올 함수
}

const CAT_COLORS = { '개인': '#ffb31b', '학업': '#b5e7a0', '성장': '#cda8e4' };

export default function MainScreen({ activeCategory, setActiveCategory, categoryConfig, setIsLoggedIn }: ScreenProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 💡 로그아웃 실행 함수
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken'); // 1. 저장된 로그인 징표 삭제
      setIsLoggedIn(false); // 2. App.tsx의 상태를 false로 바꿔 로그인 화면으로 쫓아냄(?)
    } catch (error) {
      console.error("로그아웃 에러:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsDropdownOpen(!isDropdownOpen)}>
          <Text style={styles.monthText}>
            ▼ 카테고리 분류 : {activeCategory}
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
                  <Text style={[
                    styles.dropdownText, 
                    { color: pressed ? CAT_COLORS[cat] : '#1a0f00' }
                  ]}>
                    {cat}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.placeholderText}>{activeCategory} 모드 활성화 중</Text>
      </View>

      {/* 💡 하단 정중앙 로그아웃 버튼 */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, paddingTop: 20 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingBottom: 15,
    zIndex: 10 
  },
  monthText: { fontFamily: 'Galmuri9', fontSize: 16, color: '#1a0f00' },
  dropdownMenu: { 
    position: 'absolute',
    top: 30, 
    left: 10, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    paddingVertical: 5, 
    paddingHorizontal: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    elevation: 5, 
    alignItems: 'center' 
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 15 },
  dropdownText: { fontFamily: 'Galmuri9', fontSize: 14 },
  
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontFamily: 'Galmuri9', fontSize: 14, color: '#888' },

  // 💡 로그아웃 버튼 스타일 추가
  logoutBtn: { 
    padding: 20, 
    alignItems: 'center',
    marginBottom: 20 // 하단 탭바와의 간격
  },
  logoutText: { 
    fontFamily: 'Galmuri9', 
    fontSize: 13, 
    color: '#a0a0a0', 
    textDecorationLine: 'underline' 
  }
});