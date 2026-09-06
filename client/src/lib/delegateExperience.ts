export function getRoleLandingPath(role?: string | null) {
  return role === "delegate" ? "/delegate" : role === "warehouse_hero" ? "/warehouse-hero" : null;
}

export function describeGeolocationError(code?: number) {
  if (code === 1) return "Location permission is blocked. In your browser settings, allow Location for the FFM website, then return here and select Test GPS again.";
  if (code === 2) return "Your phone could not determine a location. Turn on device Location/GPS and mobile data, then try again outdoors or near a window.";
  if (code === 3) return "GPS took too long. Check mobile data and device Location, then try again.";
  return "GPS is unavailable on this device. Confirm browser Location permission and device Location are both enabled.";
}
