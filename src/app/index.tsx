import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1A4996" />
      </View>
    );
  }

  if (isSignedIn) {
    // @ts-ignore
    return <Redirect href="/(drawer)" />;
  }

  // @ts-ignore
  return <Redirect href="/(auth)/sign-in" />;
}
