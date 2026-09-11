import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Platform, Animated, PanResponder, Dimensions, ScrollView } from 'react-native';
import MapView, { Marker, Polyline, Callout } from '@/components/Map';
import { useLocationStore, useWalletStore } from '@/store';
import { useRouter, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Location from 'expo-location';
import { route1 } from '../../constants/mockRoutes';
import { ROUTES, BUSES } from '../../constants/mockData';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tripState, setTripState] = useState<'idle' | 'selecting_stop' | 'confirming' | 'active'>('idle');
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [selectedStop, setSelectedStop] = useState<any>(null);
  const [boardingStop, setBoardingStop] = useState<any>(null);
  const [directionLabel, setDirectionLabel] = useState<string>('');
  const [selectedBus, setSelectedBus] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'momo' | 'cash'>('wallet');
  const [userLocation, setUserLocation] = useState({ latitude: 5.744306, longitude: -0.177075 }); // Exact Oyarifa line point
  const [weather, setWeather] = useState<{ temp: number, icon: string } | null>(null);
  const { setDestination, destination } = useLocationStore();
  const balance = useWalletStore((state) => state.balance);
  const router = useRouter();
  const navigation = useNavigation();

  // Draggable Weather Pill State
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (e, gestureState) => {
        const { width, height } = Dimensions.get('window');
        
        // Calculate safe boundaries based on pill origin (top-14, right-4)
        const minX = -width + 100; // Prevent dragging off left edge
        const maxX = 0; // Prevent dragging off right edge
        const minY = 0; // Strictly prevent dragging higher than the initial safe top-14 position
        const maxY = height - 250; // Prevent dragging into bottom search bar area

        const offsetX = (pan.x as any)._offset || 0;
        const offsetY = (pan.y as any)._offset || 0;

        let absX = offsetX + gestureState.dx;
        let absY = offsetY + gestureState.dy;

        if (absX < minX) absX = minX;
        if (absX > maxX) absX = maxX;
        if (absY < minY) absY = minY;
        if (absY > maxY) absY = maxY;

        pan.setValue({ x: absX - offsetX, y: absY - offsetY });
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
      }
    })
  ).current;

  // Use BUSES from mockData
  const [liveBuses, setLiveBuses] = useState(BUSES);

  useEffect(() => {
    // Request GPS Permission and fetch live location
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        const lat = location.coords.latitude;
        const lon = location.coords.longitude;
        setUserLocation({ latitude: lat, longitude: lon });

        // Fetch live weather
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
          const data = await res.json();
          if (data?.current_weather) {
            const code = data.current_weather.weathercode;
            let icon = '☁️';
            if (code === 0) icon = '☀️';
            else if (code <= 3) icon = '⛅️';
            else if (code <= 48) icon = '🌫️';
            else if (code <= 67) icon = '🌧️';
            else if (code <= 77) icon = '❄️';
            else icon = '⛈️';
            
            setWeather({
              temp: Math.round(data.current_weather.temperature),
              icon
            });
          }
        } catch (e) {
          console.error('Failed to fetch weather', e);
        }
      }
    })();

    // Simulate real-time bus movement 
    const interval = setInterval(() => {
      setLiveBuses(currentBuses => 
        currentBuses.map(bus => ({
          ...bus,
          latitude: bus.latitude + (Math.random() - 0.5) * 0.0001,
          longitude: bus.longitude + (Math.random() - 0.5) * 0.0001,
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const initialRegion = {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // Simple Haversine distance calculation in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };

  const distanceKm = selectedStop ? calculateDistance(
    userLocation.latitude, userLocation.longitude,
    selectedStop.coords.latitude, selectedStop.coords.longitude
  ) : 0;
  
  // Realistic Ghana Smart Transit Pricing Model: 
  // Base Fare: GHS 0.50 + Per Kilometer Rate: GHS 0.482 (makes Oyarifa -> Madina ~9.3km exactly 5.00)
  let estimatedFare = 0.50 + (distanceKm * 0.482); 
  estimatedFare = Math.round(estimatedFare * 10) / 10; // Clean decimal
  const estimatedMins = Math.max(2, Math.round(distanceKm * 4)); // ~4 mins per km

  // Centered Path Geometry to ensure single thick line over the road
  const centeredPathGeometry = useMemo(() => {
    if (!selectedRoute?.pathGeometry) return [];
    const OFFSET_DISTANCE = 0.00005; // ~5 meters perpendicular offset
    return selectedRoute.pathGeometry.map((pt: any, index: number, arr: any[]) => {
      if (index === 0) return pt;
      const prev = arr[index - 1];
      const dx = pt.longitude - prev.longitude;
      const dy = pt.latitude - prev.latitude;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) return pt;
      const nx = -dy / length;
      const ny = dx / length;
      return {
        latitude: pt.latitude + ny * OFFSET_DISTANCE,
        longitude: pt.longitude + nx * OFFSET_DISTANCE,
      };
    });
  }, [selectedRoute?.pathGeometry]);

  return (
    <View className="flex-1">
      <MapView
        style={{ flex: 1 }}
        region={initialRegion}
        showsUserLocation={true}
      >
        
        {liveBuses.filter(b => !selectedRoute || b.routeId === selectedRoute.id).map(bus => {
          const route = ROUTES.find(r => r.id === bus.routeId);
          return (
            <Marker
              key={bus.id}
              coordinate={{ latitude: bus.latitude, longitude: bus.longitude }}
            >
              <View className="bg-primary/90 p-2 rounded-full border-2 border-white shadow-xl flex-row items-center justify-center">
                <Text style={{ fontSize: 16 }}>🚌</Text>
              </View>
              <Callout tooltip>
                <View className="bg-white rounded-2xl p-3 w-[150px] items-center border border-gray-100 shadow-xl">
                  <Text className="font-black text-gray-900 text-[15px] mb-1 text-center">{route?.name}</Text>
                  <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{bus.title}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {tripState !== 'idle' && selectedRoute && (
          <>
            {/* All Route Stops */}
            {selectedRoute.stops.map((stop: any) => {
              // Hide the white dot if it's the exact same as the selected dropoff, to avoid overlap
              if (selectedStop && selectedStop.id === stop.id) return null;
              
              return (
                  <Marker 
                  key={stop.id}
                  coordinate={stop.coords}
                  tracksViewChanges={false} // Performance optimization for static markers
                  title={stop.name} // Native title handles sizing perfectly
                >
                  {/* More visible dot */}
                  <View className="w-4 h-4 bg-white border-[3px] border-[#3b82f6] rounded-full shadow-sm" />
                </Marker>
              );
            })}

            {/* Selected Drop-off Point */}
            {selectedStop && (
              <Marker coordinate={selectedStop.coords} title={`Drop-off: ${selectedStop.name}`} pinColor="red" />
            )}
            
            {/* Boarding Stop */}
            {boardingStop && (
              <Marker 
                coordinate={boardingStop.coords} 
                title={`Boarding: ${boardingStop.name}`} 
                pinColor="green" 
              />
            )}
          </>
        )}

        {tripState !== 'idle' && selectedRoute && (
          <>
            {/* Outer Border (Darker Blue) */}
            <Polyline
              coordinates={centeredPathGeometry}
              strokeColor="#1e3a8a" // Tailwind blue-900
              strokeWidth={8}
              lineCap="round"
              lineJoin="round"
            />
            {/* Inner Fill (Vibrant Blue) */}
            <Polyline
              coordinates={centeredPathGeometry}
              strokeColor="#3b82f6" // Tailwind blue-500
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
            
            {/* Walking Path to Boarding Stop */}
            {boardingStop && (
              <Polyline
                coordinates={[
                  userLocation,
                  boardingStop.coords
                ]}
                strokeColor="#9ca3af" // Gray for walking
                strokeWidth={3}
                lineDashPattern={[5, 5]}
              />
            )}
          </>
        )}
      </MapView>

      {/* Floating Top Indicators (Wallet & Weather) */}
      {tripState === 'idle' && !isSearching && (
        <>
          <View className="absolute top-14 left-4 shadow-sm shadow-black/10">
            <TouchableOpacity 
              className="bg-white/70 rounded-xl px-3 py-1.5 flex-row items-center border border-white/50 backdrop-blur-lg"
              onPress={() => router.push('/(drawer)/wallet')}
            >
              <SymbolView name="creditcard.fill" size={14} tintColor="#1A4996" style={{ marginRight: 6 }} />
              <Text className="text-[15px] font-bold text-[#1A4996]">GHC {balance.toFixed(2)}</Text>
            </TouchableOpacity>
          </View>

          <Animated.View 
            {...panResponder.panHandlers}
            style={{ transform: pan.getTranslateTransform() }}
            className="absolute top-14 right-4 shadow-sm shadow-black/10 z-50"
          >
            <View className="bg-white/70 rounded-xl px-2.5 py-1.5 flex-row items-center border border-white/50 backdrop-blur-lg">
              <Text className="text-[15px] mr-1">{weather?.icon || '☁️'}</Text>
              <Text className="text-[15px] font-semibold text-gray-800">{weather?.temp ?? 28}°</Text>
            </View>
          </Animated.View>
        </>
      )}

      {/* Top Banner for Route Name (Active / Confirming) */}
      {(tripState === 'confirming' || tripState === 'active') && selectedRoute && (
        <View className="absolute top-14 left-0 right-0 z-50 items-center">
          <View className="bg-white/95 backdrop-blur-xl rounded-full px-5 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-white flex-row items-center justify-center">
            <SymbolView name="arrow.triangle.swap" size={15} tintColor="#1A4996" style={{ marginRight: 8 }} />
            <Text className="text-[16px] font-black text-gray-900 tracking-tight">{selectedRoute.name}</Text>
          </View>
        </View>
      )}

      {/* Bottom Search Bar (Initial State) */}
      {tripState === 'idle' && !isSearching ? (
        <View className="absolute bottom-16 left-5 right-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <TouchableOpacity 
            className="bg-white rounded-full border border-gray-100 py-3 px-5 flex-row items-center h-[60px]"
            activeOpacity={0.9}
            onPress={() => setIsSearching(true)}
          >
            <SymbolView name="magnifyingglass" size={22} tintColor="#8e8e93" style={{ marginRight: 12 }} />
            <Text className="flex-1 text-[17px] text-gray-400 font-medium">Where to?</Text>
            
            <TouchableOpacity 
              className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center overflow-hidden ml-3"
              onPress={() => (navigation as any).openDrawer()}
            >
              <SymbolView name="person.fill" size={20} tintColor="#6b7280" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Full Screen Search Sheet */}
      {isSearching && (
        <View className="absolute top-12 bottom-0 left-0 right-0 bg-[#1c1c1e] rounded-t-[32px] shadow-2xl overflow-hidden">
          {/* Grab handle */}
          <View className="w-10 h-1.5 bg-gray-500 rounded-full self-center mt-3 mb-4" />
          
          <View className="px-4 flex-row items-center mb-6">
            <View className="flex-1 bg-[#2c2c2e] rounded-xl flex-row items-center h-12 px-3">
              <SymbolView name="magnifyingglass" size={20} tintColor="#8e8e93" style={{ marginRight: 8 }} />
              <TextInput
                autoFocus
                placeholder="Search routes or stops..."
                className="flex-1 text-[17px] text-white h-full"
                placeholderTextColor="#8e8e93"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                keyboardAppearance="dark"
              />
            </View>
            <TouchableOpacity 
              className="ml-3 w-8 h-8 bg-[#2c2c2e] rounded-full items-center justify-center"
              onPress={() => {
                setIsSearching(false);
                setTripState('idle');
                setSelectedRoute(null);
              }}
            >
              <SymbolView name="xmark" size={14} tintColor="#a1a1aa" />
            </TouchableOpacity>
          </View>

          {tripState === 'selecting_stop' && selectedRoute ? (
            <View className="px-4 flex-1">
              <TouchableOpacity onPress={() => setTripState('idle')} className="mb-4 flex-row items-center">
                <SymbolView name="chevron.left" size={18} tintColor="#3b82f6" />
                <Text className="text-blue-500 font-bold ml-1">Back to Routes</Text>
              </TouchableOpacity>
              
              <Text className="text-white font-bold text-lg mb-1">{selectedRoute.name}</Text>
              <Text className="text-gray-400 mb-4">Select your drop-off stop</Text>
              
              <ScrollView 
                className="bg-[#2c2c2e] rounded-xl flex-1"
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
              >
                {selectedRoute.stops
                  .filter((stop: any) => stop.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((stop: any, index: number, array: any[]) => (
                  <TouchableOpacity 
                    key={stop.id}
                    className={`py-4 flex-row items-center ${index !== array.length - 1 ? 'border-b border-[#3a3a3c]' : ''}`}
                    onPress={() => {
                      const destIndex = selectedRoute.stops.findIndex((s: any) => s.id === stop.id);
                      setSelectedStop({ ...stop, stopIndex: destIndex });
                      setIsSearching(false);
                      setDestination(stop.name);

                      // Find nearest boarding stop
                      let nearest = selectedRoute.stops[0];
                      let minDist = Infinity;
                      let boardIndex = 0;
                      selectedRoute.stops.forEach((s: any, idx: number) => {
                        if (idx === destIndex) return; // Don't board at destination
                        const dist = calculateDistance(userLocation.latitude, userLocation.longitude, s.coords.latitude, s.coords.longitude);
                        if (dist < minDist) {
                          minDist = dist;
                          nearest = s;
                          boardIndex = idx;
                        }
                      });
                      
                      setBoardingStop({ ...nearest, stopIndex: boardIndex });
                      
                      if (boardIndex < destIndex) {
                        setDirectionLabel("Forward");
                      } else {
                        setDirectionLabel("Reverse");
                      }

                      const bus = liveBuses.find((b: any) => b.routeId === selectedRoute.id);
                      setSelectedBus(bus);
                      setTripState('confirming');
                    }}
                  >
                    <View className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center mr-3">
                      <SymbolView name="location.fill" size={14} tintColor="#a1a1aa" />
                    </View>
                    <Text className="text-white text-[16px] font-medium">{stop.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View className="px-4 flex-1">
              <Text className="text-white font-bold text-lg mb-3">Available Bus Routes</Text>
              <View className="bg-[#2c2c2e] rounded-xl px-4 py-2">
                {ROUTES
                  .filter((route) => route.name.toLowerCase().includes(searchQuery.toLowerCase()) || route.stops.some((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map((route, index, array) => (
                  <TouchableOpacity 
                    key={route.id}
                    className={`py-3 flex-row items-center justify-between ${index !== array.length - 1 ? 'border-b border-[#3a3a3c]' : ''}`}
                    onPress={() => {
                      setSelectedRoute(route);
                      setTripState('selecting_stop');
                      setSearchQuery(''); // clear query for stops
                    }}
                  >
                    <View className="flex-row items-center flex-1 pr-2">
                      <View className="w-10 h-10 bg-blue-500/20 rounded-full items-center justify-center mr-3">
                        <SymbolView name="bus.fill" size={20} tintColor="#3b82f6" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white text-[16px] font-semibold mb-1" numberOfLines={1}>{route.name}</Text>
                        <Text className="text-gray-400 text-[13px]">{route.stops.length} Stops</Text>
                      </View>
                    </View>
                    <SymbolView name="chevron.right" size={16} tintColor="#4b5563" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Trip Confirmation Bottom Sheet */}
      {tripState === 'confirming' && selectedRoute && selectedStop && (
        <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.1)] pt-4 pb-10 px-6">
          {/* Grabber */}
          <View className="w-12 h-1.5 bg-gray-200 rounded-full self-center mb-6" />

          {/* Header */}
          <View className="flex-row items-start justify-between mb-8">
            <View className="flex-1 pr-4">
              <View className="flex-row items-center mb-2">
                <Text className="text-[26px] font-extrabold text-gray-900 tracking-tight leading-tight mr-2">{selectedStop.name}</Text>
                <View className="bg-blue-100 px-2 py-1 rounded-md">
                  <Text className="text-blue-600 text-[10px] font-bold uppercase tracking-wider">{directionLabel}</Text>
                </View>
              </View>
              <Text className="text-[15px] font-medium text-gray-500">{distanceKm.toFixed(1)} km away • ~{estimatedMins} mins</Text>
            </View>
            <View className="bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
              <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider text-center mb-1">Est. Fare</Text>
              <Text className="text-gray-900 text-[18px] font-black">GHC {estimatedFare.toFixed(2)}</Text>
            </View>
          </View>

          {/* Payment Method */}
          <View className="mb-8">
            <Text className="text-[15px] font-bold text-gray-900 mb-3">Payment Method</Text>
            <View className="flex-row space-x-3">
              {/* Wallet */}
              <TouchableOpacity 
                onPress={() => setPaymentMethod('wallet')}
                className={`flex-1 rounded-2xl py-3 px-1 items-center border ${paymentMethod === 'wallet' ? 'bg-[#f0f9ff] border-blue-500' : 'bg-white border-gray-200'}`}
              >
                <SymbolView name="creditcard.fill" size={24} tintColor={paymentMethod === 'wallet' ? "#3b82f6" : "#9ca3af"} style={{ marginBottom: 4 }} />
                <Text className={`text-[13px] font-bold mt-2 ${paymentMethod === 'wallet' ? 'text-gray-900' : 'text-gray-500'}`}>Wallet</Text>
              </TouchableOpacity>

              {/* MoMo */}
              <TouchableOpacity 
                onPress={() => setPaymentMethod('momo')}
                className={`flex-1 rounded-2xl py-3 px-1 items-center border ${paymentMethod === 'momo' ? 'bg-[#f0f9ff] border-blue-500' : 'bg-white border-gray-200'}`}
              >
                <SymbolView name="iphone" size={24} tintColor={paymentMethod === 'momo' ? "#3b82f6" : "#9ca3af"} style={{ marginBottom: 4 }} />
                <Text className={`text-[13px] font-bold mt-2 ${paymentMethod === 'momo' ? 'text-gray-900' : 'text-gray-500'}`}>MoMo</Text>
              </TouchableOpacity>

              {/* Cash */}
              <TouchableOpacity 
                onPress={() => setPaymentMethod('cash')}
                className={`flex-1 rounded-2xl py-3 px-1 items-center border ${paymentMethod === 'cash' ? 'bg-[#f0f9ff] border-blue-500' : 'bg-white border-gray-200'}`}
              >
                <SymbolView name="banknote" size={24} tintColor={paymentMethod === 'cash' ? "#3b82f6" : "#9ca3af"} style={{ marginBottom: 4 }} />
                <Text className={`text-[13px] font-bold mt-2 ${paymentMethod === 'cash' ? 'text-gray-900' : 'text-gray-500'}`}>Cash</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="bg-gray-100 h-[60px] w-[60px] rounded-2xl items-center justify-center border border-gray-200"
              onPress={() => {
                setTripState('idle');
                setSelectedRoute(null);
                setSelectedStop(null);
                setBoardingStop(null);
                setSelectedBus(null);
              }}
            >
              <SymbolView name="xmark" size={24} tintColor="#4b5563" />
            </TouchableOpacity>
            
            <TouchableOpacity
              className="flex-1 bg-primary h-[60px] rounded-2xl flex-row items-center justify-center shadow-lg shadow-primary/30"
              onPress={() => {
                setTripState('active');
              }}
            >
              <Text className="text-white text-[18px] font-bold mr-2">Confirm Ride</Text>
              <SymbolView name="arrow.right" size={20} tintColor="#ffffff" weight="bold" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Active Trip Info */}
      {tripState === 'active' && selectedRoute && selectedStop && selectedBus && (
        <View className="absolute bottom-12 left-5 right-5 shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
          <View className="bg-white rounded-[28px] border border-gray-100 p-6 overflow-hidden">
            {/* Progress Bar */}
            <View className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100">
              <View className="h-full bg-primary w-1/3 rounded-r-full" />
            </View>

            {/* Header: Bus Info */}
            <View className="flex-row items-center justify-between mb-5 mt-2">
              <View className="flex-row items-center flex-1">
                <View className="bg-blue-50 w-12 h-12 rounded-2xl items-center justify-center mr-4 border border-blue-100">
                  <SymbolView name="bus.fill" size={24} tintColor="#1A4996" />
                </View>
                <View className="flex-1 pr-2">
                  <Text className="text-[20px] font-black text-gray-900 mb-0.5 tracking-tight">{selectedBus.title}</Text>
                  <Text className="text-[13px] font-bold text-green-500 tracking-wide uppercase">On Schedule</Text>
                </View>
              </View>
              <View className="items-end bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                 <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Paid</Text>
                 <Text className="text-[16px] font-black text-gray-900">GHC {estimatedFare.toFixed(2)}</Text>
              </View>
            </View>

            {/* Divider */}
            <View className="h-[1.5px] bg-gray-50 w-full mb-5" />

            {/* Status / ETA */}
            <View className="flex-row items-center justify-between mb-6 px-1">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-green-50 rounded-full items-center justify-center mr-3 border border-green-100">
                  <SymbolView name="location.fill" size={14} tintColor="#22c55e" />
                </View>
                <View>
                  <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Drop-off</Text>
                  <Text className="text-[15px] font-extrabold text-gray-800">{selectedStop.name}</Text>
                </View>
              </View>
              
              <View className="items-end">
                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Est. Arrival</Text>
                <Text className="text-[15px] font-extrabold text-gray-900">{estimatedMins} mins</Text>
              </View>
            </View>
            
            {/* Action */}
            <TouchableOpacity 
              className="bg-red-50/80 py-4 rounded-2xl items-center justify-center border border-red-100 flex-row"
              onPress={() => {
                setTripState('idle');
                setSelectedRoute(null);
                setSelectedStop(null);
                setBoardingStop(null);
                setSelectedBus(null);
              }}
            >
              <SymbolView name="xmark.circle.fill" size={18} tintColor="#ef4444" style={{ marginRight: 6 }} />
              <Text className="text-red-500 font-bold text-[16px]">Cancel Trip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
