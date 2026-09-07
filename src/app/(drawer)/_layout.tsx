import { Drawer } from 'expo-router/drawer';
import { useAuth } from '@clerk/expo';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useWalletStore } from '@/store';
import { DrawerContentScrollView, DrawerItemList } from 'expo-router/drawer';
import { Redirect } from 'expo-router';

function CustomDrawerContent(props: any) {
  const { signOut } = useAuth();
  const balance = useWalletStore((state) => state.balance);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-white">
      <View className="p-6 bg-primary">
        <Text className="text-white text-xl font-bold mb-1">Smart Transyt</Text>
        <Text className="text-white opacity-80 text-sm">Balance</Text>
        <Text className="text-white text-3xl font-bold mt-1">GHC {balance.toFixed(2)}</Text>
      </View>
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <TouchableOpacity
        className="p-4 m-4 bg-red-100 rounded-xl items-center"
        onPress={() => signOut()}
      >
        <Text className="text-red-600 font-bold">Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default function DrawerLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  
  if (isLoaded && !isSignedIn) {
    // @ts-ignore
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Drawer drawerContent={(props) => <CustomDrawerContent {...props} />}>
      <Drawer.Screen
        name="index"
        options={{
          headerShown: false,
          drawerLabel: 'Home',
          title: 'Smart Transyt',
        }}
      />
      <Drawer.Screen
        name="wallet"
        options={{
          drawerLabel: 'Wallet',
          title: 'Wallet',
          headerStyle: { backgroundColor: '#1A4996' },
          headerTintColor: '#fff',
        }}
      />
      <Drawer.Screen
        name="history"
        options={{
          drawerLabel: 'Travel History',
          title: 'Travel History',
          headerStyle: { backgroundColor: '#1A4996' },
          headerTintColor: '#fff',
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          drawerLabel: 'User Profile',
          title: 'Profile',
          headerStyle: { backgroundColor: '#1A4996' },
          headerTintColor: '#fff',
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: 'Settings',
          title: 'Settings',
          headerStyle: { backgroundColor: '#1A4996' },
          headerTintColor: '#fff',
        }}
      />
      <Drawer.Screen
        name="help"
        options={{
          drawerLabel: 'Help',
          title: 'Help',
          headerStyle: { backgroundColor: '#1A4996' },
          headerTintColor: '#fff',
        }}
      />
    </Drawer>
  );
}
