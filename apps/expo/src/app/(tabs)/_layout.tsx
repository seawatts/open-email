import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: 'hsl(327, 66%, 69%)',
        tabBarStyle: {
          backgroundColor: 'hsl(0, 0%, 100%)',
          borderTopColor: 'hsl(240, 5.9%, 90%)',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📥</Text>
          ),
          title: 'Inbox',
        }}
      />
    </Tabs>
  );
}
