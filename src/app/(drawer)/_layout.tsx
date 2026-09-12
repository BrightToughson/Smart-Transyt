import { Drawer } from 'expo-router/drawer';
import { useAuth } from '@clerk/expo';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useWalletStore } from '@/store';
import { DrawerContentScrollView, DrawerItemList } from 'expo-router/drawer';
import { Redirect } from 'expo-router';
import { Image } from 'react-native';
import { SymbolView } from 'expo-symbols';

function CustomDrawerContent(props: any) {
  const { signOut } = useAuth();
  const balance = useWalletStore((state) => state.balance);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-white">
      <View className="p-6 bg-primary pt-12 pb-8 rounded-br-[40px]">
        <Image
          source={require('../../../assets/images/logo-image/logo-3.png')}
          className="w-48 h-16 mb-6"
          resizeMode="contain"
        />
        <View className="bg-white/10 p-4 rounded-2xl border border-white/20">
          <Text className="text-white/80 text-xs font-medium mb-1 uppercase tracking-wider">My Balance</Text>
          <Text className="text-white text-3xl font-bold">GHC {balance.toFixed(2)}</Text>
        </View>
      </View>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 20 }}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <TouchableOpacity
        className="p-4 m-6 bg-red-50 rounded-2xl items-center flex-row justify-center border border-red-100"
        onPress={() => signOut()}
      >
        <SymbolView name="rectangle.portrait.and.arrow.right.fill" size={20} tintColor="#dc2626" style={{ marginRight: 8 }} />
        <Text className="text-red-600 font-bold text-base">Sign Out</Text>
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
    <Drawer 
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerActiveBackgroundColor: '#eff6ff',
        drawerActiveTintColor: '#1A4996',
        drawerInactiveTintColor: '#4b5563',
        drawerLabelStyle: { fontSize: 16, fontWeight: '600' },
        drawerItemStyle: { borderRadius: 12, paddingVertical: 2 },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          headerShown: false,
          drawerLabel: 'Home',
          title: 'Smart Transyt',
          drawerIcon: ({ color, size }) => <SymbolView name="house.fill" size={22} tintColor={color} />
        }}
      />
      <Drawer.Screen
        name="wallet"
        options={{
          drawerLabel: 'Wallet',
          title: 'Wallet',
          headerStyle: { backgroundColor: '#1A4996' },
          headerTintColor: '#fff',
          drawerIcon: ({ color, size }) => <SymbolView name="creditcard.fill" size={22} tintColor={color} />
        }}
      />
      <Drawer.Screen
        name="history"
        options={{
          drawerLabel: 'Travel History',
          title: 'Travel History',
          headerStyle: { backgroundColor: '#1A4996' },
          headerTintColor: '#fff',
          drawerIcon: ({ color, size }) => <SymbolView name="clock.fill" size={22} tintColor={color} />
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          drawerLabel: 'User Profile',
          title: 'Profile',
          headerStyle: { backgroundColor: '#1A4996' },
          headerTintColor: '#fff',
          drawerIcon: ({ color, size }) => <SymbolView name="person.fill" size={22} tintColor={color} />
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: 'Settings',
          title: 'Settings',
          headerStyle: { backgroundColor: '#1A4996' },
          headerTintColor: '#fff',
          drawerIcon: ({ color, size }) => <SymbolView name="gearshape.fill" size={22} tintColor={color} />
        }}
      />
      <Drawer.Screen
        name="help"
        options={{
          drawerLabel: 'Help',
          title: 'Help',
          headerStyle: { backgroundColor: '#1A4996' },
          headerTintColor: '#fff',
          drawerIcon: ({ color, size }) => <SymbolView name="questionmark.circle.fill" size={22} tintColor={color} />
        }}
      />
      <Drawer.Screen
        name="payment"
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="edit-profile"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Edit Profile',
          headerStyle: { backgroundColor: '#1A4996' },
          headerTintColor: '#fff',
        }}
      />
      <Drawer.Screen
        name="change-password"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Change Password',
          headerStyle: { backgroundColor: '#1A4996' },
          headerTintColor: '#fff',
        }}
      />
      <Drawer.Screen
        name="payment-methods"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Payment Methods',
          headerStyle: { backgroundColor: '#1A4996' },
          headerTintColor: '#fff',
        }}
      />

    </Drawer>
  );
}
