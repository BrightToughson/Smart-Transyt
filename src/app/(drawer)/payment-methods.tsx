import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { SymbolView } from 'expo-symbols';

export default function PaymentMethods() {
  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View className="mb-8">
        <Text className="text-gray-900 text-2xl font-black mb-2">Payment Methods</Text>
        <Text className="text-gray-500 text-sm">Manage how you pay for your rides and wallet top-ups.</Text>
      </View>

      <Text className="text-gray-400 font-bold uppercase tracking-widest text-[12px] mb-3 px-2">Saved Methods</Text>
      
      <View className="bg-white rounded-3xl p-5 border border-gray-100 mb-6 shadow-sm shadow-black/5 space-y-4">
        
        {/* Mobile Money */}
        <TouchableOpacity className="flex-row items-center py-2">
          <View className="w-12 h-12 rounded-full bg-yellow-50 items-center justify-center mr-4 border border-yellow-100">
            <SymbolView name="candybarphone" size={24} tintColor="#eab308" />
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 font-bold text-[16px]">Mobile Money</Text>
            <Text className="text-gray-500 text-[13px] mt-0.5">Primary • MTN MoMo</Text>
          </View>
          <SymbolView name="checkmark.circle.fill" size={20} tintColor="#22c55e" />
        </TouchableOpacity>

        <View className="h-[1px] bg-gray-100 w-full" />

        {/* Credit Card */}
        <TouchableOpacity className="flex-row items-center py-2">
          <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mr-4 border border-blue-100">
            <SymbolView name="creditcard.fill" size={24} tintColor="#3b82f6" />
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 font-bold text-[16px]">Visa Card</Text>
            <Text className="text-gray-500 text-[13px] mt-0.5">**** **** **** 4242</Text>
          </View>
          <SymbolView name="chevron.right" size={16} tintColor="#d1d5db" />
        </TouchableOpacity>

      </View>

      <TouchableOpacity 
        className="bg-primary/10 py-4 px-5 rounded-2xl flex-row items-center justify-center border border-primary/20 border-dashed"
        onPress={() => {
          Alert.alert(
            'Add Payment Method',
            'Select the type of payment method you want to add:',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Credit/Debit Card', onPress: () => Alert.alert('Coming Soon', 'Card integration will be added here.') },
              { text: 'Mobile Money (MoMo)', onPress: () => Alert.alert('Coming Soon', 'MoMo integration will be added here.') }
            ]
          );
        }}
      >
        <SymbolView name="plus.circle.fill" size={20} tintColor="#1A4996" style={{ marginRight: 8 }} />
        <Text className="text-primary font-bold text-[16px]">Add New Payment Method</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}
