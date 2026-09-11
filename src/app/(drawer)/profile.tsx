import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { useUser, useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const onDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setIsDeleting(true);
            try {
              await user.delete();
              // The user session will be destroyed and the layout will redirect to sign-in
            } catch (err: any) {
              console.error(err);
              Alert.alert('Error', err.errors?.[0]?.message || 'Failed to delete account.');
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header Profile Section */}
      <View className="bg-primary pt-10 pb-20 px-6 items-center rounded-b-[40px]">
        {user?.imageUrl ? (
          <Image 
            source={{ uri: user.imageUrl }} 
            className="w-24 h-24 rounded-full border-4 border-white mb-4"
          />
        ) : (
          <View className="w-24 h-24 rounded-full bg-white items-center justify-center border-4 border-blue-200 mb-4">
            <SymbolView name="person.crop.circle.fill" size={60} tintColor="#1A4996" />
          </View>
        )}
        <Text className="text-white text-2xl font-black">{user?.fullName || 'Transit User'}</Text>
        {user?.username && (
          <Text className="text-blue-200 text-[14px] font-bold mt-0.5">@{user.username}</Text>
        )}
        <Text className="text-blue-100 text-[15px] font-medium mt-1">{user?.primaryEmailAddress?.emailAddress || 'user@example.com'}</Text>
      </View>

      {/* Profile Details Card */}
      <View className="bg-white mx-5 -mt-10 rounded-3xl p-5 border border-gray-100 mb-6 shadow-sm shadow-black/5">
        <Text className="text-gray-400 font-bold uppercase tracking-widest text-[12px] mb-4">Account Details</Text>
        
        <View className="flex-row items-center py-3 border-b border-gray-100">
          <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-4">
            <SymbolView name="phone.fill" size={18} tintColor="#3b82f6" />
          </View>
          <View className="flex-1">
            <Text className="text-gray-500 text-[12px] mb-1">Phone Number</Text>
            <Text className="text-gray-900 font-bold text-[15px]">{(user?.unsafeMetadata?.phoneNumber as string) || user?.primaryPhoneNumber?.phoneNumber || '+233 24 123 4567'}</Text>
          </View>
        </View>

        <View className="flex-row items-center py-3 border-b border-gray-100">
          <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-4">
            <SymbolView name="envelope.fill" size={18} tintColor="#3b82f6" />
          </View>
          <View className="flex-1">
            <Text className="text-gray-500 text-[12px] mb-1">Email</Text>
            <Text className="text-gray-900 font-bold text-[15px]">{user?.primaryEmailAddress?.emailAddress || 'Not set'}</Text>
          </View>
        </View>

        <View className="flex-row items-center py-3">
          <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-4">
            <SymbolView name="calendar" size={18} tintColor="#3b82f6" />
          </View>
          <View className="flex-1">
            <Text className="text-gray-500 text-[12px] mb-1">Joined</Text>
            <Text className="text-gray-900 font-bold text-[15px]">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'September 2026'}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="px-5 flex-col gap-y-3">
        <TouchableOpacity 
          className="bg-white py-4 px-5 rounded-2xl flex-row items-center justify-between border border-gray-100 shadow-sm shadow-black/5"
          onPress={() => router.push('/(drawer)/edit-profile')}
        >
          <View className="flex-row items-center">
            <SymbolView name="pencil" size={20} tintColor="#4b5563" style={{ marginRight: 12 }} />
            <Text className="text-gray-900 font-bold text-[16px]">Edit Profile</Text>
          </View>
          <SymbolView name="chevron.right" size={16} tintColor="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity 
          className="bg-white py-4 px-5 rounded-2xl flex-row items-center justify-between border border-gray-100 shadow-sm shadow-black/5"
          onPress={() => router.push('/(drawer)/change-password')}
        >
          <View className="flex-row items-center">
            <SymbolView name="lock.fill" size={20} tintColor="#4b5563" style={{ marginRight: 12 }} />
            <Text className="text-gray-900 font-bold text-[16px]">Change Password</Text>
          </View>
          <SymbolView name="chevron.right" size={16} tintColor="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity 
          className="bg-red-50 py-4 px-5 rounded-2xl flex-row items-center justify-between mt-2 border border-red-100"
          onPress={() => signOut()}
          disabled={isDeleting}
        >
          <View className="flex-row items-center">
            <SymbolView name="rectangle.portrait.and.arrow.right" size={20} tintColor="#ef4444" style={{ marginRight: 12 }} />
            <Text className="text-red-500 font-bold text-[16px]">Sign Out</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          className="bg-white py-4 px-5 rounded-2xl flex-row items-center justify-center mt-6 border border-red-200"
          onPress={onDeleteAccount}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color="#ef4444" size="small" />
          ) : (
            <>
              <SymbolView name="trash.fill" size={20} tintColor="#ef4444" style={{ marginRight: 8 }} />
              <Text className="text-red-500 font-bold text-[16px]">Delete Account</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
