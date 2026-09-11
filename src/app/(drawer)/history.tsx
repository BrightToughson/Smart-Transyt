import { View, Text, ScrollView } from 'react-native';
import { useHistoryStore } from '@/store';
import { SymbolView } from 'expo-symbols';

export default function History() {
  const history = useHistoryStore((state) => state.history);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-6 pt-10 pb-4 bg-white shadow-sm border-b border-gray-100">
        <Text className="text-3xl font-black text-gray-900 tracking-tight">Travel History</Text>
      </View>
      
      {history.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
            <SymbolView name="clock.arrow.circlepath" size={32} tintColor="#9ca3af" />
          </View>
          <Text className="text-xl font-bold text-gray-800 mb-2">No trips yet</Text>
          <Text className="text-gray-500 text-center text-[15px]">Your past trips and payments will appear here once you take a ride.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
          {history.map((record) => {
            const date = new Date(record.date);
            return (
              <View key={record.id} className="bg-white p-5 rounded-2xl mb-4 border border-gray-100 shadow-sm">
                <View className="flex-row justify-between items-start mb-3">
                  <View>
                    <Text className="text-[17px] font-black text-gray-900 mb-0.5">{record.destination}</Text>
                    <Text className="text-blue-500 text-[13px] font-bold">{record.route}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[18px] font-black text-gray-900">GHC {record.fare.toFixed(2)}</Text>
                    <Text className="text-gray-400 text-[12px] font-medium capitalize">{record.paymentMethod}</Text>
                  </View>
                </View>
                
                <View className="h-[1px] bg-gray-100 w-full mb-3" />
                
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <SymbolView name="calendar" size={14} tintColor="#9ca3af" />
                    <Text className="text-gray-500 text-[12px] ml-1.5">{date.toLocaleDateString()} at {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                  </View>
                  <View className="bg-green-50 px-2.5 py-1 rounded-md">
                    <Text className="text-green-600 text-[10px] font-bold uppercase tracking-wider">Completed</Text>
                  </View>
                </View>
              </View>
            );
          })}
          <View className="h-8" />
        </ScrollView>
      )}
    </View>
  );
}
