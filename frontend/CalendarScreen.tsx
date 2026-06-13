import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, 
  TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, 
  Keyboard, Switch,
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
  category: string;
}

interface ScreenProps {
  activeCategory: '개인' | '학업' | '성장';
  setActiveCategory: (cat: '개인' | '학업' | '성장') => void;
  categoryConfig: { colors: string[]; activeColor: string; };
  navigation?: any; 
  route?: any;
}

export default function CalendarScreen({ activeCategory, categoryConfig }: ScreenProps) {
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
  const [taskStatus, setTaskStatus] = useState<'진행 전' | '진행 중' | '완료'>('진행 전');

  const [isDeadlineVisible, setDeadlineVisible] = useState(false);
  const [hasDate, setHasDate] = useState(false);
  const [hasTime, setHasTime] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');

  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');

  const [isDailyModalVisible, setDailyModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/tasks?user_id=1&category=${activeCategory}`);
      if (response.ok) {
        const data = await response.json();
        const formattedData = data.map((item: any) => ({
          id: item.id, title: item.title, memo: item.memo || '',
          deadlineDate: item.deadline_date || '', deadlineTime: item.deadline_time || '',
          quadrant: item.quadrant, delayCount: item.delay_count, isCompleted: item.is_completed === 1,
          status: item.status || (item.is_completed === 1 ? '완료' : '진행 전'), category: item.category
        }));
        setTasks(formattedData);
      }
    } catch (error) { console.error("데이터 불러오기 실패:", error); }
  };

  useFocusEffect(useCallback(() => { fetchTasks(); }, [activeCategory]));

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

  const getQuadrantColor = (quadrant: string) => {
    switch (quadrant) {
      case '당장 해': return '#ff5a5a';
      case '그래도 해': return '#ffb31b';
      case '해치워': return '#5a9aff';
      case '나중에 해': return '#a0a0a0';
      default: return 'transparent';
    }
  };

  const getHighlighterColor = (quadrant: string) => {
    switch (quadrant) {
      case '당장 해': return 'rgba(255, 90, 90, 0.3)';
      case '그래도 해': return 'rgba(255, 179, 27, 0.3)';
      case '해치워': return 'rgba(90, 154, 255, 0.3)';
      default: return 'transparent';
    }
  };

  const openDailyModal = (day: number) => { setSelectedDay(day); setDailyModalVisible(true); };
  const closeDailyModal = () => { setDailyModalVisible(false); setSelectedDay(null); };

  const handleTaskEditClick = (task: Task) => {
    setDailyModalVisible(false); 
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
    setAddModalVisible(true);
  };

  const saveTask = async () => {
    if (!title.trim()) return;
    const isCompleted = taskStatus === '완료';

    try {
      if (isEditMode && editTaskId) {
        await fetch(`${SERVER_URL}/tasks/${editTaskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title, memo, deadline_date: hasDate ? deadlineDate : '', deadline_time: hasTime ? deadlineTime : '', 
            quadrant: currentQuadrant, delay_count: 0, is_completed: isCompleted, status: taskStatus, category: activeCategory
          })
        });
      } else {
        await fetch(`${SERVER_URL}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 1, title, memo, deadline_date: hasDate ? deadlineDate : '', deadline_time: hasTime ? deadlineTime : '', 
            quadrant: currentQuadrant, is_completed: isCompleted, status: taskStatus, category: activeCategory
          })
        });
      }
      setAddModalVisible(false);
      fetchTasks();
    } catch (error) { console.error("태스크 저장 실패:", error); }
  };

  const deleteTask = async () => {
    if (!editTaskId) return;
    try { await fetch(`${SERVER_URL}/tasks/${editTaskId}`, { method: 'DELETE' }); setAddModalVisible(false); fetchTasks(); } catch (error) { console.error("태스크 삭제 실패:", error); }
  };

  const getSelectedDayOfWeek = () => {
    if (!selectedDay) return '';
    const dateObj = new Date(currentYear, currentMonth - 1, selectedDay);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[dateObj.getDay()];
  };

  const selectedDateStr = selectedDay ? `${currentYear}. ${currentMonth}. ${selectedDay}.` : '';
  const dailyTasks = tasks.filter(t => t.deadlineDate === selectedDateStr && t.quadrant !== '나중에 해');
  
  const uniqueQuadrants = Array.from(new Set(dailyTasks.map(t => t.quadrant)));

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.monthText}>{currentYear}년 {currentMonth}월 ｡･:*:･ﾟ★</Text>
        <View style={styles.arrowGroup}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}><Text style={styles.arrowText}>{'<'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}><Text style={styles.arrowText}>{'>'}</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.calendarBoard}>
        <View style={styles.weekRow}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <View key={idx} style={styles.weekCell}><Text style={[styles.weekText, idx === 0 && { color: '#ff5a5a' }, idx === 6 && { color: '#5a9aff' }]}>{day}</Text></View>
          ))}
        </View>
        <ScrollView style={styles.daysGridContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.daysGrid}>
            {getDaysInMonth().map((day, index) => {
              const isToday = day === todayObj.getDate() && currentMonth === (todayObj.getMonth() + 1) && currentYear === todayObj.getFullYear();
              const isSelected = selectedDay === day;
              const cellDateStr = day ? `${currentYear}. ${currentMonth}. ${day}.` : '';
              const dayTasks = tasks.filter(t => t.deadlineDate === cellDateStr && t.quadrant !== '나중에 해');

              return (
                <View key={index} style={styles.dayCell}>
                  {day ? (
                    <TouchableWithoutFeedback onPress={() => openDailyModal(day)}>
                      <View style={styles.dayCellInner}>
                        <View style={[styles.dateNumberWrapper, isToday && styles.todayCircle, isSelected && !isToday && styles.selectedCircle]}>
                          <Text style={[styles.dayText, isToday && styles.todayText, isSelected && !isToday && styles.selectedText]}>{day}</Text>
                        </View>
                        
                        <View style={styles.cellTasksWrapper}>
                          {dayTasks.map(task => (
                            <TouchableOpacity 
                              key={task.id} 
                              activeOpacity={0.8}
                              onPress={() => handleTaskEditClick(task)}
                              style={[styles.taskBadge, { backgroundColor: task.isCompleted ? 'transparent' : getHighlighterColor(task.quadrant) }]}
                            >
                              <Text numberOfLines={1} style={[styles.taskBadgeText, task.isCompleted && styles.completedTaskBadgeText]}>{task.title}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* --- 일간 리스트 모달 (체크박스 제거 완료) --- */}
      <Modal visible={isDailyModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={closeDailyModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dailyBottomSheet}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.dailySheetTitle}>{currentMonth}월 {selectedDay}일 ({getSelectedDayOfWeek()})</Text>
                  <TouchableOpacity onPress={closeDailyModal}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.dailyTaskList}>
                  {dailyTasks.length === 0 ? (
                    <Text style={styles.emptyTaskText}>이 날은 마감일이 지정된 일정이 없어요!</Text>
                  ) : (
                    dailyTasks.map(task => (
                      <View key={task.id} style={styles.dailyTaskRow}>
                        <TouchableOpacity style={styles.dailyTaskTitleWrapper} onPress={() => handleTaskEditClick(task)}>
                          <Text style={[styles.dailyTaskTitleText, task.isCompleted && styles.completedTaskText]}>
                            {task.title}
                          </Text>
                        </TouchableOpacity>

                        <View style={[styles.quadrantCircle, { backgroundColor: getQuadrantColor(task.quadrant) }]} />
                      </View>
                    ))
                  )}
                </ScrollView>

                {uniqueQuadrants.length > 0 && (
                  <View style={styles.legendContainer}>
                    {uniqueQuadrants.map((q) => (
                      <View key={q} style={styles.legendItem}>
                        <View style={[styles.quadrantCircle, { backgroundColor: getQuadrantColor(q) }]} />
                        <Text style={styles.legendText}>{q}</Text>
                      </View>
                    ))}
                  </View>
                )}

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- 기존 편집 모달 영역 --- */}
      <Modal visible={isAddModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoidView}>
              <View style={styles.bottomSheet}>
                <View style={styles.sheetHeader}>
                  {(['당장 해', '그래도 해', '해치워', '나중에 해'] as const).map(q => (
                    <TouchableOpacity key={q} onPress={() => setCurrentQuadrant(q)}>
                      <Text style={[styles.qTab, currentQuadrant === q && { color: categoryConfig.activeColor, textDecorationLine: 'underline' }]}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <TextInput style={styles.inputTitle} placeholder="제목" placeholderTextColor="#666" value={title} onChangeText={setTitle} autoFocus />
                <TextInput style={styles.inputMemo} placeholder="메모" placeholderTextColor="#666" value={memo} onChangeText={setMemo} />
                
                {(hasDate || hasTime) && currentQuadrant !== '나중에 해' ? (
                  <Text style={styles.dateDisplay}>
                    마감: {hasDate ? deadlineDate : ''} {hasTime ? deadlineTime : ''} 
                  </Text>
                ) : null}

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
                      <Switch trackColor={{ false: "#767577", true: "#5a9aff" }} thumbColor={"#f4f3f4"} value={hasDate} onValueChange={(val) => { setHasDate(val); if (val && !deadlineDate) setDeadlineDate(`${currentYear}. ${currentMonth}. ${new Date().getDate()}.`); }} />
                    </View>
                    <View style={styles.toggleRow}>
                      <View style={styles.toggleTextGroup}><Text style={styles.toggleLabel}>시간</Text>{hasTime && <Text style={styles.toggleValue}>{deadlineTime}</Text>}</View>
                      <Switch trackColor={{ false: "#767577", true: "#5a9aff" }} thumbColor={"#f4f3f4"} value={hasTime} onValueChange={(val) => { setHasTime(val); if (val && !deadlineTime) setDeadlineTime('12:00'); }} />
                    </View>

                    {hasDate && (
                      <View style={styles.miniCalendarBox}>
                        <View style={styles.calendarHeader}>
                          <TouchableOpacity onPress={() => { currentMonth === 1 ? (setCurrentMonth(12), setCurrentYear(y => y - 1)) : setCurrentMonth(m => m - 1) }}><Text style={styles.miniArrowText}>◀</Text></TouchableOpacity>
                          <Text style={styles.calendarMonthText}>{currentYear}년 {currentMonth}월</Text>
                          <TouchableOpacity onPress={() => { currentMonth === 12 ? (setCurrentMonth(1), setCurrentYear(y => y + 1)) : setCurrentMonth(m => m + 1) }}><Text style={styles.miniArrowText}>▶</Text></TouchableOpacity>
                        </View>
                        <View style={styles.miniWeekRow}>{['일','월','화','수','목','금','토'].map(d => <Text key={d} style={styles.miniWeekText}>{d}</Text>)}</View>
                        
                        <View style={styles.miniDaysGrid}>
                          {generateCalendar().map((day: string, idx: number) => (
                            <View key={idx} style={styles.dayWrapper}>
                              <TouchableOpacity style={[styles.dayBtn, deadlineDate === `${currentYear}. ${currentMonth}. ${day}.` && styles.dayBtnSelected]} onPress={() => selectDate(day)} disabled={!day}>
                                <Text style={[styles.miniDayText, !day && {opacity: 0}, deadlineDate === `${currentYear}. ${currentMonth}. ${day}.` && styles.dayTextSelected]}>{day}</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {hasTime && (
                      <View style={styles.timePickerContainer}>
                        <ScrollView style={styles.timeScrollColumn} showsVerticalScrollIndicator={false}>
                          {hours.map((h: string) => (<TouchableOpacity key={`h-${h}`} style={styles.timeItem} onPress={() => setSelectedHour(h)}><Text style={[styles.timePickerText, selectedHour === h && styles.timePickerTextSelected]}>{h}</Text></TouchableOpacity>))}
                        </ScrollView>
                        <Text style={styles.timeColon}>:</Text>
                        <ScrollView style={styles.timeScrollColumn} showsVerticalScrollIndicator={false}>
                          {minutes.map((m: string) => (<TouchableOpacity key={`m-${m}`} style={styles.timeItem} onPress={() => setSelectedMinute(m)}><Text style={[styles.timePickerText, selectedMinute === m && styles.timePickerTextSelected]}>{m}</Text></TouchableOpacity>))}
                        </ScrollView>
                      </View>
                    )}
                    <TouchableOpacity style={styles.pixelConfirmBtn} onPress={() => setDeadlineVisible(false)}><Text style={styles.pixelConfirmText}>확인</Text></TouchableOpacity>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 15 },
  monthText: { fontFamily: 'Galmuri9', fontSize: 16, color: '#1a0f00' },
  arrowGroup: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  arrowBtn: { padding: 5 },
  arrowText: { fontFamily: 'Galmuri9', fontSize: 22, color: '#888' },
  calendarBoard: { flex: 1, backgroundColor: 'transparent', paddingBottom: 10 },
  weekRow: { flexDirection: 'row', backgroundColor: 'transparent', paddingVertical: 10 },
  weekCell: { flex: 1, alignItems: 'center' },
  weekText: { fontFamily: 'Galmuri9', fontSize: 12, color: '#333' },
  daysGridContainer: { flex: 1, paddingTop: 10 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', minHeight: 85 },
  dayCellInner: { flex: 1, paddingHorizontal: 2 },
  dateNumberWrapper: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 4, overflow: 'hidden' },
  todayCircle: { backgroundColor: '#5a9aff', borderColor: '#5a9aff' },
  selectedCircle: { borderColor: '#5a9aff' },
  dayText: { fontFamily: 'Galmuri9', fontSize: 13, color: '#444', textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center', ...Platform.select({ android: { paddingTop: 2 }}) },
  todayText: { color: '#fff' },
  selectedText: { color: '#5a9aff' },
  cellTasksWrapper: { width: '100%', marginTop: 4 },
  
  taskBadge: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 4, marginBottom: 2, overflow: 'hidden' },
  taskBadgeText: { fontFamily: 'Galmuri9', fontSize: 8, color: '#333' },
  completedTaskBadgeText: { textDecorationLine: 'line-through', color: '#a0a0a0' },

  dailyBottomSheet: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, paddingBottom: 40, maxHeight: '60%' },
  dailySheetTitle: { fontFamily: 'Galmuri9', fontSize: 18, color: '#fff', marginBottom: 5 },
  dailyTaskList: { marginTop: 15 },
  emptyTaskText: { fontFamily: 'Galmuri9', fontSize: 14, color: '#888', textAlign: 'center', marginTop: 30 },
  dailyTaskRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  dailyTaskTitleWrapper: { flex: 1 },
  dailyTaskTitleText: { fontFamily: 'Galmuri9', fontSize: 15, color: '#fff' },
  completedTaskText: { color: '#a0a0a0', textDecorationLine: 'line-through' },
  quadrantCircle: { width: 12, height: 12, borderRadius: 6, marginLeft: 10 },
  
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderColor: '#333', gap: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendText: { fontFamily: 'Galmuri9', fontSize: 12, color: '#a0a0a0', marginLeft: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  keyboardAvoidView: { width: '100%' },
  bottomSheet: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  qTab: { fontFamily: 'Galmuri9', fontSize: 12, color: '#666', padding: 5 },
  closeBtn: { fontFamily: 'Galmuri9', fontSize: 16, color: '#fff' },
  
  statusRadioContainer: { flexDirection: 'row', gap: 20, marginTop: 15, marginBottom: 5, justifyContent: 'flex-start' },
  statusRadioOption: { flexDirection: 'row', alignItems: 'center' },
  radioOuterCircle: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#666', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  radioOuterCircleActive: { borderColor: '#5a9aff' },
  radioInnerCircle: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5a9aff' },
  statusRadioText: { fontFamily: 'Galmuri9', fontSize: 12, color: '#a0a0a0' }, 
  statusRadioTextActive: { color: '#fff' },

  inputTitle: { fontFamily: 'Galmuri9', fontSize: 18, color: '#fff', borderBottomWidth: 1, borderColor: '#333', paddingVertical: 10, paddingHorizontal: 0, paddingLeft: 0, margin: 0, marginBottom: 10 },
  inputMemo: { fontFamily: 'Galmuri9', fontSize: 14, color: '#fff', paddingVertical: 10, paddingHorizontal: 0, paddingLeft: 0, margin: 0, minHeight: 40 },
  dateDisplay: { fontFamily: 'Galmuri9', fontSize: 12, color: '#5a9aff', marginTop: 10, paddingHorizontal: 0, paddingLeft: 0, margin: 0 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  iconGroup: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { height: 40, paddingHorizontal: 15, backgroundColor: '#333', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontFamily: 'Galmuri9', fontSize: 14 }, 
  actionGroup: { flexDirection: 'row' },
  actionBtnDel: { height: 40, paddingHorizontal: 20, backgroundColor: '#ff5a5a', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  actionBtnSave: { height: 40, paddingHorizontal: 20, backgroundColor: '#5a9aff', borderRadius: 16, justifyContent: 'center', alignItems: 'center' }, 
  actionBtnText: { fontFamily: 'Galmuri9', fontSize: 14 },

  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  deadlineSettingsBox: { backgroundColor: '#2c2c2e', width: '85%', borderRadius: 16, padding: 20 },
  deadlineSettingsHeader: { alignItems: 'center', marginBottom: 20 },
  deadlineSettingsTitle: { fontFamily: 'Galmuri9', fontSize: 16, color: '#fff' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#3a3a3c', padding: 15, borderRadius: 12, marginBottom: 10 },
  toggleTextGroup: { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { fontFamily: 'Galmuri9', fontSize: 14, color: '#fff', marginRight: 15 },
  toggleValue: { fontFamily: 'Galmuri9', fontSize: 14, color: '#5a9aff' }, 
  miniCalendarBox: { backgroundColor: '#3a3a3c', borderRadius: 12, padding: 15, marginBottom: 10 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  miniArrowText: { fontFamily: 'Galmuri9', fontSize: 16, color: '#a0a0a0', paddingHorizontal: 10 },
  calendarMonthText: { fontFamily: 'Galmuri9', fontSize: 14, color: '#fff' },
  miniWeekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  miniWeekText: { fontFamily: 'Galmuri9', color: '#888', fontSize: 11 },
  miniDaysGrid: { flexDirection: 'row', flexWrap: 'wrap' }, 
  dayWrapper: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dayBtnSelected: { backgroundColor: '#5a9aff' }, 
  miniDayText: { fontFamily: 'Galmuri9', color: '#fff', fontSize: 12, textAlign: 'center' },
  dayTextSelected: { color: '#fff' }, 
  timePickerContainer: { flexDirection: 'row', backgroundColor: '#3a3a3c', padding: 15, borderRadius: 12, marginBottom: 10, height: 160, justifyContent: 'center', alignItems: 'center' },
  timeScrollColumn: { flex: 1 },
  timeItem: { height: 40, justifyContent: 'center', alignItems: 'center' },
  timePickerText: { fontFamily: 'Galmuri9', fontSize: 16, color: '#888' },
  timePickerTextSelected: { fontFamily: 'Galmuri9', color: '#5a9aff', fontSize: 20 }, 
  timeColon: { fontFamily: 'Galmuri9', fontSize: 20, color: '#fff', paddingHorizontal: 20 },
  pixelConfirmBtn: { alignSelf: 'center', marginTop: 15, padding: 10 },
  pixelConfirmText: { fontFamily: 'Galmuri9', fontSize: 16, color: '#fff', textDecorationLine: 'underline' } 
});