import 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, Pattern, Rect, Path as SvgPath } from 'react-native-svg';

import LoginScreen from './LoginScreen';
import TaskScreen from './TaskScreen'; 
import CalendarScreen from './CalendarScreen'; 
import MainScreen from './MainScreen'; 

const Tab = createMaterialTopTabNavigator();
const Stack = createStackNavigator();

const CATEGORY_CONFIG = {
  '개인': { colors: ['#fca17d', '#ffc886'], activeColor: '#ffb31b' },
  '학업': { colors: ['#b5e7a0', '#c9f1b9'], activeColor: '#b5e7a0' },
  '성장': { colors: ['#cda8e4', '#f4d3f7'], activeColor: '#cda8e4' },
};

const CustomTopTabBar = ({ state, descriptors, navigation, categoryConfig }: any) => {
  return (
    <SafeAreaView style={customTabStyles.safeArea}>
      <View style={customTabStyles.wrapper}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.9)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={customTabStyles.glassContainer}
        >
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel || options.title || route.name;
            const isFocused = state.index === index;

            return (
              <TouchableOpacity key={index} activeOpacity={0.8} onPress={() => navigation.navigate(route.name)} style={customTabStyles.tabButton}>
                {isFocused ? (
                  <LinearGradient colors={categoryConfig.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={customTabStyles.activeTab}>
                    <Text style={customTabStyles.activeTabText}>{label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={customTabStyles.inactiveTab}>
                    <Text style={customTabStyles.inactiveTabText}>{label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
};

// ServiceScreen이 setIsLoggedIn을 props로 받도록 수정
const ServiceScreen = ({ setIsLoggedIn }: { setIsLoggedIn: (status: boolean) => void }) => {
  const [activeCategory, setActiveCategory] = useState<'개인' | '학업' | '성장'>('개인');

  const sharedProps = {
    activeCategory,
    setActiveCategory,
    categoryConfig: CATEGORY_CONFIG[activeCategory],
    setIsLoggedIn 
  };

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <Rect width="30" height="30" fill="#fafafa" />
              <SvgPath d="M 30 0 L 0 0 0 30" fill="none" stroke="#e6e6e6" strokeWidth="1" />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#grid)" />
        </Svg>
      </View>

      <Tab.Navigator
        initialRouteName="메인화면"
        tabBar={(props: any) => <CustomTopTabBar {...props} categoryConfig={CATEGORY_CONFIG[activeCategory]} />}
        screenOptions={{ sceneStyle: { backgroundColor: 'transparent' } } as any}
      >
        <Tab.Screen name="캘린더">{(props) => <CalendarScreen {...props} {...sharedProps} />}</Tab.Screen>
        <Tab.Screen name="메인화면">{(props) => <MainScreen {...props} {...sharedProps} />}</Tab.Screen>
        <Tab.Screen name="태스크">{(props) => <TaskScreen {...props} {...sharedProps} />}</Tab.Screen>
      </Tab.Navigator>
    </View>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingLogin, setIsCheckingLogin] = useState(true);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('로그인 확인 에러:', error);
      } finally {
        setIsCheckingLogin(false);
      }
    };
    checkLoginStatus();
  }, []);

  if (isCheckingLogin) return null; // 로딩 중 빈 화면

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Service">
            {/* ServiceScreen에 setIsLoggedIn 함수 넘겨주기 */}
            {(props) => <ServiceScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login">
            {(props: any) => <LoginScreen {...props} onLoginSuccess={() => setIsLoggedIn(true)} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' }
});

const customTabStyles = StyleSheet.create({
  safeArea: { backgroundColor: 'transparent' },
  wrapper: { backgroundColor: 'transparent', paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 20, alignItems: 'center' },
  glassContainer: { flexDirection: 'row', width: '90%', height: 52, borderRadius: 26, padding: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  tabButton: { flex: 1 },
  activeTab: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  inactiveTab: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  activeTabText: { fontFamily: 'Galmuri9', fontSize: 16, color: '#ffffff' },
  inactiveTabText: { fontFamily: 'Galmuri9', fontSize: 16, color: '#a0a0a0' }
});