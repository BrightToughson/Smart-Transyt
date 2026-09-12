import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KeyboardAvoidingView, View, Text, TextInput, TouchableOpacity, SafeAreaView, Platform, Animated, PanResponder, Dimensions, ScrollView, Image, AppState } from 'react-native';
import { useUser } from '@clerk/expo';
import { useRideNotifications } from '@/hooks/useRideNotifications';
import { CameraView, useCameraPermissions } from 'expo-camera';
import MapView, { Marker, Polyline, Callout } from '@/components/Map';
import { useLocationStore, useWalletStore } from '@/store';
import { useRouter, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Location from 'expo-location';
import { route1 } from '../../constants/mockRoutes';
import { ROUTES, BUSES } from '../../constants/mockData';

export default function Home() {
  const { user } = useUser();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanningQR, setIsScanningQR] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tripState, setTripState] = useState<'idle' | 'selecting_stop' | 'confirming' | 'active'>('idle');
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [selectedStop, setSelectedStop] = useState<any>(null);
  const [boardingStop, setBoardingStop] = useState<any>(null);
  const [directionLabel, setDirectionLabel] = useState<string>('');
  const [selectedBus, setSelectedBus] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isConfirmSheetMinimized, setIsConfirmSheetMinimized] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'momo' | 'cash' | 'qr'>('wallet');
  const [hasPaid, setHasPaid] = useState(false);
  const [simulatedETA, setSimulatedETA] = useState<number | null>(null);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [paymentProcessState, setPaymentProcessState] = useState<'idle' | 'cash_verification' | 'processing' | 'success'>('idle');
  const [walkingRoute, setWalkingRoute] = useState<{latitude: number, longitude: number}[]>([]);
  const [userLocation, setUserLocation] = useState({ latitude: 5.744306, longitude: -0.177075 }); // Exact Oyarifa line point
  const [weather, setWeather] = useState<{ temp: number, icon: string } | null>(null);
  const { setDestination, destination } = useLocationStore();
  const balance = useWalletStore((state) => state.balance);
  const router = useRouter();
  const navigation = useNavigation();

  const mapRef = useRef<any>(null);

  // Use BUSES from mockData
  const [liveBuses, setLiveBuses] = useState(BUSES);
  
  const { triggerBackgroundSummary, scheduleFiveMinuteWarning, cancelFiveMinuteWarning } = useRideNotifications();



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

  // Simulation Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (tripState === 'active' && simulatedETA !== null && simulatedETA > 0) {
      timer = setInterval(() => {
        setSimulatedETA((prev) => {
          if (prev === null) return null;
          const next = prev - 1;
          if (next === 5 && !hasPaid) {
            setShowPaymentPrompt(true);
          }
          if (next <= 0) {
            clearInterval(timer);
            return 0;
          }
          return next;
        });
      }, 1000); // 1 real second = 1 sim minute
    }
    return () => clearInterval(timer);
  }, [tripState, simulatedETA, hasPaid]);

  const initialRegion = {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // Fetch actual walking route from OSRM
  useEffect(() => {
    if (boardingStop && userLocation) {
      const fetchWalkingRoute = async () => {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${userLocation.longitude},${userLocation.latitude};${boardingStop.coords.longitude},${boardingStop.coords.latitude}?geometries=geojson`);
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map((coord: any) => ({
              latitude: coord[1],
              longitude: coord[0]
            }));
            setWalkingRoute(coords);
          }
        } catch (e) {
          console.error("Failed to fetch walking route:", e);
        }
      };
      fetchWalkingRoute();
    } else {
      setWalkingRoute([]);
    }
  }, [boardingStop, userLocation]);

  const handleSuccessReset = () => {
    setPaymentProcessState('idle');
    setTripState('idle');
    setSelectedRoute(null);
    setSelectedStop(null);
    setBoardingStop(null);
    setSelectedBus(null);
    setHasPaid(false);
    setSimulatedETA(null);
    cancelFiveMinuteWarning();
  };

  const executePayment = () => {
    if (paymentMethod === 'cash') {
      setPaymentProcessState('cash_verification');
    } else {
      setPaymentProcessState('processing');
      setTimeout(() => {
        setPaymentProcessState('success');
        setTimeout(handleSuccessReset, 1500);
      }, 2000);
    }
  };

  const handleProcessPayment = async () => {
    setShowPaymentPrompt(false);
    
    if (paymentMethod === 'qr') {
      if (!permission?.granted) {
        const res = await requestPermission();
        if (!res.granted) {
          // If they refuse, just process payment without QR
          executePayment();
          return;
        }
      }
      setIsScanningQR(true);
    } else {
      executePayment();
    }
  };

  const handleBarcodeScanned = () => {
    setIsScanningQR(false);
    executePayment();
  };

  const handleCashConfirmed = () => {
    setPaymentProcessState('processing');
    setTimeout(() => {
      setPaymentProcessState('success');
      setTimeout(handleSuccessReset, 1500);
    }, 1000);
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
  
  const progressPercentage = simulatedETA !== null ? Math.max(0, Math.min(100, 100 - (simulatedETA / estimatedMins) * 100)) : 0;

  // AppState listener for background notifications
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/) && tripState === 'active' && selectedStop) {
        triggerBackgroundSummary(selectedStop.name, simulatedETA ?? estimatedMins, estimatedFare, hasPaid);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [tripState, selectedStop, simulatedETA, estimatedMins, estimatedFare, hasPaid, triggerBackgroundSummary]);

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
        ref={mapRef}
        style={{ flex: 1 }}
        region={initialRegion}
        showsUserLocation={true}
        showsCompass={false}
        showsMyLocationButton={false}
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
            {boardingStop && calculateDistance(userLocation.latitude, userLocation.longitude, boardingStop.coords.latitude, boardingStop.coords.longitude) < 0.5 && (
              <Polyline
                coordinates={walkingRoute.length > 0 ? walkingRoute : [
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
          <View className="absolute top-14 left-4 flex-row items-center">
            <TouchableOpacity 
              className="bg-white/90 rounded-2xl px-4 h-11 flex-row items-center border border-white/50 backdrop-blur-xl shadow-sm shadow-black/10"
              onPress={() => router.push('/(drawer)/wallet')}
              activeOpacity={0.8}
            >
              <SymbolView name="creditcard.fill" size={15} tintColor="#1A4996" style={{ marginRight: 8 }} />
              <Text className="text-[15px] font-bold text-[#1A4996]">GHC {balance.toFixed(2)}</Text>
            </TouchableOpacity>
          </View>

          <View className="absolute top-14 right-4 shadow-sm shadow-black/10 z-50">
            <View className="bg-white/70 rounded-xl px-2.5 py-1.5 flex-row items-center border border-white/50 backdrop-blur-lg">
              <Text className="text-[15px] mr-1">{weather?.icon || '☁️'}</Text>
              <Text className="text-[15px] font-semibold text-gray-800">{weather?.temp ?? 28}°</Text>
            </View>
          </View>

          {/* Edge Drawer Tab (Dark Arrow) */}
          <TouchableOpacity
            className="absolute left-0 top-1/2 -mt-10 bg-black/60 rounded-r-[20px] w-8 h-20 items-center justify-center border-y border-r border-white/10 backdrop-blur-md shadow-lg"
            onPress={() => (navigation as any).openDrawer()}
            activeOpacity={0.8}
            style={{ zIndex: 100 }}
          >
            <SymbolView name="chevron.right" size={20} tintColor="#ffffff" weight="bold" />
          </TouchableOpacity>
        </>
      )}

      {/* Map Action Buttons (Compass & Location) */}
      {!isSearching && (
        <View className="absolute right-4 top-[120px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-40">
          <View className="bg-white/90 rounded-2xl border border-white/80 backdrop-blur-xl overflow-hidden shadow-sm">
            <TouchableOpacity 
              className="w-12 h-12 border-b border-gray-200/50 items-center justify-center bg-white/50"
              onPress={() => {
                if (mapRef.current) {
                  mapRef.current.animateCamera({ heading: 0, pitch: 0 }, { duration: 500 });
                }
              }}
              activeOpacity={0.7}
            >
              <SymbolView name="safari.fill" size={22} tintColor="#3b82f6" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="w-12 h-12 items-center justify-center bg-white/50"
              onPress={() => {
                if (userLocation && mapRef.current) {
                  mapRef.current.animateCamera({
                    center: {
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                    },
                    heading: 0,
                    pitch: 0,
                    zoom: 16
                  }, { duration: 1000 });
                }
              }}
              activeOpacity={0.7}
            >
              <SymbolView name="location.fill" size={20} tintColor="#3b82f6" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Top Banner for Route Name (Active / Confirming) */}
      {(tripState === 'confirming' || tripState === 'active') && selectedRoute && (
        <View className="absolute top-14 left-0 right-0 z-50 items-center">
          <View className="bg-white/95 backdrop-blur-xl rounded-full px-5 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-white flex-row items-center justify-center">
            <SymbolView name="arrow.triangle.swap" size={15} tintColor="#1A4996" style={{ marginRight: 8 }} />
            <Text className="text-[16px] font-medium text-gray-900 tracking-tight">{selectedRoute.name}</Text>
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
              onPress={() => router.push('/(drawer)/profile')}
            >
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} className="w-full h-full" />
              ) : (
                <SymbolView name="person.fill" size={20} tintColor="#6b7280" />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Full Screen Search Sheet */}
      {isSearching && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="absolute top-12 bottom-0 left-0 right-0 bg-[#1c1c1e] rounded-t-[32px] shadow-2xl overflow-hidden"
        >
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
                className="flex-1 mt-2"
                contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 8, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {selectedRoute.stops
                  .filter((stop: any) => stop.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((stop: any, index: number, array: any[]) => (
                  <TouchableOpacity 
                    key={stop.id}
                    className="bg-[#2c2c2e] rounded-2xl p-4 mb-3 flex-row items-center border border-[#3a3a3c] shadow-lg shadow-black/20"
                    activeOpacity={0.7}
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
                      setIsConfirmSheetMinimized(false);
                      setTripState('confirming');
                    }}
                  >
                    <View className="w-10 h-10 bg-gray-700/50 rounded-full items-center justify-center mr-4 border border-gray-600">
                      <SymbolView name="mappin.and.ellipse" size={18} tintColor="#d1d5db" />
                    </View>
                    <Text className="text-white text-[16px] font-semibold flex-1">{stop.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View className="px-4 flex-1">
              <Text className="text-white font-bold text-lg mb-3">Available Bus Routes</Text>
              <ScrollView 
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 8, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {ROUTES
                  .filter((route) => route.name.toLowerCase().includes(searchQuery.toLowerCase()) || route.stops.some((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map((route, index, array) => {
                    const parts = route.name.split(' ');
                    const routeNum = parts[0];
                    const routeDesc = parts.slice(1).join(' ');
                    const isNum = /^\d+$/.test(routeNum);
                    
                    return (
                    <TouchableOpacity 
                      key={route.id}
                      className="bg-[#2c2c2e] rounded-2xl p-4 mb-3 flex-row items-center justify-between border border-[#3a3a3c] shadow-lg shadow-black/20"
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedRoute(route);
                        setTripState('selecting_stop');
                        setSearchQuery(''); // clear query for stops
                      }}
                    >
                      <View className="flex-row items-center flex-1 pr-2">
                        <View className="w-12 h-12 bg-blue-500/10 rounded-2xl items-center justify-center mr-4 border border-blue-500/20">
                          <SymbolView name="bus.fill" size={24} tintColor="#3b82f6" />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center mb-1">
                            {isNum ? (
                              <View className="bg-blue-600 px-2 py-0.5 rounded mr-2">
                                <Text className="text-white text-[11px] font-black">{routeNum}</Text>
                              </View>
                            ) : null}
                            <Text className="text-white text-[16px] font-bold flex-1" numberOfLines={1}>
                              {isNum ? routeDesc : route.name}
                            </Text>
                          </View>
                          <Text className="text-gray-400 text-[13px] font-medium">{route.stops.length} Stops • ~45 mins</Text>
                        </View>
                      </View>
                      <View className="w-8 h-8 bg-[#3a3a3c] rounded-full items-center justify-center">
                        <SymbolView name="chevron.right" size={14} tintColor="#a1a1aa" />
                      </View>
                    </TouchableOpacity>
                  )})}
              </ScrollView>
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      {/* Trip Confirmation Bottom Sheet */}
      {tripState === 'confirming' && selectedRoute && selectedStop && (
        <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.1)] pt-4 pb-10 px-6">
          {/* Grabber Toggle */}
          <TouchableOpacity 
            className="w-full items-center justify-center py-2 -mt-2 mb-4"
            activeOpacity={0.6}
            onPress={() => setIsConfirmSheetMinimized(!isConfirmSheetMinimized)}
          >
            <View className="w-12 h-1.5 bg-gray-200 rounded-full" />
            <SymbolView 
              name={isConfirmSheetMinimized ? "chevron.up" : "chevron.down"} 
              size={14} 
              tintColor="#d1d5db" 
              style={{ marginTop: 4 }} 
            />
          </TouchableOpacity>

          {/* Header */}
          <View className={`flex-row items-start justify-between ${isConfirmSheetMinimized ? '' : 'mb-8'}`}>
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

          {!isConfirmSheetMinimized && (
            <>
              {/* Payment Method */}
              <View className="mb-8">
                <Text className="text-[17px] font-extrabold text-gray-900 mb-4 tracking-tight">Payment Method</Text>
                <View className="flex-row gap-3">
                  {/* Wallet */}
                  <TouchableOpacity 
                    onPress={() => setPaymentMethod('wallet')}
                    className={`flex-1 rounded-[20px] py-4 px-1 items-center justify-center border-[2px] ${paymentMethod === 'wallet' ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-transparent'}`}
                    activeOpacity={0.7}
                  >
                    <View className={`w-[42px] h-[42px] rounded-full items-center justify-center mb-2 shadow-sm ${paymentMethod === 'wallet' ? 'bg-blue-500 shadow-blue-500/30' : 'bg-white shadow-gray-200'}`}>
                      <SymbolView name="creditcard.fill" size={20} tintColor={paymentMethod === 'wallet' ? "#ffffff" : "#6b7280"} />
                    </View>
                    <Text className={`text-[12px] font-bold ${paymentMethod === 'wallet' ? 'text-blue-700' : 'text-gray-500'}`}>Wallet</Text>
                  </TouchableOpacity>

                  {/* MoMo */}
                  <TouchableOpacity 
                    onPress={() => setPaymentMethod('momo')}
                    className={`flex-1 rounded-[20px] py-4 px-1 items-center justify-center border-[2px] ${paymentMethod === 'momo' ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-transparent'}`}
                    activeOpacity={0.7}
                  >
                    <View className={`w-[42px] h-[42px] rounded-full items-center justify-center mb-2 shadow-sm ${paymentMethod === 'momo' ? 'bg-blue-500 shadow-blue-500/30' : 'bg-white shadow-gray-200'}`}>
                      <SymbolView name="iphone" size={20} tintColor={paymentMethod === 'momo' ? "#ffffff" : "#6b7280"} />
                    </View>
                    <Text className={`text-[12px] font-bold ${paymentMethod === 'momo' ? 'text-blue-700' : 'text-gray-500'}`}>MoMo</Text>
                  </TouchableOpacity>

                  {/* Cash */}
                  <TouchableOpacity 
                    onPress={() => setPaymentMethod('cash')}
                    className={`flex-1 rounded-[20px] py-4 px-1 items-center justify-center border-[2px] ${paymentMethod === 'cash' ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-transparent'}`}
                    activeOpacity={0.7}
                  >
                    <View className={`w-[42px] h-[42px] rounded-full items-center justify-center mb-2 shadow-sm ${paymentMethod === 'cash' ? 'bg-blue-500 shadow-blue-500/30' : 'bg-white shadow-gray-200'}`}>
                      <SymbolView name="banknote" size={20} tintColor={paymentMethod === 'cash' ? "#ffffff" : "#6b7280"} />
                    </View>
                    <Text className={`text-[12px] font-bold ${paymentMethod === 'cash' ? 'text-blue-700' : 'text-gray-500'}`}>Cash</Text>
                  </TouchableOpacity>

                  {/* QR */}
                  <TouchableOpacity 
                    onPress={() => setPaymentMethod('qr')}
                    className={`flex-1 rounded-[20px] py-4 px-1 items-center justify-center border-[2px] ${paymentMethod === 'qr' ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-transparent'}`}
                    activeOpacity={0.7}
                  >
                    <View className={`w-[42px] h-[42px] rounded-full items-center justify-center mb-2 shadow-sm ${paymentMethod === 'qr' ? 'bg-blue-500 shadow-blue-500/30' : 'bg-white shadow-gray-200'}`}>
                      <SymbolView name="qrcode" size={20} tintColor={paymentMethod === 'qr' ? "#ffffff" : "#6b7280"} />
                    </View>
                    <Text className={`text-[12px] font-bold ${paymentMethod === 'qr' ? 'text-blue-700' : 'text-gray-500'}`}>QR Code</Text>
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
                setHasPaid(false); // Reset payment state for new trip
                setSimulatedETA(estimatedMins);
                setShowPaymentPrompt(false);
                scheduleFiveMinuteWarning(estimatedMins);
              }}
            >
              <Text className="text-white text-[16px] font-bold mr-2">Confirm Ride</Text>
              <SymbolView name="arrow.right" size={20} tintColor="#ffffff" weight="bold" />
            </TouchableOpacity>
          </View>
            </>
          )}
        </View>
      )}

      {/* Active Trip Info */}
      {tripState === 'active' && selectedRoute && selectedStop && selectedBus && (
        <View className="absolute bottom-12 left-5 right-5 shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
          <View className="bg-white rounded-[28px] border border-gray-100 p-6 overflow-hidden">
            {/* Progress Bar */}
            <View className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100">
              <View className="h-full bg-primary rounded-r-full" style={{ width: `${progressPercentage}%` }} />
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
              <View className={`items-end px-3 py-2 rounded-xl border ${hasPaid ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                 <Text className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${hasPaid ? 'text-green-600' : 'text-gray-400'}`}>{hasPaid ? 'Paid' : 'Unpaid'}</Text>
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
                <Text className="text-[15px] font-extrabold text-gray-900">{simulatedETA ?? estimatedMins} mins</Text>
              </View>
            </View>
            
            {/* Action */}
            <View className="flex-row gap-3">
              <TouchableOpacity 
                className={`flex-row items-center justify-center border rounded-2xl ${hasPaid ? 'flex-1 bg-red-50/80 border-red-100 py-4' : 'w-[60px] h-[56px] bg-red-50/80 border-red-100'}`}
                onPress={() => {
                  setTripState('idle');
                  setSelectedRoute(null);
                  setSelectedStop(null);
                  setBoardingStop(null);
                  setSelectedBus(null);
                  setHasPaid(false);
                  cancelFiveMinuteWarning();
                }}
              >
                <SymbolView name="xmark" size={20} tintColor="#ef4444" style={hasPaid ? {marginRight: 6} : {}} />
                {hasPaid && <Text className="text-red-500 font-bold text-[16px]">Cancel Trip</Text>}
              </TouchableOpacity>

              {!hasPaid && (
                <TouchableOpacity 
                  className="flex-1 bg-primary h-[56px] rounded-2xl flex-row items-center justify-center shadow-lg shadow-primary/30"
                  onPress={handleProcessPayment}
                >
                  <SymbolView name="creditcard.fill" size={18} tintColor="#ffffff" style={{ marginRight: 8 }} />
                  <Text className="text-white font-bold text-[16px]">Pay Fare</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* 5-Min Payment Prompt Overlay */}
      {showPaymentPrompt && (
        <View className="absolute inset-0 bg-black/50 z-[100] items-center justify-center p-5">
          <View className="bg-white rounded-[28px] w-full p-6 items-center shadow-2xl">
            <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center mb-4">
              <SymbolView name="bell.fill" size={30} tintColor="#3b82f6" />
            </View>
            <Text className="text-[22px] font-black text-gray-900 mb-2">Almost There!</Text>
            <Text className="text-[15px] text-gray-500 text-center mb-6">You are 5 minutes away from {selectedStop?.name}. Please confirm your {paymentMethod} payment of GHC {estimatedFare.toFixed(2)} before alighting.</Text>
            
            <TouchableOpacity 
              className="bg-primary w-full h-[56px] rounded-2xl flex-row items-center justify-center shadow-lg shadow-primary/30"
              onPress={handleProcessPayment}
            >
              <SymbolView name="checkmark.shield.fill" size={20} tintColor="#ffffff" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-[18px]">Pay Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Payment Processing Overlay */}
      {paymentProcessState !== 'idle' && (
        <View className="absolute inset-0 bg-white/95 z-[200] items-center justify-center p-6 backdrop-blur-xl">
          {paymentProcessState === 'cash_verification' && (
            <View className="items-center w-full">
              <View className="w-20 h-20 bg-green-50 rounded-full items-center justify-center mb-6 border-4 border-green-100">
                <SymbolView name="banknote" size={36} tintColor="#22c55e" />
              </View>
              <Text className="text-[28px] font-black text-gray-900 mb-3 text-center">Hand Cash to Conductor</Text>
              <Text className="text-[17px] text-gray-500 text-center mb-10 px-4">Please hand exactly GHC {estimatedFare.toFixed(2)} to the bus conductor. They will verify your payment.</Text>
              
              <TouchableOpacity 
                className="bg-green-500 w-full h-[60px] rounded-2xl flex-row items-center justify-center shadow-xl shadow-green-500/30 mb-4"
                onPress={handleCashConfirmed}
              >
                <SymbolView name="checkmark.seal.fill" size={22} tintColor="#ffffff" style={{ marginRight: 10 }} />
                <Text className="text-white font-bold text-[18px]">I Have Paid the Cash</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="py-4"
                onPress={() => setPaymentProcessState('idle')}
              >
                <Text className="text-gray-400 font-bold text-[16px]">Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {paymentProcessState === 'processing' && (
            <View className="items-center">
              <View className="w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-6 border-4 border-blue-100">
                <SymbolView name="arrow.triangle.2.circlepath" size={36} tintColor="#3b82f6" />
              </View>
              <Text className="text-[24px] font-black text-gray-900 mb-2">Processing Payment...</Text>
              <Text className="text-[15px] text-gray-500">Verifying {paymentMethod} transaction</Text>
            </View>
          )}

          {paymentProcessState === 'success' && (
            <View className="items-center">
              <View className="w-24 h-24 bg-green-500 rounded-full items-center justify-center mb-6 shadow-2xl shadow-green-500/40">
                <SymbolView name="checkmark" size={48} tintColor="#ffffff" weight="bold" />
              </View>
              <Text className="text-[28px] font-black text-gray-900 mb-2">Payment Successful!</Text>
              <Text className="text-[16px] text-green-600 font-bold">GHC {estimatedFare.toFixed(2)} Paid via {paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'wallet' ? 'Wallet' : 'MoMo'}</Text>
            </View>
          )}
        </View>
      )}

      {/* QR Scanner Overlay */}
      {isScanningQR && (
        <View className="absolute inset-0 z-[300] bg-black">
          <CameraView 
            style={{ flex: 1 }}
            facing="back"
            onBarcodeScanned={handleBarcodeScanned}
          >
            <SafeAreaView className="flex-1 bg-black/40">
              <View className="flex-1 items-center justify-center p-5">
                <View className="w-64 h-64 border-4 border-primary rounded-3xl items-center justify-center bg-black/20">
                  <SymbolView name="qrcode.viewfinder" size={48} tintColor="#ffffff" />
                </View>
                <Text className="text-white text-center mt-6 text-[20px] font-black tracking-tight">Scan Conductor's QR Code</Text>
                <Text className="text-gray-300 text-center mt-2 px-6">Point your camera at the QR code to process your fare payment.</Text>
              </View>
              
              <View className="p-8 pb-12">
                <TouchableOpacity 
                  className="w-full bg-white/20 p-4 rounded-2xl border border-white/30 backdrop-blur-md items-center justify-center"
                  onPress={() => setIsScanningQR(false)}
                >
                  <Text className="text-white font-bold text-[18px]">Cancel</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </CameraView>
        </View>
      )}
    </View>
  );
}
