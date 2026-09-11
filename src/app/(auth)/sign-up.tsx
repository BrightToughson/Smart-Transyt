import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignUp, useOAuth, useClerk } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import PasswordStrengthIndicator, { isPasswordStrong } from '../../components/PasswordStrengthIndicator';

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
  const clerk = useClerk();
  const isLoaded = clerk.loaded;
  const signUp = clerk.client?.signUp;
  const setActive = clerk.setActive;
  
  const router = useRouter();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  // Form State
  const [identifier, setIdentifier] = useState(''); // Email
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI State
  const [focusedInput, setFocusedInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthMissingFields, setOauthMissingFields] = useState(false);
  const [oauthUsername, setOauthUsername] = useState('');
  const [pendingOAuthSignUp, setPendingOAuthSignUp] = useState<any>(null);

  // Traditional Sign Up
  const onSignUpPress = async () => {
    if (!isLoaded || isLoading) return;
    
    if (password !== confirmPassword) {
      Alert.alert('Passwords Mismatch', 'Your passwords do not match. Please try again.');
      return;
    }

    if (!isPasswordStrong(password)) {
      Alert.alert('Weak Password', 'Please ensure your password meets all the requirements.');
      return;
    }

    setIsLoading(true);

    try {
      const formattedPhone = `+233${phoneNumber}`;

      const payload: any = {
        emailAddress: identifier,
        username,
        password,
        unsafeMetadata: {
          phoneNumber: formattedPhone,
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
          setPendingOAuthSignUp(oAuthSignUp);
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
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 }} 
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
                  <Text className="text-gray-900 font-bold text-[14px] mb-1 ml-1">Email Address</Text>
                  <View className={`flex-row items-center bg-white px-4 rounded-2xl border h-[56px] ${focusedInput === 'identifier' ? 'border-primary' : 'border-gray-200'}`}>
                    <SymbolView name="envelope.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
                    <TextInput
                      autoCapitalize="none"
                      value={identifier}
                      placeholder="Enter your email"
                      placeholderTextColor="#9ca3af"
                      onFocus={() => setFocusedInput('identifier')}
                      onBlur={() => setFocusedInput('')}
                      onChangeText={setIdentifier}
                      keyboardType="email-address"
                      className="flex-1 text-[16px] text-gray-900 h-full"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-gray-900 font-bold text-[14px] mb-1 ml-1">Phone Number</Text>
                  <View className={`flex-row items-center bg-white px-4 rounded-2xl border h-[56px] ${focusedInput === 'phoneNumber' ? 'border-primary' : 'border-gray-200'}`}>
                     <SymbolView name="phone.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
                     <Text className="text-gray-900 text-[16px] font-semibold mr-2">+233</Text>
                     <TextInput
                       autoCapitalize="none"
                       value={phoneNumber}
                       placeholder="541 234 567"
                       placeholderTextColor="#9ca3af"
                       onFocus={() => setFocusedInput('phoneNumber')}
                       onBlur={() => setFocusedInput('')}
                       onChangeText={(text) => {
                         let val = text.replace(/[^0-9]/g, '');
                         if (val.startsWith('0')) val = val.substring(1);
                         setPhoneNumber(val);
                       }}
                       keyboardType="phone-pad"
                       maxLength={9}
                       className="flex-1 text-[16px] text-gray-900 h-full"
                     />
                  </View>
                </View>

                <View>
                  <Text className="text-gray-900 font-bold text-[14px] mb-1 ml-1">Username</Text>
                  <View className={`flex-row items-center bg-white px-4 rounded-2xl border h-[56px] ${focusedInput === 'username' ? 'border-primary' : 'border-gray-200'}`}>
                    <SymbolView name="person.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
                    <TextInput
                      autoCapitalize="none"
                      value={username}
                      placeholder="Choose a username"
                      placeholderTextColor="#9ca3af"
                      onFocus={() => setFocusedInput('username')}
                      onBlur={() => setFocusedInput('')}
                      onChangeText={setUsername}
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
                      placeholder="Enter a strong password"
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
                  <PasswordStrengthIndicator password={password} />
                </View>

                <View>
                  <Text className="text-gray-900 font-bold text-[14px] mb-1 ml-1">Confirm Password</Text>
                  <View className={`flex-row items-center bg-white px-4 rounded-2xl border h-[56px] ${focusedInput === 'confirmPassword' ? 'border-primary' : 'border-gray-200'} ${password && confirmPassword && password !== confirmPassword ? 'border-red-500' : ''}`}>
                    <SymbolView name="lock.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
                    <TextInput
                      value={confirmPassword}
                      placeholder="Re-enter your password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showConfirmPassword}
                      onFocus={() => setFocusedInput('confirmPassword')}
                      onBlur={() => setFocusedInput('')}
                      onChangeText={setConfirmPassword}
                      className="flex-1 text-[16px] text-gray-900 h-full"
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-2">
                      <SymbolView name={showConfirmPassword ? "eye.slash.fill" : "eye.fill"} size={20} tintColor="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                  {password !== '' && confirmPassword !== '' && password !== confirmPassword && (
                    <Text className="text-red-500 text-xs mt-1 ml-1 font-medium">Passwords do not match</Text>
                  )}
                  {password !== '' && confirmPassword !== '' && password === confirmPassword && (
                    <Text className="text-green-500 text-xs mt-1 ml-1 font-medium">Passwords match</Text>
                  )}
                </View>

                <TouchableOpacity
                  className={`bg-primary p-4 rounded-xl items-center mt-2 ${(!isLoaded || isLoading) ? 'opacity-50' : ''}`}
                  onPress={onSignUpPress}
                  disabled={!isLoaded || isLoading}
                >
                  <Text className="text-white text-base font-semibold">
                    {!isLoaded ? 'Loading...' : isLoading ? 'Processing...' : 'Sign Up'}
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
