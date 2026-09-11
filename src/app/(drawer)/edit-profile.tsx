import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

export default function EditProfile() {
  const { user } = useUser();
  const router = useRouter();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.primaryEmailAddress?.emailAddress || '');
  
  const initialPhone = (user?.unsafeMetadata?.phoneNumber as string) || user?.primaryPhoneNumber?.phoneNumber || '';
  const defaultPhone = initialPhone.startsWith('+233') ? initialPhone.replace('+233', '') : initialPhone.replace(/^0+/, '');
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Verification state
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingEmailObj, setPendingEmailObj] = useState<any>(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.base64) {
      setImageUri(result.assets[0].uri);
      
      setIsUpdating(true);
      try {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await user?.setProfileImage({ file: base64Image });
      } catch (err: any) {
        console.error(err);
        Alert.alert('Error', 'Failed to upload profile picture.');
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleUpdate = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First and last name cannot be empty.');
      return;
    }

    setIsUpdating(true);
    try {
      const updatePayload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
      
      if (username.trim() !== (user?.username || '')) {
        updatePayload.username = username.trim();
      }

      // Handle phone update if changed
      const formattedPhone = phoneNumber ? `+233${phoneNumber}` : '';
      const currentPhone = (user?.unsafeMetadata?.phoneNumber as string) || user?.primaryPhoneNumber?.phoneNumber || '';
      
      if (formattedPhone !== currentPhone) {
        updatePayload.unsafeMetadata = {
          ...user?.unsafeMetadata,
          phoneNumber: formattedPhone
        };
      }

      await user?.update(updatePayload);

      // Handle email update if changed
      const currentEmail = user?.primaryEmailAddress?.emailAddress || '';
      if (email.trim() !== currentEmail && email.trim() !== '') {
        let emailObj = user?.emailAddresses.find((e: any) => e.emailAddress === email.trim());
        
        if (!emailObj) {
          emailObj = await user?.createEmailAddress({ email: email.trim() });
        }
        
        // If the email is already verified on this account, just set it as primary
        if (emailObj?.verification?.status === 'verified') {
          await user?.update({ primaryEmailAddressId: emailObj?.id });
        } else if (emailObj) {
          // Otherwise, proceed to verify it
          await emailObj?.prepareVerification({ strategy: 'email_code' });
          
          setPendingEmailObj(emailObj);
          setIsVerifyingEmail(true);
          setIsUpdating(false);
          return; // Stop here and show verification UI
        }
      }



      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.push('/(drawer)/profile') }
      ]);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code.');
      return;
    }

    setIsUpdating(true);
    try {
      // Find the email obj from user's updated emailAddresses list, or use the stored one
      const emailToVerify = user?.emailAddresses.find((e: any) => e.id === pendingEmailObj?.id) || pendingEmailObj;
      
      const verifiedEmail = await emailToVerify.attemptVerification({ code: verificationCode });
      
      if (verifiedEmail.verification.status === 'verified') {
        await user?.update({ primaryEmailAddressId: verifiedEmail.id });
        
        Alert.alert('Success', 'Email verified and profile updated!', [
          { text: 'OK', onPress: () => router.push('/(drawer)/profile') }
        ]);
      } else {
        Alert.alert('Error', 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.errors?.[0]?.message || 'Invalid verification code.');
    } finally {
      setIsUpdating(false);
    }
  };



  if (isVerifyingEmail) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 bg-gray-50 px-6 pt-12">
        <Text className="text-gray-900 font-black text-2xl mb-2">Verify Email</Text>
        <Text className="text-gray-500 text-[15px] mb-8">
          We sent a 6-digit verification code to <Text className="font-bold text-gray-800">{email}</Text>. Please enter it below. (Check your spam/junk folder if you don't see it).
        </Text>

        <View className="mb-8">
          <Text className="text-gray-900 font-bold text-[14px] mb-2 ml-1">Verification Code</Text>
          <View className="bg-white rounded-2xl flex-row items-center h-[56px] px-4 border border-gray-200 focus:border-primary">
            <SymbolView name="number" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
            <TextInput
              className="flex-1 text-[20px] text-gray-900 h-full tracking-widest"
              placeholder="123456"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              maxLength={6}
              value={verificationCode}
              onChangeText={setVerificationCode}
            />
          </View>
        </View>

        <TouchableOpacity
          className={`h-[56px] rounded-2xl flex-row items-center justify-center shadow-lg shadow-primary/30 ${isUpdating ? 'bg-blue-400' : 'bg-primary'}`}
          onPress={handleVerifyEmail}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text className="text-white text-[16px] font-bold mr-2">Verify & Save</Text>
              <SymbolView name="checkmark.circle.fill" size={18} tintColor="white" />
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          className="h-[56px] rounded-2xl flex-row items-center justify-center mt-4 border border-gray-200 bg-white"
          onPress={() => {
            setIsVerifyingEmail(false);
            setPendingEmailObj(null);
            setVerificationCode('');
          }}
          disabled={isUpdating}
        >
          <Text className="text-gray-600 text-[16px] font-bold">Cancel</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView 
        className="flex-1 bg-gray-50" 
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
      <Text className="text-gray-900 font-black text-2xl mb-2">Edit Profile</Text>
      <Text className="text-gray-500 text-[15px] mb-8">Update your personal information.</Text>

      {/* Avatar Picker */}
      <View className="items-center mb-8">
        <TouchableOpacity 
          className="relative rounded-full border-4 border-white shadow-sm shadow-black/10"
          onPress={pickImage}
          disabled={isUpdating}
        >
          {imageUri || user?.imageUrl ? (
            <Image 
              source={{ uri: imageUri || user?.imageUrl }} 
              className="w-24 h-24 rounded-full"
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-blue-50 items-center justify-center">
              <SymbolView name="person.crop.circle.fill" size={60} tintColor="#1A4996" />
            </View>
          )}
          
          <View className="absolute bottom-0 right-0 bg-primary w-8 h-8 rounded-full items-center justify-center border-2 border-white">
            <SymbolView name="camera.fill" size={14} tintColor="white" />
          </View>
        </TouchableOpacity>
      </View>

      <View className="mb-5">
        <Text className="text-gray-900 font-bold text-[14px] mb-2 ml-1">First Name</Text>
        <View className="bg-white rounded-2xl flex-row items-center h-[56px] px-4 border border-gray-200">
          <SymbolView name="person.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
          <TextInput
            className="flex-1 text-[16px] text-gray-900 h-full"
            placeholder="John"
            placeholderTextColor="#9ca3af"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>
      </View>

      <View className="mb-5">
        <Text className="text-gray-900 font-bold text-[14px] mb-2 ml-1">Last Name</Text>
        <View className="bg-white rounded-2xl flex-row items-center h-[56px] px-4 border border-gray-200">
          <SymbolView name="person.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
          <TextInput
            className="flex-1 text-[16px] text-gray-900 h-full"
            placeholder="Doe"
            placeholderTextColor="#9ca3af"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
      </View>

      <View className="mb-5">
        <Text className="text-gray-900 font-bold text-[14px] mb-2 ml-1">Email</Text>
        <View className="bg-white rounded-2xl flex-row items-center h-[56px] px-4 border border-gray-200 focus:border-primary">
          <SymbolView name="envelope.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
          <TextInput
            className="flex-1 text-[16px] text-gray-900 h-full"
            placeholder="your@email.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>
      </View>

      <View className="mb-5">
        <Text className="text-gray-900 font-bold text-[14px] mb-2 ml-1">Phone Number</Text>
        <View className="bg-white rounded-2xl flex-row items-center h-[56px] px-4 border border-gray-200 focus:border-primary">
          <SymbolView name="phone.fill" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
          <Text className="text-gray-900 text-[16px] font-semibold mr-2">+233</Text>
          <TextInput
            className="flex-1 text-[16px] text-gray-900 h-full tracking-wide"
            placeholder="541 234 567"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
            maxLength={9}
            value={phoneNumber}
            onChangeText={(text) => {
              let val = text.replace(/[^0-9]/g, '');
              if (val.startsWith('0')) val = val.substring(1);
              setPhoneNumber(val);
            }}
          />
        </View>
      </View>

      <View className="mb-8">
        <Text className="text-gray-900 font-bold text-[14px] mb-2 ml-1">Username</Text>
        <View className="bg-white rounded-2xl flex-row items-center h-[56px] px-4 border border-gray-200">
          <SymbolView name="at" size={20} tintColor="#9ca3af" style={{ marginRight: 12 }} />
          <TextInput
            className="flex-1 text-[16px] text-gray-900 h-full"
            placeholder="username123"
            placeholderTextColor="#9ca3af"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>
      </View>

      <TouchableOpacity
        className={`h-[56px] rounded-2xl flex-row items-center justify-center shadow-lg shadow-primary/30 ${isUpdating ? 'bg-blue-400' : 'bg-primary'}`}
        onPress={handleUpdate}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Text className="text-white text-[16px] font-bold mr-2">Save Changes</Text>
            <SymbolView name="checkmark.circle.fill" size={18} tintColor="white" />
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
