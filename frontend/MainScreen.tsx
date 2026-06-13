import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable, Modal, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

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
  '침대에게 승리': '(៸៸ > ᴗ < ៸៸)', 
  '침대와 협상 중': '( ᖛ ̫ ᖛ )', 
  '침대에게 패배': '(⩌﹏⩌)' 
};

const SERVER_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function MainScreen({ activeCategory, setActiveCategory, categoryConfig, setIsLoggedIn }: ScreenProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isConditionModalVisible, setConditionModalVisible] = useState(false);
  const [todayCondition, setTodayCondition] = useState<string | null>(null);

  const [streakCount, setStreakCount] = useState(0);
  const [shieldCount, setShieldCount] = useState(0);
  const [recommendedTasks, setRecommendedTasks] = useState<any[]>([]);
  const [todayCompletedCount, setTodayCompletedCount] = useState(0);
  const [weeklyAchievementRate, setWeeklyAchievementRate] = useState(0);

  const [isShieldAskModalVisible, setShieldAskModalVisible] = useState(false);
  const [isCouponModalVisible, setCouponModalVisible] = useState(false);

  const fetchStreakAndStats = async () => {
    try {
      const streakRes = await fetch(`${SERVER_URL}/users/streak?user_id=1`);
      if (streakRes.ok) {
        const sData = await streakRes.json();
        setStreakCount(sData.streak_count);
        setShieldCount(sData.shield_count);
      }

      const recRes = await fetch(`${SERVER_URL}/recommendations?user_id=1`);
      if (recRes.ok) {
        const rData = await recRes.json();
        setRecommendedTasks(rData || []);
      }

      const statRes = await fetch(`${SERVER_URL}/dashboard-stats?user_id=1`);
      if (statRes.ok) {
        const statData = await statRes.json();
        setTodayCompletedCount(statData.today_completed || 0);
        setWeeklyAchievementRate(statData.weekly_achievement || 0);
      }
    } catch (error) {
      console.error("대시보드 종합 최신화 실패:", error);
    }
  };

  const getTodayTaskComment = (count: number) => {
    if (count === 0) return "시작이 반이에요 🐢";
    if (count >= 1 && count < 3) return "산뜻한 첫 출발 ⛵";
    if (count >= 3 && count < 5) return "멋지게 순항 중 🌊";
    return "오늘도 하드캐리 👑";
  };

  const getWeeklyAchievementComment = (rate: number) => {
    if (rate <= 25) return "출항 준비 완료 ⚓";
    if (rate <= 50) return "힘차게 닻을 올려요 ⛵";
    if (rate <= 75) return "절반 이상 돌파 🌊";
    if (rate < 100) return "목적지가 눈앞에 🏝️";
    return "이번 주 완벽 만선 🐳";
  };

  useFocusEffect(
    useCallback(() => {
      const checkConditionPopup = async () => {
        try {
          const savedCondition = await AsyncStorage.getItem('conditionValue');
          if (!savedCondition) {
            setConditionModalVisible(true);
          } else {
            setTodayCondition(savedCondition);
          }
        } catch (error) {
          console.error(error);
        }
      };
      checkConditionPopup();
      fetchStreakAndStats();
    }, [activeCategory])
  );

  const handleConditionSelect = async (condition: string) => {
    try {
      const now = new Date();
      const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      await AsyncStorage.setItem('conditionDate', todayString);
      await AsyncStorage.setItem('conditionValue', condition);
      setTodayCondition(condition);
      setConditionModalVisible(false);

      await fetch(`${SERVER_URL}/users/condition`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, condition: condition })
      });
      await fetchStreakAndStats();
    } catch (error) {
      console.error(error);
    }
  };

  const handleShieldDecision = async (useShield: boolean) => {
    setShieldAskModalVisible(false);
    try {
      await fetch(`${SERVER_URL}/users/use-shield`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, use_shield: useShield })
      });
      await fetchStreakAndStats(); 
    } catch (error) {
      console.error(error);
    }
  };

  // 💡 [수정됨] 쿠폰 받기 버튼 클릭 시 방어권 즉각 +1
  const handleClaimCoupon = async () => {
    // 백엔드를 기다리지 않고 화면의 방어권 숫자부터 바로 올려버립니다!
    setShieldCount(prev => prev + 1);
    setCouponModalVisible(false);

    try {
      await fetch(`${SERVER_URL}/users/claim-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1 })
      });
      // 혹시 모를 오차를 위해 백엔드와 최종 동기화
      await fetchStreakAndStats();
    } catch (error) {
      console.error(error);
    }
  };

  // 💡 [수정됨] 할 일 완료 체크 시 스트릭 즉각 +1
  const handleCompleteTask = async (task: any) => {
    const newCompletedStatus = task.is_completed === 1 ? 0 : 1;
    const newStatusText = newCompletedStatus === 1 ? '완료' : '진행 전';
    
    // 화면의 체크박스를 즉시 바꿈
    setRecommendedTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: newCompletedStatus } : t));

    // 💡 [데모용 치트키] 체크하는 순간 백엔드 조건 무시하고 상단 스트릭 숫자를 무조건 즉시 올립니다!
    if (newCompletedStatus === 1) {
      setStreakCount(prev => prev + 1);
      setTodayCompletedCount(prev => prev + 1); // 2분할 위젯 "오늘 해치운 일"도 즉시 반영!
    } else {
      setStreakCount(prev => (prev > 0 ? prev - 1 : 0));
      setTodayCompletedCount(prev => (prev > 0 ? prev - 1 : 0));
    }

    try {
      await fetch(`${SERVER_URL}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 1, title: task.title, quadrant: task.quadrant, category: task.category,
          memo: task.memo, deadline_date: task.deadline_date, deadline_time: task.deadline_time,
          estimated_time_level: task.estimated_time_level, is_completed: newCompletedStatus === 1, status: newStatusText
        })
      });
      // DB 상태 최신화
      await fetchStreakAndStats();
    } catch (error) {
      console.error(error);
      // 에러 시 원상 복구
      setRecommendedTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: task.is_completed } : t));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsDropdownOpen(!isDropdownOpen)}>
          <Text style={styles.categoryText}>▼ 카테고리 분류: {activeCategory}</Text>
        </TouchableOpacity>
        {isDropdownOpen && (
          <View style={styles.dropdownMenu}>
            {(['개인', '학업', '성장'] as const).map(cat => (
              <Pressable key={cat} onPress={() => { setActiveCategory(cat); setIsDropdownOpen(false); }} style={styles.dropdownItem}>
                {({ pressed }) => ( <Text style={[styles.dropdownText, { color: pressed ? CAT_COLORS[cat] : '#1a0f00' }]}>{cat}</Text> )}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.pillowyCard, { backgroundColor: '#ffffff' }]}>
        <Text style={styles.cardSectionTitle}>TODAY'S CONDITION</Text>
        <View style={styles.conditionRow}>
          <Text style={styles.conditionStatus}>{todayCondition || '컨디션을 기록해 주세요!'}</Text>
          {todayCondition && <Text style={styles.conditionEmoji}>{CONDITION_EMOJIS[todayCondition as keyof typeof CONDITION_EMOJIS]}</Text>}
        </View>
      </View>

      <View style={[styles.pillowyCard, { backgroundColor: '#fff5f5' }]}>
        <View style={styles.streakHeader}>
          <Text style={styles.streakHeaderText}>STREAK</Text>
          <View style={styles.shieldGroup}>
             <Text style={styles.shieldText}>보유 방어권: </Text>
             {shieldCount > 0 ? (
               Array(shieldCount).fill(0).map((_, i) => <Text key={i} style={styles.shieldEmoji}>🛡️</Text>)
             ) : (
               <Text style={[styles.shieldText, { color: '#aaa', fontSize: 14 }]}>없음</Text>
             )}
          </View>
        </View>
        <View style={styles.streakRow}>
          <Text style={styles.streakFire}>🔥</Text>
          <Text style={styles.streakNumber}>{streakCount}회 연속 성공 중!</Text>
        </View>
      </View>

      <View style={styles.splitRow}>
        <View style={[styles.smallPillowyCard, { backgroundColor: '#fffbe6' }]}>
          <Text style={styles.smallCardLabel}>이번 주 달성률</Text>
          <Text style={styles.smallCardValue}>{weeklyAchievementRate}%</Text>
          <Text style={styles.smallCardSub}>{getWeeklyAchievementComment(weeklyAchievementRate)}</Text>
        </View>
        <View style={[styles.smallPillowyCard, { backgroundColor: '#f0f8ff' }]}>
          <Text style={styles.smallCardLabel}>오늘 해치운 일</Text>
          <Text style={styles.smallCardValue}>{todayCompletedCount}개</Text>
          <Text style={styles.smallCardSub}>{getTodayTaskComment(todayCompletedCount)}</Text>
        </View>
      </View>

      <View style={[styles.pillowyCard, { backgroundColor: '#ffffff' }]}>
        <Text style={styles.cardSectionTitle}>TODAY'S PICK</Text>
        <View style={styles.taskContainer}>
          {recommendedTasks.length > 0 ? (
            recommendedTasks.map((task, index) => (
              <View key={task.id} style={styles.taskItem}>
                <View style={[styles.rankBadge, { backgroundColor: '#f0f0f0' }]}><Text style={styles.rankText}>{index + 1}</Text></View>
                <Text style={[styles.taskTitle, task.is_completed === 1 && styles.completedText]}>{task.title}</Text>
                <TouchableOpacity onPress={() => handleCompleteTask(task)} style={styles.checkbox}>
                  <Text style={[styles.checkboxText, task.is_completed === 1 && styles.completedCheckboxText]}>{task.is_completed === 1 ? '☑' : '☐'}</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={{ fontFamily: 'Galmuri9', fontSize: 13, color: '#888', textAlign: 'center', marginTop: 10 }}>추천할 급한 일이 없네요! 푹 쉬세요 ☕</Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => setIsLoggedIn(false)}><Text style={styles.logoutText}>로그아웃</Text></TouchableOpacity>

      <Modal visible={isConditionModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.conditionModalBox}>
            <Text style={styles.conditionModalTitle}>오늘의 컨디션은 어떠신가요?</Text>
            <View style={styles.conditionBtnGroup}>
              {CONDITION_OPTIONS.map(cond => (
                <TouchableOpacity key={cond} style={styles.conditionBtn} onPress={() => handleConditionSelect(cond)}>
                  <Text style={[styles.conditionBtnText, { color: CONDITION_COLORS[cond] }]}>{cond}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isShieldAskModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.popupModalBox}>
            <Text style={styles.popupEmoji}>😿</Text>
            <Text style={styles.popupTitle}>앗... 연속 달성이 깨졌어요</Text>
            
            <Text style={styles.popupDesc}>
              어제 깜빡하고 추천 할 일을 놓치셨군요.{'\n'}
              조심스레 모아둔 방어권을 꺼내볼까요?{'\n'}
              아니면 쿨하게 다시 시작할까요?
            </Text>
            
            <View style={styles.popupBtnGroup}>
              <TouchableOpacity style={[styles.popupBtn, { backgroundColor: '#5a9aff' }]} onPress={() => handleShieldDecision(true)}>
                <Text style={styles.popupBtnText}>방어권 사용하기 (🛡️-1)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.popupBtn, { backgroundColor: '#ff5a5a', marginTop: 10 }]} onPress={() => handleShieldDecision(false)}>
                <Text style={styles.popupBtnText}>쿨하게 0회부터 다시 시작</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isCouponModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.popupModalBox}>
            <Text style={styles.popupEmoji}>😼</Text>
            <Text style={styles.popupTitle}>슬쩍 건네는 회생 방어권</Text>
            
            <Text style={styles.popupDesc}>
              방어권 없이 맨몸으로 항해하신 지 벌써 2주가 지났군요!{'\n'}
              몰래 방어권 1개를 찔러드립니다.{'\n'}
              다시 힘차게 닻을 올려볼까요?
            </Text>

            <View style={styles.popupBtnGroup}>
              <TouchableOpacity style={[styles.popupBtn, { backgroundColor: '#b5e7a0' }]} onPress={handleClaimCoupon}>
                <Text style={[styles.popupBtnText, { color: '#1a0f00' }]}>고맙게 받기 (🛡️+1)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  header: { marginBottom: 20, zIndex: 100 },
  categoryText: { fontFamily: 'Galmuri9', fontSize: 16, color: '#1a0f00' },
  dropdownMenu: { position: 'absolute', top: 30, left: 0, backgroundColor: '#fff', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 6, elevation: 5 },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 16 },
  dropdownText: { fontFamily: 'Galmuri9', fontSize: 14 },
  pillowyCard: { padding: 20, borderRadius: 24, marginBottom: 16 },
  cardSectionTitle: { fontFamily: 'Galmuri9', fontSize: 14, color: '#888', marginBottom: 12 },
  conditionRow: { flexDirection: 'row', alignItems: 'center' },
  conditionStatus: { fontFamily: 'Galmuri9', fontSize: 16, color: '#1a0f00', marginRight: 10 },
  conditionEmoji: { fontSize: 20 }, 
  streakHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  shieldGroup: { flexDirection: 'row', alignItems: 'center', marginTop: 2 }, 
  streakHeaderText: { fontFamily: 'Galmuri9', fontSize: 14, color: '#ff5a5a', includeFontPadding: false, marginTop: -2 },
  shieldText: { fontFamily: 'Galmuri9', fontSize: 14, color: '#ff5a5a', includeFontPadding: false },
  shieldEmoji: { fontSize: 14, marginLeft: 4, includeFontPadding: false },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  streakFire: { fontSize: 36, marginRight: 12 },
  streakNumber: { fontFamily: 'Galmuri9', fontSize: 18, color: '#1a0f00' },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  smallPillowyCard: { width: '48%', padding: 16, borderRadius: 24 },
  smallCardLabel: { fontFamily: 'Galmuri9', fontSize: 12, color: '#555', marginBottom: 8 },
  smallCardValue: { fontFamily: 'Galmuri9', fontSize: 18, color: '#1a0f00' }, 
  smallCardSub: { fontFamily: 'Galmuri9', fontSize: 11, color: '#666', marginTop: 6, lineHeight: 15 },
  taskContainer: { marginTop: 4 },
  taskItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fafafa', padding: 12, borderRadius: 16, marginBottom: 10 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankText: { fontFamily: 'Galmuri9', fontSize: 12, color: '#1a0f00', includeFontPadding: false, textAlign: 'center' },
  taskTitle: { flex: 1, fontFamily: 'Galmuri9', fontSize: 14, color: '#1a0f00' },
  checkbox: { paddingLeft: 10, paddingVertical: 4 },
  checkboxText: { fontFamily: 'Galmuri9', fontSize: 18, color: '#d0d0d0' },
  completedCheckboxText: { color: '#a0a0a0' }, 
  completedText: { color: '#a0a0a0', textDecorationLine: 'line-through' },
  logoutBtn: { padding: 20, alignItems: 'center', marginBottom: 20 },
  logoutText: { fontFamily: 'Galmuri9', fontSize: 14, color: '#a0a0a0', textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  conditionModalBox: { backgroundColor: '#2c2c2e', padding: 24, borderRadius: 24, width: '70%', alignItems: 'center' }, 
  conditionModalTitle: { fontFamily: 'Galmuri9', fontSize: 14, color: '#fff', marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  conditionBtnGroup: { flexDirection: 'column', gap: 20, width: '100%' }, 
  conditionBtn: { paddingVertical: 8, width: '100%', alignItems: 'center' },
  conditionBtnText: { fontFamily: 'Galmuri9', fontSize: 14, textDecorationLine: 'underline' },
  popupModalBox: { backgroundColor: '#2c2c2e', padding: 30, borderRadius: 24, width: '85%', alignItems: 'center' },
  popupEmoji: { fontFamily: 'TossFaceFontMac', fontSize: 64, marginBottom: 16, textAlign: 'center', includeFontPadding: false },
  popupTitle: { fontFamily: 'Galmuri9', fontSize: 16, color: '#fff', marginBottom: 12 },
  popupDesc: { fontFamily: 'Galmuri9', fontSize: 12, color: '#ccc', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  popupBtnGroup: { alignItems: 'center', width: '100%' },
  popupBtn: { width: 240, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  popupBtnText: { fontFamily: 'Galmuri9', fontSize: 13, color: '#fff' }
});