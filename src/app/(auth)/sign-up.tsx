import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignUp, useOAuth, useClerk } from '@clerk/expo';
import { useRouter } from 'expo-router';
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

export default function SignUp() {
  useWarmUpBrowser();
  // @ts-ignore
  const { isLoaded, signUp, setActive } = useSignUp();
  const clerk = useClerk();
  const router = useRouter();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  // Form State
  const [identifier, setIdentifier] = useState(''); // Email
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // UI State
  const [focusedInput, setFocusedInput] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthMissingFields, setOauthMissingFields] = useState(false);
  const [oauthUsername, setOauthUsername] = useState('');

  // Traditional Sign Up
  const onSignUpPress = async () => {
    if (!isLoaded || isLoading) return;
    setIsLoading(true);

    try {
      let formattedPhone = phoneNumber.replace(/^0+/, '');
      if (formattedPhone && !formattedPhone.startsWith('+')) {
        formattedPhone = `+233${formattedPhone}`;
      }

      const payload: any = {
        emailAddress: identifier,
        username,
        password,
        unsafeMetadata: {
          phoneNumber: formattedPhone
        }
      };

      await signUp.create(payload);

      // @ts-ignore
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      
      setPendingVerification(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert('Sign Up Error', err.errors?.[0]?.message || err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Verification
  const onPressVerify = async () => {
    if (!isLoaded || isLoading) return;
    setIsLoading(true);

    try {
      // @ts-ignore
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });

      // @ts-ignore
      if (completeSignUp.status === 'complete') {
        // @ts-ignore
        await setActive({ session: completeSignUp.createdSessionId });
        // @ts-ignore
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

  // OAuth Flow
  const onPressGoogle = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { createdSessionId, setActive: setOAuthActive, signIn, signUp: oAuthSignUp } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/(drawer)', { scheme: 'smarttransyt' }),
      });

      if (createdSessionId) {
        // @ts-ignore
        await setOAuthActive({ session: createdSessionId });
        router.replace('/(drawer)');
      } else {
        if (signIn?.createdSessionId) {
          // @ts-ignore
          await setOAuthActive({ session: signIn.createdSessionId });
          router.replace('/(drawer)');
        } else if (oAuthSignUp?.createdSessionId) {
          // @ts-ignore
          await setOAuthActive({ session: oAuthSignUp.createdSessionId });
          router.replace('/(drawer)');
        } else if (oAuthSignUp?.status === 'missing_requirements') {
          setOauthMissingFields(true);
        } else {
          Alert.alert(
            'Incomplete Sign Up', 
            `Status -> SignIn: ${signIn?.status}, SignUp: ${oAuthSignUp?.status}. Your Clerk dashboard might be asking for extra required fields (like Username or Phone).`
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

  const onOauthMissingSubmit = async () => {
    if (!signUp || isLoading) return;
    setIsLoading(true);
    try {
      const updatePayload: any = {};
      if (oauthUsername) updatePayload.username = oauthUsername;
      
      const result: any = await signUp.update(updatePayload);
      
      if (result && result.error) {
        Alert.alert('Update Failed', JSON.stringify(result.error, null, 2));
        setIsLoading(false);
        return;
      }
      
      // If result is the updated resource itself (clerk-js standard), use it, otherwise use freshSignUp
      const freshSignUp = result?.status ? result : clerk.client.signUp;

      if (freshSignUp.status === 'complete') {
        // @ts-ignore
        await setActive({ session: freshSignUp.createdSessionId });
        router.replace('/(drawer)');
      } else if (freshSignUp.status === 'missing_requirements') {
        if (freshSignUp.unverifiedFields.includes('email_address')) {
          // @ts-ignore
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
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          
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
          ) : !pendingVerification ? (
            <>
              <View className="items-center mb-8">
                <Image
                  source={require('../../../assets/images/logo-image/logo-2.png')}
                  className="w-56 h-24 mb-6"
                  resizeMode="contain"
                />
                <Text className="text-2xl font-semibold text-gray-900 mb-1">Create an account</Text>
                <Text className="text-gray-500 text-sm">Join Smart Transyt today.</Text>
              </View>

              <View className="space-y-4">
                <View>
                  <TextInput
                    autoCapitalize="none"
                    value={identifier}
                    placeholder="Email Address"
                    placeholderTextColor="#9ca3af"
                    onFocus={() => setFocusedInput('identifier')}
                    onBlur={() => setFocusedInput('')}
                    onChangeText={setIdentifier}
                    keyboardType="email-address"
                    className={`bg-white p-4 rounded-xl text-base border ${focusedInput === 'identifier' ? 'border-primary' : 'border-gray-200'}`}
                  />
                </View>

                <View className="flex-row items-center bg-white px-4 rounded-xl border border-gray-200 w-full h-14">
                   <Text className="text-gray-900 text-base font-semibold mr-2">+233</Text>
                   <TextInput
                     autoCapitalize="none"
                     value={phoneNumber}
                     placeholder="Phone Number (e.g. 541234567)"
                     placeholderTextColor="#9ca3af"
                     onFocus={() => setFocusedInput('phoneNumber')}
                     onBlur={() => setFocusedInput('')}
                     onChangeText={setPhoneNumber}
                     keyboardType="phone-pad"
                     className={`flex-1 text-base text-gray-900 h-full`}
                   />
                </View>

                <View>
                  <TextInput
                    autoCapitalize="none"
                    value={username}
                    placeholder="Username"
                    placeholderTextColor="#9ca3af"
                    onFocus={() => setFocusedInput('username')}
                    onBlur={() => setFocusedInput('')}
                    onChangeText={setUsername}
                    className={`bg-white p-4 rounded-xl text-base border ${focusedInput === 'username' ? 'border-primary' : 'border-gray-200'}`}
                  />
                </View>

                <View>
                  <TextInput
                    value={password}
                    placeholder="Password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={true}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput('')}
                    onChangeText={setPassword}
                    className={`bg-white p-4 rounded-xl text-base border ${focusedInput === 'password' ? 'border-primary' : 'border-gray-200'}`}
                  />
                </View>

                <TouchableOpacity
                  className={`bg-primary p-4 rounded-xl items-center mt-4 ${isLoading ? 'opacity-70' : ''}`}
                  onPress={onSignUpPress}
                  disabled={isLoading}
                >
                  <Text className="text-white text-base font-semibold">{isLoading ? 'Processing...' : 'Sign Up'}</Text>
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
                <Text className="text-gray-600 text-sm">Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
                  <Text className="text-primary font-semibold text-sm">Sign in</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // Verification UI
            <>
              <View className="items-center mb-12 mt-8">
                <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center mb-6">
                   <Text className="text-3xl">✉️</Text>
                </View>
                <Text className="text-2xl font-semibold text-gray-900 mb-2">Verify Account</Text>
                <Text className="text-gray-500 text-sm text-center px-4">We've sent a verification code to your email.</Text>
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
                
                <View className="flex-row justify-center mt-4">
                  <Text className="text-gray-500 text-sm">Didn't receive the code? </Text>
                  <TouchableOpacity onPress={onSignUpPress}>
                    <Text className="text-primary font-semibold text-sm">Resend</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
