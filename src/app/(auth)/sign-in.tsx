import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn, useSignUp, useOAuth, useClerk } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Warm up the android browser to improve UX
export const useWarmUpBrowser = () => {
  React.useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  useWarmUpBrowser();
  const clerk = useClerk();
  const isLoaded = clerk.loaded;
  const signIn = clerk.client?.signIn;
  const signUp = clerk.client?.signUp;
  const setActive = clerk.setActive;

  const router = useRouter();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  // Form State
  const [identifier, setIdentifier] = useState(''); // Email or Username
  const [password, setPassword] = useState('');
  
  // UI State
  const [focusedInput, setFocusedInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthMissingFields, setOauthMissingFields] = useState(false);
  const [oauthUsername, setOauthUsername] = useState('');
  const [pendingOAuthSignUp, setPendingOAuthSignUp] = useState<any>(null);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  // Traditional Sign In
  const onSignInPress = async () => {
    if (!isLoaded || isLoading) return;
    setIsLoading(true);

    try {
      const completeSignIn = await signIn.create({
        identifier,
        password,
      });

      // @ts-ignore
      if (completeSignIn.status === 'complete') {
        // @ts-ignore
        await setActive({ session: completeSignIn.createdSessionId });
        // @ts-ignore
        router.replace('/(drawer)');
      } else {
        console.log(JSON.stringify(completeSignIn, null, 2));
        Alert.alert('Sign In', 'Additional verification required. This basic flow does not support MFA yet.');
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert('Sign In Error', err.errors?.[0]?.message || err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // OAuth Flow
  const onPressGoogle = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { createdSessionId, setActive: setOAuthActive, signIn: oAuthSignIn, signUp: oAuthSignUp } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/(drawer)', { scheme: 'smarttransyt' }),
      });

      if (createdSessionId) {
        // @ts-ignore
        await setOAuthActive({ session: createdSessionId });
        router.replace('/(drawer)');
      } else {
        if (oAuthSignIn?.createdSessionId) {
          // @ts-ignore
          await setOAuthActive({ session: oAuthSignIn.createdSessionId });
          router.replace('/(drawer)');
        } else if (oAuthSignUp?.createdSessionId) {
          // @ts-ignore
          await setOAuthActive({ session: oAuthSignUp.createdSessionId });
          router.replace('/(drawer)');
        } else if (oAuthSignUp?.status === 'missing_requirements') {
          if (oAuthSignUp.firstName) {
            const suggestedUsername = oAuthSignUp.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
            setOauthUsername(suggestedUsername);
          }
          setPendingOAuthSignUp(oAuthSignUp);
          setOauthMissingFields(true);
        } else {
          Alert.alert(
            'Incomplete Sign In', 
            `Status -> SignIn: ${oAuthSignIn?.status}, SignUp: ${oAuthSignUp?.status}.`
          );
        }
      }
    } catch (err: any) {
      Alert.alert('OAuth error', err?.message || JSON.stringify(err));
      console.error('OAuth error', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // OTP Verification
  const onPressVerify = async () => {
    if (!signUp || isLoading) return;
    setIsLoading(true);

    try {
      const isEmail = signUp.unverifiedFields.includes('email_address');
      
      // @ts-ignore
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace('/(drawer)');
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2));
        Alert.alert('Verification failed', 'Unable to complete sign up.');
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert('Verification Error', err.errors?.[0]?.message || err.message || 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const onOauthMissingSubmit = async () => {
    const targetSignUp = pendingOAuthSignUp || signUp;
    if (!targetSignUp || isLoading) return;
    setIsLoading(true);
    try {
      const updatePayload: any = {};
      if (oauthUsername) updatePayload.username = oauthUsername;
      if (targetSignUp.firstName) updatePayload.firstName = targetSignUp.firstName;
      if (targetSignUp.lastName) updatePayload.lastName = targetSignUp.lastName;
      
      const result: any = await targetSignUp.update(updatePayload);
      
      if (result && result.error) {
        Alert.alert('Update Failed', JSON.stringify(result.error, null, 2));
        setIsLoading(false);
        return;
      }
      
      const freshSignUp = result?.status ? result : targetSignUp;

      if (freshSignUp.status === 'complete') {
        await setActive({ session: freshSignUp.createdSessionId });
        router.replace('/(drawer)');
      } else if (freshSignUp.status === 'missing_requirements') {
        if (freshSignUp.unverifiedFields.includes('email_address')) {
          await freshSignUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          setPendingVerification(true);
        } else {
          Alert.alert(
            'Missing Fields', 
            `Unverified: ${JSON.stringify(freshSignUp.unverifiedFields)}\nMissing: ${JSON.stringify(freshSignUp.missingFields)}`
          );
        }
      } else {
        console.log(JSON.stringify(freshSignUp, null, 2));
        Alert.alert(
          `Status: ${freshSignUp.status}`, 
          `Unverified: ${JSON.stringify(freshSignUp.unverifiedFields)}\nMissing: ${JSON.stringify(freshSignUp.missingFields)}`
        );
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert('Error', err.errors?.[0]?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24 }} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {oauthMissingFields ? (
            <View className="items-center mt-10">
               <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center mb-6">
                   <Text className="text-3xl">👤</Text>
               </View>
               <Text className="text-2xl font-semibold text-gray-900 mb-2">Just one more step!</Text>
               <Text className="text-gray-500 mb-8 text-center px-4">Please provide the missing information to complete your Google account setup.</Text>
               
               <TextInput
                  autoCapitalize="none"
                  value={oauthUsername}
                  placeholder="Choose a Username (if missing)"
                  placeholderTextColor="#9ca3af"
                  onChangeText={setOauthUsername}
                  className="bg-white p-4 rounded-xl text-base border border-gray-200 w-full mb-6"
                />
                
                <TouchableOpacity
                  className={`bg-primary p-4 rounded-xl w-full items-center mb-4 ${isLoading ? 'opacity-70' : ''}`}
                  onPress={onOauthMissingSubmit}
                  disabled={isLoading}
                >
                  <Text className="text-white text-base font-semibold">{isLoading ? 'Saving...' : 'Complete Sign Up'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="p-4 rounded-xl w-full items-center"
                  onPress={() => setOauthMissingFields(false)}
                  disabled={isLoading}
                >
                  <Text className="text-gray-500 font-medium">Cancel & Start Over</Text>
                </TouchableOpacity>
            </View>
          ) : pendingVerification ? (
            // Verification UI
            <>
              <View className="items-center mb-12 mt-8">
                <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center mb-6">
                   <Text className="text-3xl">✉️</Text>
                </View>
                <Text className="text-2xl font-semibold text-gray-900 mb-2">Verify Account</Text>
                <Text className="text-gray-500 text-sm text-center px-4">We've sent a verification code to your email. Please check your spam/junk folder if you don't see it.</Text>
              </View>

              <View className="space-y-6">
                <TextInput
                  value={code}
                  placeholder="000000"
                  placeholderTextColor="#d1d5db"
                  onChangeText={setCode}
                  onFocus={() => setFocusedInput('code')}
                  onBlur={() => setFocusedInput('')}
                  className={`bg-white p-4 rounded-xl text-2xl tracking-[0.5em] text-center font-semibold border ${focusedInput === 'code' ? 'border-primary' : 'border-gray-200'}`}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                
                <TouchableOpacity
                  className={`bg-primary p-4 rounded-xl items-center mt-2 ${isLoading ? 'opacity-70' : ''}`}
                  onPress={onPressVerify}
                  disabled={isLoading}
                >
                  <Text className="text-white text-base font-semibold">{isLoading ? 'Verifying...' : 'Verify'}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View className="items-center mb-8">
                <Image
                  source={require('../../../assets/images/logo-image/logo-2.png')}
                  className="w-56 h-24 mb-6"
                  resizeMode="contain"
                />
                <Text className="text-2xl font-semibold text-gray-900 mb-1">Welcome back</Text>
                <Text className="text-gray-500 text-sm">Sign in to Smart Transyt to continue.</Text>
              </View>

              <View className="space-y-4">
                <View>
                  <Text className="text-gray-900 font-bold text-[14px] mb-1 ml-1">Email or Username</Text>
                  <View className={`flex-row items-center bg-white px-4 rounded-2xl border h-[56px] ${focusedInput === 'identifier' ? 'border-primary' : 'border-gray-200'}`}>
                    <SymbolView name="person.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
                    <TextInput
                      autoCapitalize="none"
                      value={identifier}
                      placeholder="Enter your email or username"
                      placeholderTextColor="#9ca3af"
                      onFocus={() => setFocusedInput('identifier')}
                      onBlur={() => setFocusedInput('')}
                      onChangeText={setIdentifier}
                      className="flex-1 text-[16px] text-gray-900 h-full"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-gray-900 font-bold text-[14px] mb-1 ml-1">Password</Text>
                  <View className={`flex-row items-center bg-white px-4 rounded-2xl border h-[56px] ${focusedInput === 'password' ? 'border-primary' : 'border-gray-200'}`}>
                    <SymbolView name="lock.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
                    <TextInput
                      value={password}
                      placeholder="Enter your password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showPassword}
                      onFocus={() => setFocusedInput('password')}
                      onBlur={() => setFocusedInput('')}
                      onChangeText={setPassword}
                      className="flex-1 text-[16px] text-gray-900 h-full"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-2">
                      <SymbolView name={showPassword ? "eye.slash.fill" : "eye.fill"} size={20} tintColor="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity className="self-end mt-1" onPress={() => router.push('/(auth)/forgot-password')}>
                  <Text className="text-primary font-medium text-sm">Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`bg-primary p-4 rounded-xl items-center mt-2 ${(!isLoaded || isLoading) ? 'opacity-50' : ''}`}
                  onPress={onSignInPress}
                  disabled={!isLoaded || isLoading}
                >
                  <Text className="text-white text-base font-semibold">
                    {!isLoaded ? 'Loading...' : isLoading ? 'Signing In...' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center my-6">
                <View className="flex-1 h-[1px] bg-gray-200" />
                <Text className="text-gray-400 font-medium px-4 text-sm">OR</Text>
                <View className="flex-1 h-[1px] bg-gray-200" />
              </View>

              <TouchableOpacity 
                className={`bg-white border border-gray-200 p-4 rounded-xl items-center justify-center flex-row mb-6 ${isLoading ? 'opacity-50' : ''}`}
                onPress={onPressGoogle}
                disabled={isLoading}
              >
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} className="w-5 h-5 mr-3" />
                <Text className="font-semibold text-gray-700 text-base">{isLoading ? 'Loading...' : 'Continue with Google'}</Text>
              </TouchableOpacity>

              <View className="flex-row justify-center mt-auto pt-4">
                <Text className="text-gray-600 text-sm">Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
                  <Text className="text-primary font-semibold text-sm">Sign up</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
