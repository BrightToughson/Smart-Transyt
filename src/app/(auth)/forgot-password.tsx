import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import PasswordStrengthIndicator, { isPasswordStrong } from '../../components/PasswordStrengthIndicator';

export default function ForgotPassword() {
  // @ts-ignore
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Send the reset code to the user's email
  const onRequestReset = async () => {
    if (!isLoaded) {
      Alert.alert('Error', 'Clerk is not fully loaded yet. Please wait a moment.');
      return;
    }
    if (isLoading) return;
    setIsLoading(true);

    try {
      // @ts-ignore
      await signIn.create({
        // @ts-ignore
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setSuccessfulCreation(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert('Error', err.errors?.[0]?.message || err.message || 'Could not send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify the code and set the new password
  const onResetPassword = async () => {
    if (!isLoaded || isLoading) return;
    
    if (password !== confirmPassword) {
      Alert.alert('Passwords Mismatch', 'Your new passwords do not match.');
      return;
    }

    if (!isPasswordStrong(password)) {
      Alert.alert('Weak Password', 'Please ensure your new password meets all the requirements.');
      return;
    }

    setIsLoading(true);

    try {
      // @ts-ignore
      const result = await signIn.attemptFirstFactor({
        // @ts-ignore
        strategy: 'reset_password_email_code',
        code,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        Alert.alert('Success', 'Password reset successfully!');
        router.replace('/(drawer)');
      } else {
        console.log(result);
        Alert.alert('Error', 'Unable to complete password reset.');
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert('Error', err.errors?.[0]?.message || err.message || 'Reset failed.');
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
          
          <View className="items-center mb-8">
            <Image
              source={require('../../../assets/images/logo-image/logo-2.png')}
              className="w-56 h-24 mb-6"
              resizeMode="contain"
            />
            <Text className="text-2xl font-semibold text-gray-900 mb-1">Reset Password</Text>
            <Text className="text-gray-500 text-sm text-center px-4">
              {successfulCreation ? 'Enter the verification code and your new password.' : 'Enter your email address to receive a password reset code.'}
            </Text>
          </View>

          {!successfulCreation ? (
            <View className="space-y-4">
              <View>
                <Text className="text-gray-900 font-bold text-[14px] mb-1 ml-1">Email Address</Text>
                <View className={`flex-row items-center bg-white px-4 rounded-2xl border h-[56px] ${focusedInput === 'email' ? 'border-primary' : 'border-gray-200'}`}>
                  <SymbolView name="envelope.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
                  <TextInput
                    autoCapitalize="none"
                    value={email}
                    placeholder="Enter your email"
                    placeholderTextColor="#9ca3af"
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput('')}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    className="flex-1 text-[16px] text-gray-900 h-full"
                  />
                </View>
              </View>

              <TouchableOpacity
                className={`bg-primary p-4 rounded-xl items-center mt-4 ${isLoading ? 'opacity-70' : ''}`}
                onPress={onRequestReset}
                disabled={isLoading}
              >
                <Text className="text-white text-base font-semibold">{isLoading ? 'Sending...' : 'Send Reset Code'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-4">
              <View>
                <Text className="text-gray-900 font-bold text-[14px] mb-1 ml-1">Verification Code</Text>
                <View className={`flex-row items-center bg-white px-4 rounded-2xl border h-[56px] ${focusedInput === 'code' ? 'border-primary' : 'border-gray-200'}`}>
                  <SymbolView name="number" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
                  <TextInput
                    value={code}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#9ca3af"
                    onFocus={() => setFocusedInput('code')}
                    onBlur={() => setFocusedInput('')}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    className="flex-1 text-[16px] text-gray-900 h-full tracking-widest font-semibold"
                  />
                </View>
              </View>

              <View>
                <Text className="text-gray-900 font-bold text-[14px] mb-1 ml-1">New Password</Text>
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
                <Text className="text-gray-900 font-bold text-[14px] mb-1 ml-1">Confirm New Password</Text>
                <View className={`flex-row items-center bg-white px-4 rounded-2xl border h-[56px] ${focusedInput === 'confirmPassword' ? 'border-primary' : 'border-gray-200'} ${password && confirmPassword && password !== confirmPassword ? 'border-red-500' : ''}`}>
                  <SymbolView name="lock.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
                  <TextInput
                    value={confirmPassword}
                    placeholder="Re-enter your new password"
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
                className={`bg-primary p-4 rounded-xl items-center mt-2 ${isLoading ? 'opacity-70' : ''}`}
                onPress={onResetPassword}
                disabled={isLoading}
              >
                <Text className="text-white text-base font-semibold">{isLoading ? 'Resetting...' : 'Reset Password'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="flex-row justify-center mt-auto pt-8">
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
              <Text className="text-gray-500 font-medium text-base">Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
