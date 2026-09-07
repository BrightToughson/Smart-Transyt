import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  
  if (isLoaded && isSignedIn) {
    return <Redirect href="/(drawer)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
