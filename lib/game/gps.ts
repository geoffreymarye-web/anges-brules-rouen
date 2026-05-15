const R = 6371000;

export function getDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function watchPlayerPosition(
  onUpdate: (lat: number, lng: number) => void,
  onError: (err: GeolocationPositionError) => void
): number {
  return navigator.geolocation.watchPosition(
    (pos) => onUpdate(pos.coords.latitude, pos.coords.longitude),
    onError,
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}

export function getUnlockedStep(
  playerLat: number,
  playerLng: number,
  currentUnlocked: number[],
  locations: { id: number; lat: number; lng: number; radius: number }[]
): number | null {
  for (const loc of locations) {
    if (currentUnlocked.includes(loc.id)) continue;
    const prevId = loc.id - 1;
    if (prevId > 0 && !currentUnlocked.includes(prevId)) continue;
    const dist = getDistance(playerLat, playerLng, loc.lat, loc.lng);
    if (dist <= loc.radius) return loc.id;
  }
  return null;
}
