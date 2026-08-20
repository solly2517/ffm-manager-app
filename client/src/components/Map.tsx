/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

type MapRoute = { origin: google.maps.LatLngLiteral; destination: google.maps.LatLngLiteral; waypoints?: google.maps.DirectionsWaypoint[] };

function loadMapScript() {
  return new Promise(resolve => {
    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry,routes`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      resolve(null);
      script.remove(); // Clean up immediately
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
    };
    document.head.appendChild(script);
  });
}

interface MapMarker {
  id: string | number;
  position: google.maps.LatLngLiteral;
  title?: string;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  markers?: MapMarker[];
  showMarkerLabels?: boolean;
  route?: MapRoute;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  markers = [],
  showMarkerLabels,
  route,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markerCleanups = useRef<Array<() => void>>([]);
  const routeRenderer = useRef<google.maps.DirectionsRenderer | null>(null);
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const routeKey = route ? JSON.stringify([route.origin, route.destination, route.waypoints ?? []]) : "";
  const renderMarkers = usePersistFn((mapInstance: google.maps.Map) => {
    markerCleanups.current.forEach((cleanup) => cleanup());
    const labelWarehouseHeroes = showMarkerLabels ?? markers.some((marker) => String(marker.id).startsWith("warehouse-hero-"));
    markerCleanups.current = markers.map((marker) => {
      if (labelWarehouseHeroes && marker.title && window.google?.maps.marker?.AdvancedMarkerElement) {
        const label = document.createElement("div");
        label.textContent = marker.title;
        label.setAttribute("aria-label", `Live location: ${marker.title}`);
        label.style.cssText = "background:#0b3f9b;border:2px solid #ffffff;border-radius:999px;color:#ffffff;font:600 12px Arial,sans-serif;letter-spacing:.01em;padding:7px 10px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35);";
        const advancedMarker = new window.google.maps.marker.AdvancedMarkerElement({ map: mapInstance, position: marker.position, title: marker.title, content: label });
        return () => { advancedMarker.map = null; };
      }
      const legacyMarker = new window.google!.maps.Marker({ map: mapInstance, position: marker.position, title: marker.title });
      return () => legacyMarker.setMap(null);
    });
  });

  const init = usePersistFn(async () => {
    await loadMapScript();
    if (!mapContainer.current) {
      console.error("Map container not found");
      return;
    }
    map.current = new window.google.maps.Map(mapContainer.current, {
      zoom: initialZoom,
      center: initialCenter,
      mapTypeControl: true,
      fullscreenControl: true,
      zoomControl: true,
      streetViewControl: true,
      mapId: "DEMO_MAP_ID",
    });
    renderMarkers(map.current);
    if (onMapReady) {
      onMapReady(map.current);
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (map.current) renderMarkers(map.current);
  }, [markers, renderMarkers]);

  useEffect(() => {
    if (!map.current || !route || !window.google?.maps) {
      setRouteStatus("idle");
      return;
    }
    const service = new window.google.maps.DirectionsService();
    routeRenderer.current?.setMap(null);
    routeRenderer.current = new window.google.maps.DirectionsRenderer({ map: map.current, suppressMarkers: true, preserveViewport: true });
    setRouteStatus("loading");
    service.route({ origin: route.origin, destination: route.destination, waypoints: route.waypoints, travelMode: window.google.maps.TravelMode.DRIVING }, (result, status) => {
      if (status === "OK" && result) {
        routeRenderer.current?.setDirections(result);
        setRouteStatus("ready");
      } else {
        console.warn("FFM route preview unavailable", status);
        setRouteStatus("unavailable");
      }
    });
    return () => { routeRenderer.current?.setMap(null); routeRenderer.current = null; };
  }, [routeKey]);

  return (
    <div ref={mapContainer} className={cn("relative w-full h-[500px]", className)}>
      {routeStatus === "loading" && <div className="absolute left-3 top-3 z-10 rounded-md bg-[#081b3a]/90 px-3 py-2 text-xs text-white">Calculating live route…</div>}
      {routeStatus === "unavailable" && <div className="absolute left-3 top-3 z-10 rounded-md bg-[#081b3a]/90 px-3 py-2 text-xs text-white">Route unavailable; live pins remain visible.</div>}
    </div>
  );
}
