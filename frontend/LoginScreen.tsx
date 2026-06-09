import AsyncStorage from '@react-native-async-storage/async-storage'; // 💡 로컬 저장소 추가
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ImageBackground,
  TextInput,
  Alert,
} from 'react-native';

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [viewMode, setViewMode] = useState<'home' | 'login' | 'signup'>('home');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayedText, setDisplayedText] = useState('');

  const mainText = "그래도\n해야지\n어떡해";
  
  const verticalLine = "|\n|\n|\n|\n|\n|\n|\n|\n|\n|\n|\n|";

  useEffect(() => {
    let index = 0;
    const typingInterval = setInterval(() => {
      setDisplayedText(mainText.substring(0, index));
      index++;
      if (index > mainText.length) {
        clearInterval(typingInterval);
      }
    }, 500);
    return () => clearInterval(typingInterval);
  }, []);

  const handleAuth = async () => {
    if (!username || !password) {
      Alert.alert('알림', '아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    const endpoint = viewMode === 'login' ? '/login' : '/signup';
    const SERVER_URL = `http://10.0.2.2:3000${endpoint}`;

    try {
      const response = await fetch(SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (viewMode === 'login') {
          // 💡 로그인 성공 시 스마트폰에 'userToken'이라는 징표를 남김!
          try {
            await AsyncStorage.setItem('userToken', 'logged_in_user_token');
          } catch (e) {
            console.error('징표 저장 실패:', e);
          }
          onLoginSuccess(); 
        } else {
          Alert.alert('환영합니다!', '회원가입이 완료되었습니다.\n이제 로그인해 주세요!');
          setViewMode('login'); 
          setUsername(''); 
          setPassword('');
        }
      } else {
        Alert.alert('알림', data.message);
      }
      
    } catch (error) {
      console.error(error);
      Alert.alert('서버 오류', '서버와 연결할 수 없습니다. 백엔드 서버가 켜져 있는지 확인해 주세요.');
    }
  };

  return (
    <ImageBackground source={require('./assets/images/background.png')} style={styles.background}>
      <View style={styles.centerContainer}>
        
        <View style={styles.asciiBox}>
          <Text style={styles.asciiHorizontal} numberOfLines={1} ellipsizeMode="clip">
            --------------------------------------------------------
          </Text>
          <View style={styles.asciiMiddleRow}>
            <Text style={styles.asciiVertical}>{verticalLine}</Text>
            <View style={styles.contentArea}>
              <Text style={[styles.galmuriFont, styles.topLeftText]}>.⋆｡⋆༶⋆˙⊹</Text>
              <View style={styles.mainTextWrapper}>
                <Text style={[styles.galmuriFont, styles.mainTitle]}>{displayedText}</Text>
              </View>
              <Text style={[styles.galmuriFont, styles.bottomRightText]}>anyway-todo</Text>
            </View>
            <Text style={styles.asciiVertical}>{verticalLine}</Text>
          </View>
          <Text style={styles.asciiHorizontal} numberOfLines={1} ellipsizeMode="clip">
            --------------------------------------------------------
          </Text>
        </View>

        <View style={styles.actionContainer}>
          {viewMode === 'home' ? (
            <View style={styles.linkRow}>
              <TouchableOpacity onPress={() => setViewMode('login')}>
                <Text style={styles.linkText}>로그인</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setViewMode('signup')}>
                <Text style={styles.linkText}>회원가입</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <TextInput
                style={styles.inputField}
                placeholder="아이디"
                placeholderTextColor="rgba(26, 15, 0, 0.4)"
                value={username}
                onChangeText={setUsername}
              />
              <TextInput
                style={styles.inputField}
                placeholder="비밀번호"
                placeholderTextColor="rgba(26, 15, 0, 0.4)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <View style={styles.linkRow}>
                <TouchableOpacity onPress={handleAuth}>
                  <Text style={styles.linkText}>{viewMode === 'login' ? '확인' : '가입하기'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setViewMode('home')}>
                  <Text style={styles.linkText}>취소</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  galmuriFont: { fontFamily: 'Galmuri9', color: '#1a0f00' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  asciiBox: { width: 240, height: 220 },
  asciiHorizontal: { fontFamily: 'Galmuri9', fontSize: 12, color: '#1a0f00', textAlign: 'center' },
  asciiMiddleRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  asciiVertical: { fontFamily: 'Galmuri9', fontSize: 12, color: '#1a0f00', lineHeight: 18 },
  contentArea: { flex: 1, justifyContent: 'space-between', padding: 10 },
  topLeftText: { fontSize: 16, alignSelf: 'flex-start' },
  mainTextWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainTitle: { fontSize: 18, textAlign: 'center', lineHeight: 28 },
  bottomRightText: { fontSize: 12, alignSelf: 'flex-end' },
  actionContainer: { width: 240, marginTop: 15 },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  linkText: { fontFamily: 'Galmuri9', color: '#1a0f00', fontSize: 16, textDecorationLine: 'underline' },
  formContainer: { width: '100%' },
  inputField: { width: '100%', height: 40, borderBottomWidth: 1, borderBottomColor: '#1a0f00', marginBottom: 15, fontFamily: 'Galmuri9', color: '#1a0f00', fontSize: 14, paddingHorizontal: 5 }
});