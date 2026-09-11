import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';

export default function Settings() {
  const router = useRouter();

  const ActionRow = ({ icon, title, subtitle, onPress, color = "#6b7280", isLast = false }: any) => (
    <TouchableOpacity 
      className={`flex-row items-center py-4 ${!isLast ? 'border-b border-gray-100' : ''}`}
      onPress={onPress}
    >
      <View className="w-10 h-10 rounded-full items-center justify-center mr-4" style={{ backgroundColor: `${color}15` }}>
        <SymbolView name={icon} size={20} tintColor={color} />
      </View>
      <View className="flex-1">
        <Text className="text-gray-900 font-bold text-[16px]">{title}</Text>
        {subtitle && <Text className="text-gray-500 text-[13px] mt-0.5">{subtitle}</Text>}
      </View>
      <SymbolView name="chevron.right" size={16} tintColor="#d1d5db" />
    </TouchableOpacity>
  );

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

      {/* Account Settings */}
      <View className="mb-8">
        <Text className="text-gray-400 font-bold uppercase tracking-widest text-[12px] mb-2 px-2">Account</Text>
        <View className="bg-white rounded-3xl px-5 shadow-sm shadow-black/5 border border-gray-100">
          <ActionRow 
            icon="creditcard.fill" 
            title="Payment Methods" 
            subtitle="Manage MoMo and cards"
            color="#f59e0b"
            onPress={() => router.push('/(drawer)/payment-methods')}
          />
          <ActionRow 
            icon="globe" 
            title="Language" 
            subtitle="English (US)"
            color="#0ea5e9"
            isLast={true}
            onPress={() => Alert.alert('Language', 'English is currently the only supported language.')}
          />
        </View>
      </View>

      {/* About Section */}
      <View className="mb-4">
        <Text className="text-gray-400 font-bold uppercase tracking-widest text-[12px] mb-2 px-2">Information</Text>
        <View className="bg-white rounded-3xl px-5 shadow-sm shadow-black/5 border border-gray-100">
          <ActionRow 
            icon="doc.text.fill" 
            title="Terms of Service" 
            onPress={() => Linking.openURL('https://www.smarttransyt.com/terms').catch(() => {})}
          />
          <ActionRow 
            icon="hand.raised.fill" 
            title="Privacy Policy" 
            isLast={true}
            onPress={() => Linking.openURL('https://www.smarttransyt.com/privacy').catch(() => {})}
          />
        </View>
      </View>

      <Text className="text-center text-gray-400 font-medium text-[13px] mt-6">Smart Transyt v1.0.0</Text>
    </ScrollView>
  );
}
