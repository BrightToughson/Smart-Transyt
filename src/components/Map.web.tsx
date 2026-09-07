import React from 'react';
import { View, Text } from 'react-native';

const MapView = ({ children, style }: any) => (
  <View style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0e0e0' }, style]}>
    <Text>Map is not supported on web.</Text>
  </View>
);

export const Marker = () => null;
export const Polyline = () => null;

export default MapView;
