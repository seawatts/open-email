import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { TRPCProvider } from '~/utils/api';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TRPCProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="thread/[id]"
            options={{
              headerBackTitle: 'Inbox',
              headerStyle: { backgroundColor: 'hsl(0, 0%, 100%)' },
              headerTitle: '',
              presentation: 'card',
            }}
          />
        </Stack>
        <StatusBar />
      </TRPCProvider>
    </GestureHandlerRootView>
  );
}
