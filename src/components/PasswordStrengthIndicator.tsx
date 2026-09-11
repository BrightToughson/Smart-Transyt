import React from 'react';
import { View, Text } from 'react-native';
import { SymbolView } from 'expo-symbols';

interface Props {
  password?: string;
}

export const isPasswordStrong = (password: string) => {
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[a-z]/.test(password) &&
         /[0-9]/.test(password) &&
         /[^A-Za-z0-9]/.test(password);
};

export default function PasswordStrengthIndicator({ password = '' }: Props) {
  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  if (!password) return null;

  return (
    <View className="mt-1 mb-4 space-y-2 px-2 bg-gray-50 p-4 rounded-xl">
      <Text className="text-gray-900 font-semibold mb-1">Password Requirements:</Text>
      {requirements.map((req, index) => (
        <View key={index} className="flex-row items-center">
          <SymbolView 
            name={req.met ? 'checkmark.circle.fill' : 'circle'} 
            size={16} 
            tintColor={req.met ? '#10b981' : '#9ca3af'} 
            style={{ marginRight: 8 }}
          />
          <Text className={`text-[13px] font-medium ${req.met ? 'text-green-500' : 'text-gray-500'}`}>
            {req.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
