import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, Pattern, Rect, Path as SvgPath } from 'react-native-svg';

import LoginScreen from './LoginScreen';
import TaskScreen from './TaskScreen'; 
import CalendarScreen from './CalendarScreen'; 

const MainScreen = () => <View style={{ flex: 1 }} />;

const Tab = createMaterialTopTabNavigator();
const Stack = createStackNavigator();

const CustomTopTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <SafeAreaView style={customTabStyles.safeArea}>
      <View style={customTabStyles.wrapper}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.9)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={customTabStyles.glassContainer}
        >
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={onPress}
                style={customTabStyles.tabButton}
              >
                {isFocused ? (
                  <LinearGradient
                    colors={['#fca17d', '#ffc886']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={customTabStyles.activeTab}
                  >
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

// 📌 탭 네비게이터가 들어갈 메인 서비스 화면
const ServiceScreen = () => (
  <View style={styles.container}>
    
    {/* 전체 배경에 촘촘한 모눈종이 깔기 */}
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

    {/* 💡 에러의 원인이었던 sceneContainerStyle 줄을 삭제했습니다! */}
    <Tab.Navigator
      initialRouteName="메인화면"
      tabBar={(props: any) => <CustomTopTabBar {...props} />}
      screenOptions={{ sceneStyle: { backgroundColor: 'transparent' } } as any}
    >
      <Tab.Screen name="캘린더" component={CalendarScreen} />
      <Tab.Screen name="메인화면" component={MainScreen} />
      <Tab.Screen name="태스크" component={TaskScreen} />
    </Tab.Navigator>
    
  </View>
);

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Service" component={ServiceScreen} />
        ) : (
          <Stack.Screen name="Login">
            {(props: any) => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

const customTabStyles = StyleSheet.create({
  safeArea: { backgroundColor: 'transparent' },
  wrapper: { backgroundColor: 'transparent', paddingTop: Platform.OS === 'ios' ? 10 : 30, paddingBottom: 15, alignItems: 'center' },
  glassContainer: { flexDirection: 'row', width: '90%', height: 52, borderRadius: 26, padding: 6, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  tabButton: { flex: 1 },
  activeTab: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20, shadowColor: '#fca17d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 },
  inactiveTab: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  activeTabText: { fontFamily: 'Galmuri9', fontSize: 15, color: '#ffffff' },
  inactiveTabText: { fontFamily: 'Galmuri9', fontSize: 15, color: '#a0a0a0' }
});