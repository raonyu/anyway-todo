import React, { useState, useEffect, useCallback } from 'react';
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
  status?: '진행 전' | '진행 중' | '완료'; 
}

export default function TaskScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); 
  const [editTaskId, setEditTaskId] = useState<number | null>(null);

  const [currentQuadrant, setCurrentQuadrant] = useState<'당장 해' | '그래도 해' | '해치워' | '나중에 해'>('당장 해');
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [taskStatus, setTaskStatus] = useState<'진행 전' | '진행 중' | '완료'>('진행 전');
  
  const [isDeadlineVisible, setDeadlineVisible] = useState(false);
  const [hasDate, setHasDate] = useState(false);
  const [hasTime, setHasTime] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');

  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

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
          isCompleted: item.is_completed === 1,
          status: item.status || (item.is_completed === 1 ? '완료' : '진행 전')
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
        if (y === currentY) resultDate = `${padM}.${padD}.(${dayOfWeek})`;
        else resultDate = `${y}.${padM}.${padD}.(${dayOfWeek})`;
      } else { resultDate = dateStr; }
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
    setTaskStatus('진행 전');
    
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
    setTaskStatus(task.status || (task.isCompleted ? '완료' : '진행 전'));
    
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

  const toggleTaskCompletion = async (task: Task) => {
    const newCompletedStatus = !task.isCompleted;
    const newStatusText = newCompletedStatus ? '완료' : '진행 전';

    setTasks(tasks.map(t => t.id === task.id ? { ...t, isCompleted: newCompletedStatus, status: newStatusText } : t));

    try {
      await fetch(`${SERVER_URL}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title, memo: task.memo, deadline_date: task.deadlineDate, deadline_time: task.deadlineTime,
          quadrant: task.quadrant, delay_count: task.delayCount, 
          is_completed: newCompletedStatus, status: newStatusText
        })
      });
    } catch (error) { console.error("완료 상태 업데이트 실패:", error); }
  };

  const saveTask = async () => {
    if (!title.trim()) return;
    const finalDate = hasDate ? deadlineDate : '';
    const finalTime = hasTime ? deadlineTime : '';
    const isCompleted = taskStatus === '완료';

    try {
      if (isEditMode && editTaskId) {
        await fetch(`${SERVER_URL}/tasks/${editTaskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title, memo, deadline_date: finalDate, deadline_time: finalTime, 
            quadrant: currentQuadrant, delay_count: 0, is_completed: isCompleted, status: taskStatus
          })
        });
      } else {
        await fetch(`${SERVER_URL}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 1, title, memo, deadline_date: finalDate, deadline_time: finalTime, 
            quadrant: currentQuadrant, is_completed: isCompleted, status: taskStatus
          })
        });
      }
      setAddModalVisible(false);
      fetchTasks();
    } catch (error) { console.error("태스크 저장 실패:", error); }
  };

  const deleteTask = async () => {
    if (!editTaskId) return;
    try {
      await fetch(`${SERVER_URL}/tasks/${editTaskId}`, { method: 'DELETE' });
      setAddModalVisible(false);
      fetchTasks();
    } catch (error) { console.error("태스크 삭제 실패:", error); }
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
                <TouchableOpacity onPress={() => toggleTaskCompletion(task)} style={styles.checkbox}>
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

                {/* 💡 라디오 버튼 정중앙 정렬 */}
                <View style={styles.statusRadioContainer}>
                  {(['진행 전', '진행 중', '완료'] as const).map(s => (
                    <TouchableOpacity 
                      key={s} 
                      style={styles.statusRadioOption}
                      onPress={() => setTaskStatus(s)}
                    >
                      <View style={[styles.radioOuterCircle, taskStatus === s && styles.radioOuterCircleActive]}>
                        {taskStatus === s && <View style={styles.radioInnerCircle} />}
                      </View>
                      <Text style={[styles.statusRadioText, taskStatus === s && styles.statusRadioTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
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
                    마감: {getFormattedDeadline(hasDate ? deadlineDate : '', hasTime ? deadlineTime : '')} 
                  </Text>
                ) : null}

                <View style={styles.toolbar}>
                  <View style={styles.iconGroup}>
                    {currentQuadrant !== '나중에 해' && (
                      <TouchableOpacity style={[styles.iconBtn, { marginLeft: -4 }]} onPress={() => { Keyboard.dismiss(); setDeadlineVisible(true); }}>
                        <Text style={styles.iconText}>📅</Text>
                      </TouchableOpacity>
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
                      <View style={styles.toggleTextGroup}><Text style={styles.toggleLabel}>날짜</Text>{hasDate && <Text style={styles.toggleValue}>{deadlineDate}</Text>}</View>
                      <Switch trackColor={{ false: "#767577", true: "#ffb31b" }} thumbColor={"#f4f3f4"} value={hasDate} onValueChange={(val) => { setHasDate(val); if (val && !deadlineDate) { const t = new Date(); setDeadlineDate(`${t.getFullYear()}. ${t.getMonth() + 1}. ${t.getDate()}.`); } }} />
                    </View>

                    {hasDate && (
                      <View style={styles.miniCalendarBox}>
                        <View style={styles.calendarHeader}>
                          <TouchableOpacity onPress={() => { currentMonth === 1 ? (setCurrentMonth(12), setCurrentYear(y => y - 1)) : setCurrentMonth(m => m - 1) }}><Text style={styles.arrowText}>◀</Text></TouchableOpacity>
                          <Text style={styles.calendarMonthText}>{currentYear}년 {currentMonth}월</Text>
                          <TouchableOpacity onPress={() => { currentMonth === 12 ? (setCurrentMonth(1), setCurrentYear(y => y + 1)) : setCurrentMonth(m => m + 1) }}><Text style={styles.arrowText}>▶</Text></TouchableOpacity>
                        </View>
                        <View style={styles.weekRow}>
                          {['일','월','화','수','목','금','토'].map(d => <Text key={d} style={styles.weekText}>{d}</Text>)}
                        </View>
                        <View style={styles.daysGrid}>
                          {generateCalendar().map((day, idx) => (
                            <View key={idx} style={styles.dayWrapper}>
                              <TouchableOpacity style={[styles.dayBtn, deadlineDate === `${currentYear}. ${currentMonth}. ${day}.` && styles.dayBtnSelected]} onPress={() => selectDate(day)} disabled={!day}>
                                <Text style={[styles.dayText, !day && {opacity: 0}, deadlineDate === `${currentYear}. ${currentMonth}. ${day}.` && styles.dayTextSelected]}>{day}</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    <View style={styles.toggleRow}>
                      <View style={styles.toggleTextGroup}><Text style={styles.toggleLabel}>시간</Text>{hasTime && <Text style={styles.toggleValue}>{deadlineTime}</Text>}</View>
                      <Switch trackColor={{ false: "#767577", true: "#ffb31b" }} thumbColor={"#f4f3f4"} value={hasTime} onValueChange={(val) => { setHasTime(val); if (val && !deadlineTime) setDeadlineTime('12:00'); }} />
                    </View>

                    {hasTime && (
                      <View style={styles.timePickerContainer}>
                        <ScrollView style={styles.timeScrollColumn} showsVerticalScrollIndicator={false}>
                          {hours.map(h => (
                            <TouchableOpacity key={`h-${h}`} style={styles.timeItem} onPress={() => setSelectedHour(h)}><Text style={[styles.timePickerText, selectedHour === h && styles.timePickerTextSelected]}>{h}</Text></TouchableOpacity>
                          ))}
                        </ScrollView>
                        <Text style={styles.timeColon}>:</Text>
                        <ScrollView style={styles.timeScrollColumn} showsVerticalScrollIndicator={false}>
                          {minutes.map(m => (
                            <TouchableOpacity key={`m-${m}`} style={styles.timeItem} onPress={() => setSelectedMinute(m)}><Text style={[styles.timePickerText, selectedMinute === m && styles.timePickerTextSelected]}>{m}</Text></TouchableOpacity>
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
  quadrantBox: { flex: 1, margin: 6, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 24, overflow: 'hidden', shadowColor: '#a1b594', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 25, elevation: 2 },
  quadrantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f5f5f5', paddingVertical: 6, paddingHorizontal: 12 },
  quadrantTitleWrapper: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  quadrantTitle: { fontFamily: 'Galmuri9', fontSize: 14, color: '#1a0f00' }, 
  addIcon: { fontFamily: 'Galmuri9', fontSize: 20, color: '#888', paddingHorizontal: 5 },
  taskList: { flex: 1, padding: 12 },
  taskItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  checkbox: { marginRight: 8, marginTop: 1 },
  checkboxText: { fontFamily: 'Galmuri9', fontSize: 14, color: '#333' },
  taskTextContent: { flex: 1 },
  taskTitleText: { fontFamily: 'Galmuri9', fontSize: 12, color: '#333', marginBottom: 2 }, 
  completedTaskText: { color: '#a0a0a0', textDecorationLine: 'line-through' }, 
  taskDeadlineText: { fontFamily: 'Galmuri9', fontSize: 10 }, 
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
  
  // 💡 1. 라디오 버튼 컨테이너 정중앙 정렬 (justifyContent: 'center')
  statusRadioContainer: { flexDirection: 'row', gap: 20, marginBottom: 15, justifyContent: 'center' },
  statusRadioOption: { flexDirection: 'row', alignItems: 'center' },
  radioOuterCircle: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#666', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  radioOuterCircleActive: { borderColor: '#5a9aff' },
  radioInnerCircle: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5a9aff' },
  statusRadioText: { fontFamily: 'Galmuri9', fontSize: 13, color: '#a0a0a0' },
  statusRadioTextActive: { color: '#fff' },

  inputTitle: { fontFamily: 'Galmuri9', fontSize: 18, color: '#fff', borderBottomWidth: 1, borderColor: '#333', paddingVertical: 10, paddingHorizontal: 0, paddingLeft: 0, margin: 0, marginBottom: 10 },
  inputMemo: { fontFamily: 'Galmuri9', fontSize: 14, color: '#fff', paddingVertical: 10, paddingHorizontal: 0, paddingLeft: 0, margin: 0, minHeight: 40 },
  dateDisplay: { fontFamily: 'Galmuri9', fontSize: 12, color: '#5a9aff', marginTop: 10, paddingHorizontal: 0, paddingLeft: 0, margin: 0 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  iconGroup: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { height: 40, paddingHorizontal: 15, backgroundColor: '#333', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontFamily: 'Galmuri9', fontSize: 14 }, 
  actionGroup: { flexDirection: 'row' },
  actionBtnDel: { height: 40, paddingHorizontal: 20, backgroundColor: '#ff5a5a', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  
  // 💡 2. 저장/추가 버튼 색상 파란색(#5a9aff)으로 교체
  actionBtnSave: { height: 40, paddingHorizontal: 20, backgroundColor: '#5a9aff', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
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
  pixelConfirmBtn: { alignSelf: 'center', marginTop: 15, padding: 10 },
  pixelConfirmText: { fontFamily: 'Galmuri9', fontSize: 16, color: '#fff', textDecorationLine: 'underline' }
});