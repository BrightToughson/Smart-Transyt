const fs = require('fs');

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

async function fetchRouteCoords(startLat, startLon, endLat, endLon) {
  const url = 'http://router.project-osrm.org/route/v1/driving/' + startLon + ',' + startLat + ';' + endLon + ',' + endLat + '?overview=full&geometries=geojson';
  const res = await fetch(url);
  const data = await res.json();
  return data.routes[0].geometry.coordinates.map(c => ({ latitude: c[1], longitude: c[0] }));
}

function snapStops(targets, coords) {
  const correctStops = targets.map(target => {
    let closestCoord = coords[0];
    let minDistance = Infinity;
    
    for (const c of coords) {
      const d = calculateDistance(target.lat, target.lon, c.latitude, c.longitude);
      if (d < minDistance) {
        minDistance = d;
        closestCoord = c;
      }
    }
    
    return {
      id: target.id,
      name: target.name,
      coords: closestCoord
    };
  });

  correctStops[0].coords = coords[0];
  correctStops[correctStops.length - 1].coords = coords[coords.length - 1];
  return correctStops;
}

const places = {
  accra: { lat: 5.5516, lon: -0.1969 },
  military37: { lat: 5.5928, lon: -0.1855 },
  shiashie: { lat: 5.6289, lon: -0.1697 },
  okponglo: { lat: 5.6417, lon: -0.1756 },
  legon: { lat: 5.6500, lon: -0.1833 },
  upsa: { lat: 5.6608, lon: -0.1663 },
  madina: { lat: 5.6784, lon: -0.1741 },
  ritz: { lat: 5.6731, lon: -0.1664 },
  adenta: { lat: 5.7058, lon: -0.1716 },
  pantang: { lat: 5.7176, lon: -0.1718 },
  frafraha: { lat: 5.7410, lon: -0.1470 },
  amrahia: { lat: 5.7641, lon: -0.1399 },
  danfa: { lat: 5.7883, lon: -0.1623 },
  oyibi: { lat: 5.7950, lon: -0.1170 },
  oyarifa: { lat: 5.7441, lon: -0.1765 },
  ayimensah: { lat: 5.7851, lon: -0.1828 }
};

async function main() {
  console.log("Generating precise routes...");

  // Route 1: Agric/Accra to Oyibi
  const coords1 = await fetchRouteCoords(places.accra.lat, places.accra.lon, places.oyibi.lat, places.oyibi.lon);
  const targets1 = [
    { id: 's_ac1', name: 'Agric/Accra Station', lat: places.accra.lat, lon: places.accra.lon },
    { id: 's_37', name: '37 Military Hospital', lat: places.military37.lat, lon: places.military37.lon },
    { id: 's_sh1', name: 'Shiashie', lat: places.shiashie.lat, lon: places.shiashie.lon },
    { id: 's_ok1', name: 'Okponglo', lat: places.okponglo.lat, lon: places.okponglo.lon },
    { id: 's_lg1', name: 'Legon', lat: places.legon.lat, lon: places.legon.lon },
    { id: 's_up1', name: 'UPSA Junction', lat: places.upsa.lat, lon: places.upsa.lon },
    { id: 's_md1', name: 'Madina Zongo Junction', lat: places.madina.lat, lon: places.madina.lon },
    { id: 's_rt1', name: 'Ritz Junction', lat: places.ritz.lat, lon: places.ritz.lon },
    { id: 's_ad1', name: 'Adenta Barrier', lat: places.adenta.lat, lon: places.adenta.lon },
    { id: 's_fr1', name: 'Frafraha', lat: places.frafraha.lat, lon: places.frafraha.lon },
    { id: 's_am1', name: 'Amrahia', lat: places.amrahia.lat, lon: places.amrahia.lon },
    { id: 's_dn1', name: 'Danfa', lat: places.danfa.lat, lon: places.danfa.lon },
    { id: 's_oy1', name: 'Oyibi', lat: places.oyibi.lat, lon: places.oyibi.lon }
  ];
  const stops1 = snapStops(targets1, coords1);

  // Route 3: Agric/Accra to Ayi Mensah
  const coords3 = await fetchRouteCoords(places.accra.lat, places.accra.lon, places.ayimensah.lat, places.ayimensah.lon);
  const targets3 = [
    { id: 's_ac3', name: 'Agric/Accra Station', lat: places.accra.lat, lon: places.accra.lon },
    { id: 's_373', name: '37 Military Hospital', lat: places.military37.lat, lon: places.military37.lon },
    { id: 's_sh3', name: 'Shiashie', lat: places.shiashie.lat, lon: places.shiashie.lon },
    { id: 's_ok3', name: 'Okponglo', lat: places.okponglo.lat, lon: places.okponglo.lon },
    { id: 's_lg3', name: 'Legon', lat: places.legon.lat, lon: places.legon.lon },
    { id: 's_up3', name: 'UPSA Junction', lat: places.upsa.lat, lon: places.upsa.lon },
    { id: 's_md3', name: 'Madina Zongo Junction', lat: places.madina.lat, lon: places.madina.lon },
    { id: 's_rt3', name: 'Ritz Junction', lat: places.ritz.lat, lon: places.ritz.lon },
    { id: 's_ad3', name: 'Adenta Barrier', lat: places.adenta.lat, lon: places.adenta.lon },
    { id: 's_pn3', name: 'Pantang Junction', lat: places.pantang.lat, lon: places.pantang.lon },
    { id: 's_oy3', name: 'Oyarifa', lat: places.oyarifa.lat, lon: places.oyarifa.lon },
    { id: 's_am3', name: 'Ayi Mensah', lat: places.ayimensah.lat, lon: places.ayimensah.lon }
  ];
  const stops3 = snapStops(targets3, coords3);

  const mockRoutes = [
    {
      id: '001',
      name: '001 Agric/Accra ↔ Oyibi',
      price: 15.00,
      stops: stops1,
      pathGeometry: coords1
    },
    {
      id: '002',
      name: '002 Agric/Accra ↔ Ayi Mensah',
      price: 12.00,
      stops: stops3,
      pathGeometry: coords3
    }
  ];

  // Generate buses
  const mockBuses = [];
  mockRoutes.forEach(r => {
    mockBuses.push({
      id: 'b_' + r.id + '_1',
      routeId: r.id,
      title: 'Bus A',
      latitude: r.pathGeometry[Math.floor(r.pathGeometry.length * 0.2)].latitude,
      longitude: r.pathGeometry[Math.floor(r.pathGeometry.length * 0.2)].longitude,
      heading: 'Forward'
    });
    mockBuses.push({
      id: 'b_' + r.id + '_2',
      routeId: r.id,
      title: 'Bus B',
      latitude: r.pathGeometry[Math.floor(r.pathGeometry.length * 0.7)].latitude,
      longitude: r.pathGeometry[Math.floor(r.pathGeometry.length * 0.7)].longitude,
      heading: 'Forward'
    });
  });

  const content = '// This file is auto-generated\nexport const ROUTES = ' + JSON.stringify(mockRoutes, null, 2) + ';\nexport const BUSES = ' + JSON.stringify(mockBuses, null, 2) + ';\n';

  fs.writeFileSync('src/constants/mockData.ts', content, 'utf8');
  console.log('Successfully generated updated routes!');
}

main();
