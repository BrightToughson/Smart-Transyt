import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import PasswordStrengthIndicator, { isPasswordStrong } from '../../components/PasswordStrengthIndicator';

export default function ChangePassword() {
  const { user } = useUser();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    
    if (!isPasswordStrong(newPassword)) {
      Alert.alert('Weak Password', 'Please ensure your new password meets all the requirements.');
      return;
    }

    if (user?.passwordEnabled && !currentPassword) {
      Alert.alert('Error', 'Please enter your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    setIsUpdating(true);
    try {
      if (user?.passwordEnabled) {
        await user?.updatePassword({
          currentPassword,
          newPassword,
        });
      } else {
        await user?.updatePassword({
          newPassword,
        });
      }
      Alert.alert('Success', 'Your password has been updated successfully.', [
        { text: 'OK', onPress: () => router.push('/(drawer)/profile') }
      ]);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to update password. Please check your current password and try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView 
        className="flex-1 bg-gray-50" 
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
      <Text className="text-gray-900 font-black text-2xl mb-2">Change Password</Text>
      <Text className="text-gray-500 text-[15px] mb-8">
        {user?.passwordEnabled 
          ? "Choose a strong, unique password to secure your account." 
          : "You signed in using a third-party account (like Google). Set a password to also allow signing in with your email."}
      </Text>

      {/* Current Password (Only if already has password) */}
      {user?.passwordEnabled && (
        <View className="mb-5">
        <Text className="text-gray-900 font-bold text-[14px] mb-2 ml-1">Current Password</Text>
        <View className="bg-white rounded-2xl flex-row items-center h-[56px] px-4 border border-gray-200 focus:border-primary">
          <SymbolView name="lock.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
          <TextInput
            className="flex-1 text-[16px] text-gray-900 h-full"
            placeholder="Enter current password"
            placeholderTextColor="#9ca3af"
            secureTextEntry={!showCurrent}
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} className="p-2">
            <SymbolView name={showCurrent ? "eye.slash.fill" : "eye.fill"} size={20} tintColor="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>
      )}

      {/* New Password */}
      <View className="mb-5">
        <Text className="text-gray-900 font-bold text-[14px] mb-2 ml-1">New Password</Text>
        <View className="bg-white rounded-2xl flex-row items-center h-[56px] px-4 border border-gray-200 focus:border-primary">
          <SymbolView name="lock.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
          <TextInput
            className="flex-1 text-[16px] text-gray-900 h-full"
            placeholder="Enter new password"
            placeholderTextColor="#9ca3af"
            secureTextEntry={!showNew}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity onPress={() => setShowNew(!showNew)} className="p-2">
            <SymbolView name={showNew ? "eye.slash.fill" : "eye.fill"} size={20} tintColor="#9ca3af" />
          </TouchableOpacity>
        </View>
        <PasswordStrengthIndicator password={newPassword} />
      </View>

      {/* Confirm New Password */}
      <View className="mb-8">
        <Text className="text-gray-900 font-bold text-[14px] mb-2 ml-1">Confirm New Password</Text>
        <View className="bg-white rounded-2xl flex-row items-center h-[56px] px-4 border border-gray-200 focus:border-primary">
          <SymbolView name="lock.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
          <TextInput
            className="flex-1 text-[16px] text-gray-900 h-full"
            placeholder="Confirm new password"
            placeholderTextColor="#9ca3af"
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} className="p-2">
            <SymbolView name={showConfirm ? "eye.slash.fill" : "eye.fill"} size={20} tintColor="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity
        className={`h-[56px] rounded-2xl flex-row items-center justify-center shadow-lg shadow-primary/30 ${isUpdating ? 'bg-blue-400' : 'bg-primary'}`}
        onPress={handleUpdatePassword}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Text className="text-white text-[16px] font-bold mr-2">
              {user?.passwordEnabled ? 'Update Password' : 'Set Password'}
            </Text>
            <SymbolView name="checkmark.shield.fill" size={18} tintColor="white" />
          </>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        className="h-[56px] rounded-2xl flex-row items-center justify-center mt-4 border border-gray-200 bg-white"
        onPress={() => router.push('/(drawer)/profile')}
        disabled={isUpdating}
      >
        <Text className="text-gray-600 text-[16px] font-bold">Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
