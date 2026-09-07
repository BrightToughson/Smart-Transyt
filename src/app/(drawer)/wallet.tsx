import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useWalletStore } from '@/store';
import { Paystack } from 'react-native-paystack-webview';


export default function Wallet() {
  const balance = useWalletStore((state) => state.balance);
  const addFunds = useWalletStore((state) => state.addFunds);
  
  const [amount, setAmount] = useState('');
  const [isPaystackOpen, setIsPaystackOpen] = useState(false);

  const handleDeposit = () => {
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to deposit.');
      return;
    }
    setIsPaystackOpen(true);
  };

  return (
    <View className="flex-1 bg-white p-6">
      <View className="bg-primary rounded-2xl p-6 items-center shadow-lg mb-8">
        <Text className="text-white text-lg opacity-90 mb-2">Available Balance</Text>
        <Text className="text-white text-4xl font-bold">GHC {balance.toFixed(2)}</Text>
      </View>

      <Text className="text-xl font-bold text-gray-900 mb-4">Add Funds</Text>
      
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="Enter amount (GHC)"
        keyboardType="numeric"
        className="bg-gray-100 p-4 rounded-xl text-lg mb-6"
      />

      <TouchableOpacity
        className="bg-secondary p-4 rounded-xl items-center shadow-md"
        onPress={handleDeposit}
      >
        <Text className="text-white text-lg font-bold">Top Up with Paystack</Text>
      </TouchableOpacity>

      {isPaystackOpen && (
        <Paystack
          paystackKey={process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_dummy"}
          billingEmail="user@smarttransyt.com"
          amount={parseFloat(amount)}
          onCancel={(e: any) => {
            setIsPaystackOpen(false);
            Alert.alert("Payment Cancelled", "You cancelled the payment.");
          }}
          onSuccess={(res: any) => {
            setIsPaystackOpen(false);
            addFunds(parseFloat(amount));
            setAmount('');
            Alert.alert("Success", "Funds added successfully!");
          }}
          autoStart={true}
        />
      )}
    </View>
  );
}
