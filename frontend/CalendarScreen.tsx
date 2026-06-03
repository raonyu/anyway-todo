import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const SERVER_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

interface Task {
  id: number;
  title: string;
  memo: string;
  deadlineDate: string;
  deadlineTime: string;
  quadrant: '당장 해' | '그래도 해' | '해치워' | '나중에 해';
  delayCount: number;
  isCompleted: boolean;
}

export default function CalendarScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const todayObj = new Date();

  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); 
  const [editTaskId, setEditTaskId] = useState<number | null>(null);

  const [currentQuadrant, setCurrentQuadrant] = useState<'당장 해' | '그래도 해' | '해치워' | '나중에 해'>('당장 해');
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  
  const [isDeadlineVisible, setDeadlineVisible] = useState(false);
  const [hasDate, setHasDate] = useState(false);
  const [hasTime, setHasTime] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [tempDelayCount, setTempDelayCount] = useState(0);

  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');

  // DB에서 할 일 목록 가져오기
  const fetchTasks = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/tasks?user_id=1`);
      if (response.ok) {
        const data = await response.json();
        const formattedData = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          memo: item.memo || '',
          deadlineDate: item.deadline_date || '',
          deadlineTime: item.deadline_time || '',
          quadrant: item.quadrant,
          delayCount: item.delay_count,
          isCompleted: item.is_completed === 1
        }));
        setTasks(formattedData);
      }
    } catch (error) {
      console.error("데이터 불러오기 실패:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [])
  );

  const getDaysInMonth = () => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const days = Array(firstDay).fill(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const changeMonth = (offset: number) => {
    let newMonth = currentMonth + offset;
    let newYear = currentYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    else if (newMonth < 1) { newMonth = 12; newYear--; }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const getHighlighterColor = (quadrant: string) => {
    switch (quadrant) {
      case '당장 해': return 'rgba(255, 90, 90, 0.3)';
      case '그래도 해': return 'rgba(255, 179, 27, 0.3)';
      case '해치워': return 'rgba(90, 154, 255, 0.3)';
      default: return 'transparent';
    }
  };

  const handleTaskClick = (task: Task) => {
    setIsEditMode(true);
    setEditTaskId(task.id);
    setCurrentQuadrant(task.quadrant);
    setTitle(task.title); setMemo(task.memo); 
    setDeadlineDate(task.deadlineDate); setDeadlineTime(task.deadlineTime);
    setHasDate(!!task.deadlineDate); setHasTime(!!task.deadlineTime);
    setTempDelayCount(task.delayCount || 0); 
    
    if (task.deadlineTime) {
      const [h, m] = task.deadlineTime.split(':');
      if (h && m) { setSelectedHour(h); setSelectedMinute(m); }
    }
    setAddModalVisible(true);
    setDeadlineVisible(false);
  };

  const saveTask = async () => {
    if (!title.trim()) return;
    const finalDate = hasDate ? deadlineDate : '';
    const finalTime = hasTime ? deadlineTime : '';

    try {
      if (isEditMode && editTaskId) {
        await fetch(`${SERVER_URL}/tasks/${editTaskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title, memo, deadline_date: finalDate, deadline_time: finalTime, 
            quadrant: currentQuadrant, delay_count: tempDelayCount, is_completed: false
          })
        });
      }
      setAddModalVisible(false);
      fetchTasks();
    } catch (error) {
      console.error("태스크 저장 실패:", error);
    }
  };

  const deleteTask = async () => {
    if (!editTaskId) return;
    try {
      await fetch(`${SERVER_URL}/tasks/${editTaskId}`, { method: 'DELETE' });
      setAddModalVisible(false);
      fetchTasks();
    } catch (error) {
      console.error("태스크 삭제 실패:", error);
    }
  };

  const handlePostpone = () => {
    let targetDate = new Date(); 
    if (hasDate && deadlineDate) {
      const parts = deadlineDate.match(/(\d+)\.\s*(\d+)\.\s*(\d+)\./);
      if (parts) targetDate = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]));
    }
    targetDate.setDate(targetDate.getDate() + 1); 
    setDeadlineDate(`${targetDate.getFullYear()}. ${targetDate.getMonth() + 1}. ${targetDate.getDate()}.`);
    setHasDate(true);
    setTempDelayCount(prev => prev + 1); 
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.header}>
        <Text style={styles.monthText}>{currentYear}년 {currentMonth}월 ⁺. ⊹˚₊ ₊·‧*</Text>
        <View style={styles.arrowGroup}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
            <Text style={styles.arrowText}>{'<'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
            <Text style={styles.arrowText}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.calendarBoard}>
        <View style={styles.weekRow}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <View key={idx} style={styles.weekCell}>
              <Text style={[styles.weekText, idx === 0 && { color: '#ff5a5a' }, idx === 6 && { color: '#5a9aff' }]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView style={styles.daysGridContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.daysGrid}>
            {getDaysInMonth().map((day, index) => {
              const isToday = day === todayObj.getDate() && currentMonth === (todayObj.getMonth() + 1) && currentYear === todayObj.getFullYear();
              const cellDateStr = day ? `${currentYear}. ${currentMonth}. ${day}.` : '';
              
              const dayTasks = tasks.filter(t => t.deadlineDate === cellDateStr && t.quadrant !== '나중에 해');

              return (
                <View key={index} style={styles.dayCell}>
                  {day ? (
                    <View style={styles.dayCellInner}>
                      <View style={[styles.dateNumberWrapper, isToday && styles.todayCircle]}>
                        <Text style={[styles.dayText, isToday && styles.todayText]}>{day}</Text>
                      </View>
                      
                      <View style={styles.cellTasksWrapper}>
                        {dayTasks.map(task => (
                          <TouchableOpacity 
                            key={task.id} 
                            activeOpacity={0.8}
                            onPress={() => handleTaskClick(task)}
                            style={[
                              styles.taskBadge, 
                              { backgroundColor: task.isCompleted ? 'transparent' : getHighlighterColor(task.quadrant) }
                            ]}
                          >
                            <Text 
                              numberOfLines={1} 
                              style={[
                                styles.taskBadgeText, 
                                task.isCompleted && styles.completedTaskBadgeText 
                              ]}
                            >
                              {task.title}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ) : <View style={styles.dayCellInner} />}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* --- 모달 영역 --- */}
      <Modal visible={isAddModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoidView}>
              <View style={styles.bottomSheet}>
                
                <View style={styles.sheetHeader}>
                  {(['당장 해', '그래도 해', '해치워', '나중에 해'] as const).map(q => (
                    <TouchableOpacity key={q} onPress={() => setCurrentQuadrant(q)}>
                      <Text style={[styles.qTab, currentQuadrant === q && styles.qTabActive]}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <TextInput 
                  style={styles.inputTitle} placeholder="제목" placeholderTextColor="#666"
                  value={title} onChangeText={setTitle} autoFocus
                />
                <TextInput 
                  style={styles.inputMemo} placeholder="메모" placeholderTextColor="#666"
                  value={memo} onChangeText={setMemo}
                />

                {(hasDate || hasTime) && currentQuadrant !== '나중에 해' ? (
                  <Text style={styles.dateDisplay}>
                    마감: {hasDate ? deadlineDate : ''} {hasTime ? deadlineTime : ''} 
                    {tempDelayCount > 0 && <Text style={{color: '#ff5a5a'}}> ({tempDelayCount}번 미룸)</Text>}
                  </Text>
                ) : null}

                <View style={styles.toolbar}>
                  <View style={styles.iconGroup}>
                    {currentQuadrant !== '나중에 해' && (
                      <>
                        <TouchableOpacity style={[styles.iconBtn, { marginLeft: -4 }]} onPress={() => { Keyboard.dismiss(); setDeadlineVisible(true); }}>
                          <Text style={styles.iconText}>📅</Text>
                        </TouchableOpacity>
                        {isEditMode && (
                          <TouchableOpacity style={[styles.postponeBtn, { marginLeft: 10 }]} onPress={handlePostpone}>
                            <Text style={styles.postponeText}>내일로 미루기</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>
                  <View style={styles.actionGroup}>
                    {isEditMode && (
                      <TouchableOpacity style={styles.actionBtnDel} onPress={deleteTask}>
                        <Text style={styles.actionBtnText}>삭제</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.actionBtnSave, { marginLeft: isEditMode ? 10 : 0 }]} onPress={saveTask}>
                      <Text style={[styles.actionBtnText, { color: '#fff' }]}>{isEditMode ? '저장' : '추가'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

              </View>
            </KeyboardAvoidingView>

            {isDeadlineVisible && (
              <View style={[StyleSheet.absoluteFill, styles.modalOverlayCenter]}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={styles.deadlineSettingsBox}>
                    <View style={styles.deadlineSettingsHeader}>
                      <Text style={styles.deadlineSettingsTitle}>마감일 설정</Text>
                    </View>
                    <View style={styles.toggleRow}>
                      <View style={styles.toggleTextGroup}>
                        <Text style={styles.toggleLabel}>날짜</Text>
                        {hasDate && <Text style={styles.toggleValue}>{deadlineDate}</Text>}
                      </View>
                      <Switch 
                        trackColor={{ false: "#767577", true: "#ffb31b" }} thumbColor={"#f4f3f4"} value={hasDate} 
                        onValueChange={(val) => {
                          setHasDate(val);
                          if (val && !deadlineDate) setDeadlineDate(`${currentYear}. ${currentMonth}. ${new Date().getDate()}.`);
                        }} 
                      />
                    </View>
                    <View style={styles.toggleRow}>
                      <View style={styles.toggleTextGroup}>
                        <Text style={styles.toggleLabel}>시간</Text>
                        {hasTime && <Text style={styles.toggleValue}>{deadlineTime}</Text>}
                      </View>
                      <Switch 
                        trackColor={{ false: "#767577", true: "#ffb31b" }} thumbColor={"#f4f3f4"} value={hasTime} 
                        onValueChange={(val) => {
                          setHasTime(val);
                          if (val && !deadlineTime) setDeadlineTime('12:00');
                        }} 
                      />
                    </View>
                    <TouchableOpacity style={styles.pixelConfirmBtn} onPress={() => setDeadlineVisible(false)}>
                      <Text style={styles.pixelConfirmText}>확인</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            )}

          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, paddingTop: 10 },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 10,
    paddingBottom: 15, 
  },
  // 💡 1. 폰트 사이즈를 18에서 16으로 더 아담하게 수정
  monthText: { 
    fontFamily: 'Galmuri9', 
    fontSize: 16, 
    color: '#1a0f00', 
  },
  arrowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  arrowBtn: { 
    padding: 5,
  },
  arrowText: { 
    fontFamily: 'Galmuri9', 
    fontSize: 22, 
    color: '#888',
  },

  calendarBoard: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingBottom: 10,
  },
  
  weekRow: { 
    flexDirection: 'row', 
    backgroundColor: 'transparent',
    paddingVertical: 10,
  },
  weekCell: { 
    flex: 1, 
    alignItems: 'center', 
  },
  weekText: { 
    fontFamily: 'Galmuri9', 
    fontSize: 12, 
    color: '#333',
  },
  
  daysGridContainer: { flex: 1, paddingTop: 10 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  
  dayCell: { 
    width: '14.28%', 
    minHeight: 85, 
  },
  dayCellInner: { flex: 1, paddingHorizontal: 2 },
  
  dateNumberWrapper: {
    width: 28, 
    height: 28,
    borderRadius: 14,
    display: 'flex',
    justifyContent: 'center', 
    alignItems: 'center',     
    alignSelf: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  // 💡 2. 오늘 날짜 동구라미 색상을 마감 텍스트와 동일한 세련된 파란색(#5a9aff)으로 교체!
  todayCircle: {
    backgroundColor: '#5a9aff', 
  },
  dayText: { 
    fontFamily: 'Galmuri9', 
    fontSize: 13, 
    color: '#444',
    textAlign: 'center',
    textAlignVertical: 'center', 
    includeFontPadding: false,   
    width: '100%',
    lineHeight: Platform.OS === 'ios' ? undefined : 28, 
  },
  todayText: { 
    color: '#fff',
  },

  cellTasksWrapper: { flex: 1 },
  
  taskBadge: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskBadgeText: {
    fontFamily: 'Galmuri9',
    fontSize: 9, 
    color: '#333',
  },
  completedTaskBadgeText: {
    color: '#a0a0a0',
    textDecorationLine: 'line-through',
  },

  /* --- 모달 스타일 --- */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  keyboardAvoidView: { width: '100%' },
  bottomSheet: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  qTab: { fontFamily: 'Galmuri9', fontSize: 12, color: '#666', padding: 5 },
  qTabActive: { color: '#ffb31b', textDecorationLine: 'underline' },
  closeBtn: { fontFamily: 'Galmuri9', fontSize: 16, color: '#fff' },
  
  inputTitle: { fontFamily: 'Galmuri9', fontSize: 18, color: '#fff', borderBottomWidth: 1, borderColor: '#333', paddingVertical: 10, paddingHorizontal: 0, paddingLeft: 0, margin: 0, marginBottom: 10 },
  inputMemo: { fontFamily: 'Galmuri9', fontSize: 14, color: '#fff', paddingVertical: 10, paddingHorizontal: 0, paddingLeft: 0, margin: 0, minHeight: 40 },
  dateDisplay: { fontFamily: 'Galmuri9', fontSize: 12, color: '#5a9aff', marginTop: 10, paddingHorizontal: 0, paddingLeft: 0, margin: 0 },
  
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  iconGroup: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { height: 40, paddingHorizontal: 15, backgroundColor: '#333', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontFamily: 'Galmuri9', fontSize: 14 }, 
  postponeBtn: { height: 40, paddingHorizontal: 15, backgroundColor: '#333', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  postponeText: { fontFamily: 'Galmuri9', fontSize: 14, color: '#fff' }, 
  actionGroup: { flexDirection: 'row' },
  actionBtnDel: { height: 40, paddingHorizontal: 20, backgroundColor: '#ff5a5a', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  actionBtnSave: { height: 40, paddingHorizontal: 20, backgroundColor: '#ffb31b', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontFamily: 'Galmuri9', fontSize: 14 },

  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  deadlineSettingsBox: { backgroundColor: '#2c2c2e', width: '85%', borderRadius: 16, padding: 20 },
  deadlineSettingsHeader: { alignItems: 'center', marginBottom: 20 },
  deadlineSettingsTitle: { fontFamily: 'Galmuri9', fontSize: 16, color: '#fff' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#3a3a3c', padding: 15, borderRadius: 12, marginBottom: 10 },
  toggleTextGroup: { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { fontFamily: 'Galmuri9', fontSize: 14, color: '#fff', marginRight: 15 },
  toggleValue: { fontFamily: 'Galmuri9', fontSize: 14, color: '#ffb31b' },
  pixelConfirmBtn: { alignSelf: 'center', marginTop: 15, padding: 10 },
  pixelConfirmText: { fontFamily: 'Galmuri9', fontSize: 16, color: '#fff', textDecorationLine: 'underline' }
});