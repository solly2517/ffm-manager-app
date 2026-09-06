export function androidLocationRecovery(code?: number) {
  if (code === 1) return "Location is blocked. In Chrome, open the padlock beside the FFM address, choose Permissions, set Location to Allow, then reload FFM and try again.";
  if (code === 2) return "Android could not find a location. Turn on phone Location and mobile data, then try again near a window or outdoors.";
  if (code === 3) return "GPS is taking longer than expected. FFM will retry with standard accuracy; keep Location and mobile data on.";
  return "Location is unavailable. Confirm both Android Location and the browser permission for the FFM website are enabled.";
}

export function requestMobileLocation(onSuccess: (position: GeolocationPosition) => void, onFailure: (code?: number) => void) {
  if (!navigator.geolocation) { onFailure(); return; }
  const standardRetry = () => navigator.geolocation.getCurrentPosition(onSuccess, (error) => onFailure(error.code), { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 });
  navigator.geolocation.getCurrentPosition(onSuccess, (error) => error.code === 3 ? standardRetry() : onFailure(error.code), { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
}
