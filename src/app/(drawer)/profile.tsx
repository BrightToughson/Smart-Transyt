import { View, Text } from 'react-native';

export default function Profile() {
  return (
    <View className="flex-1 bg-white p-6 justify-center items-center">
      <Text className="text-2xl font-bold text-gray-800">User Profile</Text>
      <Text className="text-gray-500 mt-2">Manage your account details here.</Text>
    </View>
  );
}
