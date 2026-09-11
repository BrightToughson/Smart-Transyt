import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { SymbolView } from 'expo-symbols';
import { useTripStore, useWalletStore } from '@/store';

export default function PaymentScreen() {
  const router = useRouter();
  const { paymentMethod, estimatedFare, resetTrip } = useTripStore();
  const { balance, deductFunds } = useWalletStore();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  useFocusEffect(
    useCallback(() => {
      setStatus('idle');
      setPhoneNumber('');
    }, [])
  );

  const handlePayment = () => {
    setStatus('processing');
    
    // Simulate API delay
    setTimeout(() => {
      if (paymentMethod === 'wallet') {
        deductFunds(estimatedFare);
      }
      setStatus('success');
      
      setTimeout(() => {
        resetTrip();
        router.back();
      }, 1500);
      
    }, 2000);
  };

  if (status === 'success') {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-6">
          <SymbolView name="checkmark" size={40} tintColor="#22c55e" weight="bold" />
        </View>
        <Text className="text-[28px] font-black text-gray-900 mb-2">
          {paymentMethod === 'cash' ? 'Trip Confirmed!' : 'Payment Successful!'}
        </Text>
        <Text className="text-gray-500 text-[16px] text-center px-6">
          {paymentMethod === 'cash' 
            ? `Please pay GHC ${estimatedFare.toFixed(2)} to the driver upon boarding.` 
            : `GHC ${estimatedFare.toFixed(2)} paid via ${paymentMethod === 'wallet' ? 'Wallet' : 'MoMo'}`}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View className="flex-row items-center px-6 py-4">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
              disabled={status === 'processing'}
            >
              <SymbolView name="chevron.left" size={20} tintColor="#111827" />
            </TouchableOpacity>
            <Text className="flex-1 text-center text-[18px] font-bold text-gray-900 pr-10">
              {paymentMethod === 'cash' ? 'Confirm Trip' : 'Checkout'}
            </Text>
          </View>

          {/* Content */}
          <View className="px-6 pt-6 flex-1">
            {/* Amount display */}
            <View className="items-center mb-10">
              <Text className="text-gray-400 font-bold uppercase tracking-widest text-[12px] mb-2">Total Amount</Text>
              <Text className="text-[48px] font-black text-gray-900 tracking-tighter">GHC {estimatedFare.toFixed(2)}</Text>
            </View>

            {/* Method Details */}
            <Text className="text-[18px] font-bold text-gray-900 mb-4">Payment Details</Text>
            
            <View className="bg-gray-50 rounded-3xl p-5 border border-gray-100 mb-6">
              <View className="flex-row items-center mb-4 pb-4 border-b border-gray-200">
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                  paymentMethod === 'wallet' ? 'bg-blue-100' : 
                  paymentMethod === 'momo' ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  <SymbolView 
                    name={paymentMethod === 'wallet' ? "creditcard.fill" : paymentMethod === 'momo' ? "iphone" : "banknote"} 
                    size={24} 
                    tintColor={paymentMethod === 'wallet' ? "#3b82f6" : paymentMethod === 'momo' ? "#eab308" : "#22c55e"} 
                  />
                </View>
                <View>
                  <Text className="text-[16px] font-bold text-gray-900">
                    {paymentMethod === 'wallet' ? 'Smart Wallet' : paymentMethod === 'momo' ? 'Mobile Money' : 'Cash on Boarding'}
                  </Text>
                  <Text className="text-[13px] text-gray-500">
                    {paymentMethod === 'wallet' ? 'Instant deduction' : paymentMethod === 'momo' ? 'Network provider charge' : 'Pay driver directly'}
                  </Text>
                </View>
              </View>

              {paymentMethod === 'wallet' ? (
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600 font-medium">Available Balance</Text>
                  <Text className={`font-bold text-[16px] ${balance >= estimatedFare ? 'text-gray-900' : 'text-red-500'}`}>
                    GHC {balance.toFixed(2)}
                  </Text>
                </View>
              ) : paymentMethod === 'momo' ? (
                <View>
                  <Text className="text-gray-600 font-medium mb-2">MoMo Number</Text>
                  <TextInput
                    className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-[16px] font-medium text-gray-900"
                    placeholder="e.g. 024 123 4567"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    editable={status !== 'processing'}
                  />
                </View>
              ) : (
                <View>
                  <Text className="text-gray-600 font-medium leading-relaxed">
                    Please ensure you have the exact amount of <Text className="font-bold text-gray-900">GHC {estimatedFare.toFixed(2)}</Text> ready to pay the driver upon boarding the bus.
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-1" />

            {/* Pay Button */}
            <TouchableOpacity
              onPress={handlePayment}
              disabled={status === 'processing' || (paymentMethod === 'wallet' && balance < estimatedFare) || (paymentMethod === 'momo' && phoneNumber.length < 9)}
              className={`h-[60px] rounded-2xl flex-row items-center justify-center shadow-lg mb-8 ${status === 'processing' ? 'bg-blue-400' : 'bg-primary shadow-primary/30'}`}
              style={{ opacity: (paymentMethod === 'wallet' && balance < estimatedFare) || (paymentMethod === 'momo' && phoneNumber.length < 9) ? 0.5 : 1 }}
            >
              {status === 'processing' ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text className="text-white text-[18px] font-bold mr-2">
                    {paymentMethod === 'cash' ? 'Paid' : `Pay GHC ${estimatedFare.toFixed(2)}`}
                  </Text>
                  <SymbolView name={paymentMethod === 'cash' ? "checkmark" : "lock.fill"} size={16} tintColor="#ffffff" weight="bold" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
