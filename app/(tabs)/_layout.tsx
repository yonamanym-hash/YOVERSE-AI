// Powered by OnSpace.AI
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight } from '@/constants/theme';
import { useAuth } from '@/template';
import { YONAS_EMAIL } from '@/constants/config';

function TabIcon({ name, color, focused, label }: { name: any; color: string; focused: boolean; label: string }) {
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconActive]}>
      <MaterialIcons name={name} size={22} color={color} />
      {focused && <Text style={[tabStyles.label, { color }]}>{label}</Text>}
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isYonas = user?.email === YONAS_EMAIL;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: Platform.select({ ios: insets.bottom + 64, android: insets.bottom + 64, default: 70 }),
          paddingTop: 10,
          paddingBottom: Platform.select({ ios: insets.bottom + 10, android: insets.bottom + 10, default: 10 }),
          backgroundColor: Colors.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: Colors.tabBarBorder,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="chat" color={color} focused={focused} label="Chat" />
          ),
        }}
      />
      <Tabs.Screen
        name="trading"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="show-chart" color={color} focused={focused} label="Trading" />
          ),
        }}
      />
      <Tabs.Screen
        name="studio"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="camera-alt" color={color} focused={focused} label="Studio" />
          ),
        }}
      />
      <Tabs.Screen
        name="builder"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="developer-mode" color={color} focused={focused} label="Builder" />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={isYonas ? 'admin-panel-settings' : 'person'}
              color={color}
              focused={focused}
              label={isYonas ? 'Admin' : 'Me'}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 2,
    minWidth: 44,
    minHeight: 44,
  },
  iconActive: {
    backgroundColor: 'rgba(255,215,0,0.1)',
  },
  label: {
    fontSize: 9,
    fontWeight: FontWeight.semibold,
  },
});
