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
  
  // 💡 상자 세로 길이가 늘어난 만큼 기둥 길이를 길게 늘렸습니다! (총 12줄)
  const verticalLine = "|\n|\n|\n|\n|\n|\n|\n|\n|\n|\n|\n|";

  // 0.5초 타이핑 애니메이션
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


// 💡 백엔드 연동을 위해 async 함수로 변경
  const handleAuth = async () => {
    // 1. 빈칸 검사
    if (!username || !password) {
      Alert.alert('알림', '아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    // 2. 현재 상태에 따라 API 엔드포인트 결정
    const endpoint = viewMode === 'login' ? '/login' : '/signup';
    
    // 3. 안드로이드 에뮬레이터 전용 로컬 IP 주소 사용
    const SERVER_URL = `http://10.0.2.2:3000${endpoint}`;

    try {
      // 4. 백엔드로 데이터(POST) 보내기
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

      // 5. 서버에서 온 응답(JSON) 받기
      const data = await response.json();

      // 6. 응답 결과 처리 (status 200번대면 ok가 true가 됨)
      if (response.ok) {
        if (viewMode === 'login') {
          // 로그인 성공 시 부모 컴포넌트(App.tsx)에 성공 알림 -> 메인 화면 이동
          onLoginSuccess(); 
        } else {
          // 회원가입 성공 시 알림 띄우고 로그인 폼으로 화면 전환
          Alert.alert('환영합니다!', '회원가입이 완료되었습니다.\n이제 로그인해 주세요!');
          setViewMode('login'); 
          setUsername(''); // 입력창 초기화
          setPassword('');
        }
      } else {
        // 서버에서 보낸 에러 메시지 띄우기 (예: 이미 존재하는 아이디입니다)
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
        
        {/* 메인 아스키 박스 */}
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

        {/* 네모 박스 바로 밑 가로 사이즈(240)에 딱 맞춘 인터랙티브 영역 */}
        <View style={styles.actionContainer}>
          {viewMode === 'home' ? (
            /* 초기 텍스트 링크 화면 */
            <View style={styles.linkRow}>
              <TouchableOpacity onPress={() => setViewMode('login')}>
                <Text style={styles.linkText}>로그인</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setViewMode('signup')}>
                <Text style={styles.linkText}>회원가입</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* 미니멀한 텍스트 입력 폼 화면 */
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
  background: {
    flex: 1,
  },
  galmuriFont: {
    fontFamily: 'Galmuri9',
    color: '#1a0f00',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  asciiBox: {
    width: 240,
    height: 220, // 💡 기존 180에서 220으로 늘려서 '어떡해'가 넉넉하게 들어갈 수 있도록 수정!
  },
  asciiHorizontal: {
    fontFamily: 'Galmuri9',
    fontSize: 12,
    color: '#1a0f00',
    textAlign: 'center',
  },
  asciiMiddleRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  asciiVertical: {
    fontFamily: 'Galmuri9',
    fontSize: 12,
    color: '#1a0f00',
    lineHeight: 18,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 10,
  },
  topLeftText: { fontSize: 16, alignSelf: 'flex-start' },
  mainTextWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainTitle: { fontSize: 18, textAlign: 'center', lineHeight: 28 },
  bottomRightText: { fontSize: 12, alignSelf: 'flex-end' },

  actionContainer: {
    width: 240, 
    marginTop: 15, 
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    width: '100%',
  },
  linkText: {
    fontFamily: 'Galmuri9',
    color: '#1a0f00',
    fontSize: 16,
    textDecorationLine: 'underline', 
  },
  formContainer: {
    width: '100%',
  },
  inputField: {
    width: '100%',
    height: 40,
    borderBottomWidth: 1, 
    borderBottomColor: '#1a0f00',
    marginBottom: 15,
    fontFamily: 'Galmuri9',
    color: '#1a0f00',
    fontSize: 14,
    paddingHorizontal: 5,
  }
});