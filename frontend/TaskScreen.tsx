import React, { useState, useEffect } from 'react';
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

export default function TaskScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  
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

  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const d = today.getDate();
    
    setTasks([
      { id: 1, title: '병원 예약', memo: '치과 스케일링', deadlineDate: `${y}. ${m}. ${d}.`, deadlineTime: '14:00', quadrant: '당장 해', delayCount: 0, isCompleted: false },
      { id: 2, title: '테니스 레슨', memo: '', deadlineDate: `${y}. ${m}. ${d + 2}.`, deadlineTime: '19:00', quadrant: '그래도 해', delayCount: 0, isCompleted: true },
      { id: 3, title: '구독 목록 업데이트', memo: '넷플릭스 해지', deadlineDate: `${y}. ${m}. ${d + 1}.`, deadlineTime: '', quadrant: '해치워', delayCount: 0, isCompleted: false },
      { id: 4, title: '책 색깔별로 재정렬', memo: '', deadlineDate: '2026. 12. 31.', deadlineTime: '', quadrant: '나중에 해', delayCount: 0, isCompleted: false },
    ]);
  }, []);

  useEffect(() => {
    if (hasTime) setDeadlineTime(`${selectedHour}:${selectedMinute}`);
  }, [selectedHour, selectedMinute, hasTime]);

  const isUrgent = (dateStr: string, isCompleted: boolean) => {
    if (isCompleted || !dateStr) return false;
    const parts = dateStr.match(/(\d+)\.\s*(\d+)\.\s*(\d+)\./);
    if (parts) {
      const deadline = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]));
      const todayObj = new Date();
      const today = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
      const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    }
    return false;
  };

  const getFormattedDeadline = (dateStr: string, timeStr: string) => {
    if (!dateStr && !timeStr) return '';
    let resultDate = '';

    if (dateStr) {
      const parts = dateStr.match(/(\d+)\.\s*(\d+)\.\s*(\d+)\./);
      if (parts) {
        const y = parseInt(parts[1], 10);
        const m = parseInt(parts[2], 10);
        const d = parseInt(parts[3], 10);
        const dateObj = new Date(y, m - 1, d);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayOfWeek = days[dateObj.getDay()];

        const currentY = new Date().getFullYear();
        const padM = m.toString().padStart(2, '0');
        const padD = d.toString().padStart(2, '0');

        if (y === currentY) {
          resultDate = `${padM}.${padD}.(${dayOfWeek})`;
        } else {
          resultDate = `${y}.${padM}.${padD}.(${dayOfWeek})`;
        }
      } else {
        resultDate = dateStr;
      }
    }
    const resultTime = timeStr ? ` ${timeStr}` : '';
    const prefix = resultDate || resultTime ? '~ ' : '';
    return `${prefix}${resultDate}${resultTime}`;
  };

  const openAddModal = (quadrant: '당장 해' | '그래도 해' | '해치워' | '나중에 해') => {
    setIsEditMode(false);
    setCurrentQuadrant(quadrant);
    setTitle(''); setMemo(''); setDeadlineDate(''); setDeadlineTime('');
    setHasDate(false); setHasTime(false);
    
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);

    setAddModalVisible(true);
    setDeadlineVisible(false);
  };

  const openEditModal = (task: Task) => {
    setIsEditMode(true);
    setEditTaskId(task.id);
    setCurrentQuadrant(task.quadrant);
    setTitle(task.title); setMemo(task.memo); 
    setDeadlineDate(task.deadlineDate); setDeadlineTime(task.deadlineTime);
    setHasDate(!!task.deadlineDate); setHasTime(!!task.deadlineTime);
    
    if (task.deadlineTime) {
      const [h, m] = task.deadlineTime.split(':');
      if (h && m) { setSelectedHour(h); setSelectedMinute(m); }
    }
    
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);

    setAddModalVisible(true);
    setDeadlineVisible(false);
  };

  const toggleTaskCompletion = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  const saveTask = () => {
    if (!title.trim()) return;
    const finalDate = hasDate ? deadlineDate : '';
    const finalTime = hasTime ? deadlineTime : '';

    if (isEditMode && editTaskId) {
      setTasks(tasks.map(t => t.id === editTaskId ? { ...t, title, memo, deadlineDate: finalDate, deadlineTime: finalTime, quadrant: currentQuadrant } : t));
    } else {
      setTasks([...tasks, { id: Date.now(), title, memo, deadlineDate: finalDate, deadlineTime: finalTime, quadrant: currentQuadrant, delayCount: 0, isCompleted: false }]);
    }
    setAddModalVisible(false);
  };

  const deleteTask = () => {
    if (editTaskId) setTasks(tasks.filter(t => t.id !== editTaskId));
    setAddModalVisible(false);
  };

  const generateCalendar = () => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const days = Array(firstDay).fill('');
    for (let i = 1; i <= daysInMonth; i++) days.push(i.toString());
    return days;
  };

  const selectDate = (day: string) => {
    if (day) setDeadlineDate(`${currentYear}. ${currentMonth}. ${day}.`);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const renderQuadrant = (qTitle: '당장 해' | '그래도 해' | '해치워' | '나중에 해', dotColor: string) => {
    const quadrantTasks = tasks.filter(t => t.quadrant === qTitle);
    
    return (
      <View style={styles.quadrantBox}>
        <View style={styles.quadrantHeader}>
          <View style={styles.quadrantTitleWrapper}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text style={styles.quadrantTitle}>{qTitle}</Text>
          </View>
          <TouchableOpacity onPress={() => openAddModal(qTitle)}>
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.taskList}>
          {quadrantTasks.map(task => {
            const urgent = isUrgent(task.deadlineDate, task.isCompleted);
            const formattedDeadline = getFormattedDeadline(task.deadlineDate, task.deadlineTime);
            return (
              <View key={task.id} style={styles.taskItem}>
                <TouchableOpacity onPress={() => toggleTaskCompletion(task.id)} style={styles.checkbox}>
                  <Text style={[styles.checkboxText, task.isCompleted && styles.completedColor]}>
                    {task.isCompleted ? '☑' : '☐'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.taskTextContent} onPress={() => openEditModal(task)}>
                  <Text style={[styles.taskTitleText, task.isCompleted && styles.completedTaskText]}>
                    {task.title}
                  </Text>
                  {qTitle !== '나중에 해' && formattedDeadline ? (
                    <Text style={[styles.taskDeadlineText, task.isCompleted ? styles.completedColor : (urgent ? styles.urgentColor : styles.defaultColor)]}>
                      {formattedDeadline}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.matrixContainer}>
        <View style={styles.row}>
          {renderQuadrant('당장 해', '#ff5a5a')}
          {renderQuadrant('그래도 해', '#ffb31b')}
        </View>
        <View style={styles.row}>
          {renderQuadrant('해치워', '#5a9aff')}
          {renderQuadrant('나중에 해', '#a0a0a0')}
        </View>
      </View>

      <Modal visible={isAddModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
              style={styles.keyboardAvoidView}
            >
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
                  <Text style={styles.dateDisplay}>마감: {getFormattedDeadline(hasDate ? deadlineDate : '', hasTime ? deadlineTime : '')}</Text>
                ) : null}

                <View style={styles.toolbar}>
                  <View style={styles.iconGroup}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => { Keyboard.dismiss(); setDeadlineVisible(true); }}>
                      <Text style={styles.iconText}>📅</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.actionGroup}>
                    {isEditMode && (
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ff5a5a' }]} onPress={deleteTask}>
                        <Text style={styles.actionBtnText}>삭제</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ffb31b' }]} onPress={saveTask}>
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
                        trackColor={{ false: "#767577", true: "#ffb31b" }}
                        thumbColor={"#f4f3f4"}
                        value={hasDate} 
                        onValueChange={(val) => {
                          setHasDate(val);
                          if (val && !deadlineDate) {
                            const t = new Date();
                            setDeadlineDate(`${t.getFullYear()}. ${t.getMonth() + 1}. ${t.getDate()}.`);
                          }
                        }} 
                      />
                    </View>

                    {hasDate && (
                      <View style={styles.miniCalendarBox}>
                        <View style={styles.calendarHeader}>
                          <TouchableOpacity onPress={() => { currentMonth === 1 ? (setCurrentMonth(12), setCurrentYear(y => y - 1)) : setCurrentMonth(m => m - 1) }}>
                            <Text style={styles.arrowText}>◀</Text>
                          </TouchableOpacity>
                          <Text style={styles.calendarMonthText}>{currentYear}년 {currentMonth}월</Text>
                          <TouchableOpacity onPress={() => { currentMonth === 12 ? (setCurrentMonth(1), setCurrentYear(y => y + 1)) : setCurrentMonth(m => m + 1) }}>
                            <Text style={styles.arrowText}>▶</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.weekRow}>
                          {['일','월','화','수','목','금','토'].map(d => <Text key={d} style={styles.weekText}>{d}</Text>)}
                        </View>
                        <View style={styles.daysGrid}>
                          {generateCalendar().map((day, idx) => (
                            <View key={idx} style={styles.dayWrapper}>
                              <TouchableOpacity 
                                style={[styles.dayBtn, deadlineDate === `${currentYear}. ${currentMonth}. ${day}.` && styles.dayBtnSelected]} 
                                onPress={() => selectDate(day)}
                                disabled={!day}
                              >
                                <Text style={[styles.dayText, !day && {opacity: 0}, deadlineDate === `${currentYear}. ${currentMonth}. ${day}.` && styles.dayTextSelected]}>
                                  {day}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    <View style={styles.toggleRow}>
                      <View style={styles.toggleTextGroup}>
                        <Text style={styles.toggleLabel}>시간</Text>
                        {hasTime && <Text style={styles.toggleValue}>{deadlineTime}</Text>}
                      </View>
                      <Switch 
                        trackColor={{ false: "#767577", true: "#ffb31b" }}
                        thumbColor={"#f4f3f4"}
                        value={hasTime} 
                        onValueChange={(val) => {
                          setHasTime(val);
                          if (val && !deadlineTime) setDeadlineTime('12:00');
                        }} 
                      />
                    </View>

                    {hasTime && (
                      <View style={styles.timePickerContainer}>
                        <ScrollView style={styles.timeScrollColumn} showsVerticalScrollIndicator={false}>
                          {hours.map(h => (
                            <TouchableOpacity key={`h-${h}`} style={styles.timeItem} onPress={() => setSelectedHour(h)}>
                              <Text style={[styles.timePickerText, selectedHour === h && styles.timePickerTextSelected]}>{h}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        <Text style={styles.timeColon}>:</Text>
                        <ScrollView style={styles.timeScrollColumn} showsVerticalScrollIndicator={false}>
                          {minutes.map(m => (
                            <TouchableOpacity key={`m-${m}`} style={styles.timeItem} onPress={() => setSelectedMinute(m)}>
                              <Text style={[styles.timePickerText, selectedMinute === m && styles.timePickerTextSelected]}>{m}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

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
  matrixContainer: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  
  quadrantBox: { 
    flex: 1, 
    margin: 6, 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    borderRadius: 24, 
    overflow: 'hidden', 
    shadowColor: '#a1b594', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 25, 
    elevation: 2 
  },
  
  quadrantHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#f5f5f5', 
    paddingVertical: 6, 
    paddingHorizontal: 12,
  },
  quadrantTitleWrapper: { flexDirection: 'row', alignItems: 'center' },
  dot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    marginRight: 10 
  },
  
  /* 🛠️ [폰트 크기 조절] 사분할 상단 제목 (ex. 당장 해) */
  quadrantTitle: { 
    fontFamily: 'Galmuri9', 
    fontSize: 14, 
    color: '#1a0f00' 
  }, 
  
  /* 🛠️ [폰트 크기 조절] 사분할 상단 + 추가 버튼 */
  addIcon: { 
    fontFamily: 'Galmuri9', 
    fontSize: 20, 
    color: '#888', 
    paddingHorizontal: 5 
  },
  
  taskList: { flex: 1, padding: 12 },
  taskItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  checkbox: { marginRight: 8, marginTop: 1 },
  checkboxText: { fontFamily: 'Galmuri9', fontSize: 14, color: '#333' },
  taskTextContent: { flex: 1 },
  
  /* 🛠️ [폰트 크기 조절] 실제 할 일(태스크) 제목 */
  taskTitleText: { 
    fontFamily: 'Galmuri9', 
    fontSize: 12, 
    color: '#333', 
    marginBottom: 2 
  }, 
  completedTaskText: { color: '#a0a0a0', textDecorationLine: 'line-through' }, 
  
  /* 🛠️ [폰트 크기 조절] 실제 마감일 날짜 텍스트 */
  taskDeadlineText: { 
    fontFamily: 'Galmuri9', 
    fontSize: 10 
  }, 
  
  defaultColor: { color: '#a0a0a0' },
  urgentColor: { color: '#ff5a5a' },
  completedColor: { color: '#a0a0a0' }, 

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  keyboardAvoidView: { width: '100%' },
  bottomSheet: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  qTab: { fontFamily: 'Galmuri9', fontSize: 12, color: '#666', padding: 5 },
  qTabActive: { color: '#ffb31b', textDecorationLine: 'underline' },
  closeBtn: { fontFamily: 'Galmuri9', fontSize: 16, color: '#fff' },
  inputTitle: { fontFamily: 'Galmuri9', fontSize: 18, color: '#fff', borderBottomWidth: 1, borderColor: '#333', paddingVertical: 10, marginBottom: 10 },
  inputMemo: { fontFamily: 'Galmuri9', fontSize: 14, color: '#fff', paddingVertical: 10, minHeight: 40 },
  dateDisplay: { fontFamily: 'Galmuri9', fontSize: 12, color: '#5a9aff', marginTop: 10 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  iconGroup: { flexDirection: 'row' },
  iconBtn: { padding: 10, backgroundColor: '#333', borderRadius: 8, marginRight: 10 },
  iconText: { fontFamily: 'Galmuri9', fontSize: 16 },
  
  actionGroup: { flexDirection: 'row' },
  
  /* 🛠️ [모서리 둥글기 조절] 추가, 저장, 삭제 버튼의 모서리 둥글기 설정 (8 -> 16으로 증가) */
  actionBtn: { 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: 16, // 숫자를 높일수록 원형에 가까워집니다!
    marginLeft: 10 
  },
  
  actionBtnText: { fontFamily: 'Galmuri9', fontSize: 14 },

  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  deadlineSettingsBox: { backgroundColor: '#2c2c2e', width: '85%', borderRadius: 16, padding: 20 },
  
  deadlineSettingsHeader: { alignItems: 'center', marginBottom: 20 },
  deadlineSettingsTitle: { fontFamily: 'Galmuri9', fontSize: 16, color: '#fff' },
  
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#3a3a3c', padding: 15, borderRadius: 12, marginBottom: 10 },
  toggleTextGroup: { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { fontFamily: 'Galmuri9', fontSize: 14, color: '#fff', marginRight: 15 },
  toggleValue: { fontFamily: 'Galmuri9', fontSize: 14, color: '#ffb31b' },
  
  miniCalendarBox: { backgroundColor: '#3a3a3c', borderRadius: 12, padding: 15, marginBottom: 10 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  arrowText: { fontFamily: 'Galmuri9', fontSize: 16, color: '#a0a0a0', paddingHorizontal: 10 },
  calendarMonthText: { fontFamily: 'Galmuri9', fontSize: 14, color: '#fff' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  weekText: { fontFamily: 'Galmuri9', color: '#888', fontSize: 11 },
  
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayWrapper: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dayBtnSelected: { backgroundColor: '#ffb31b' },
  dayText: { fontFamily: 'Galmuri9', color: '#fff', fontSize: 12, textAlign: 'center' },
  dayTextSelected: { color: '#fff' }, 

  timePickerContainer: { flexDirection: 'row', backgroundColor: '#3a3a3c', padding: 15, borderRadius: 12, marginBottom: 10, height: 160, justifyContent: 'center', alignItems: 'center' },
  timeScrollColumn: { flex: 1 },
  timeItem: { height: 40, justifyContent: 'center', alignItems: 'center' },
  timePickerText: { fontFamily: 'Galmuri9', fontSize: 16, color: '#888' },
  timePickerTextSelected: { fontFamily: 'Galmuri9', color: '#ffb31b', fontSize: 20 },
  timeColon: { fontFamily: 'Galmuri9', fontSize: 20, color: '#fff', paddingHorizontal: 20 },

  pixelConfirmBtn: { 
    alignSelf: 'center', 
    marginTop: 15, 
    padding: 10 
  },
  pixelConfirmText: { 
    fontFamily: 'Galmuri9', 
    fontSize: 16, 
    color: '#fff', 
    textDecorationLine: 'underline' 
  }
});