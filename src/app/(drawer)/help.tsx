import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SymbolView } from 'expo-symbols';

export default function Help() {
  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('An error occurred', err));
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20 }}>
      
      {/* Header text */}
      <View className="mb-6 mt-2 flex-row items-center">
        <Text className="text-2xl font-bold text-gray-900 mr-2">Help/Support</Text>
        <SymbolView name="questionmark.circle.fill" size={24} tintColor="#1A4996" />
      </View>

      {/* Support Info Box */}
      <View className="bg-white rounded-xl p-5 border-2 border-blue-400 mb-8 shadow-sm shadow-blue-100">
        <View className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center mb-4">
          <SymbolView name="info" size={16} tintColor="white" weight="bold" />
        </View>
        
        <Text className="text-blue-400 font-medium text-[15px] leading-relaxed mb-5">
          SmartTransyt support hours are from 6:00 AM to 10:30 PM, Monday to Friday.
        </Text>

        {/* Email */}
        <TouchableOpacity 
          className="flex-row items-center mb-3"
          onPress={() => openLink('mailto:support@smarttransyt.com')}
        >
          <Text className="text-blue-500 font-bold text-[15px] mr-2">support@smarttransyt.com</Text>
          <SymbolView name="arrow.up.right.square" size={14} tintColor="#3b82f6" />
        </TouchableOpacity>

        {/* Whatsapp */}
        <TouchableOpacity 
          className="flex-row items-center mb-3"
          onPress={() => openLink('https://wa.me/233531022770')}
        >
          <Text className="text-blue-500 font-bold text-[15px] mr-2">Whatsapp +233 53 102 2770</Text>
          <SymbolView name="arrow.up.right.square" size={14} tintColor="#3b82f6" />
        </TouchableOpacity>

        {/* Phone */}
        <TouchableOpacity 
          className="flex-row items-center"
          onPress={() => openLink('tel:+233531022770')}
        >
          <Text className="text-blue-500 font-bold text-[15px] mr-2">053 102 2770 / +233 53 102 2770</Text>
          <SymbolView name="arrow.up.right.square" size={14} tintColor="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Links Section */}
      <Text className="text-gray-900 font-bold text-lg mb-4">Links</Text>
      
      <TouchableOpacity 
        className="flex-row items-center"
        onPress={() => openLink('https://www.smarttransyt.com/story')}
      >
        <Text className="text-blue-500 font-bold text-[16px] mr-2">About SmartTransyt</Text>
        <SymbolView name="arrow.up.right.square" size={16} tintColor="#3b82f6" />
      </TouchableOpacity>
      
    </ScrollView>
  );
}
