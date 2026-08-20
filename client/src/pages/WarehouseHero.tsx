import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { Camera, LocateFixed, LogOut, MapPin, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function WarehouseHero() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();
  const preferences = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const updatePreferences = trpc.preferences.update.useMutation({ onSuccess: () => utils.preferences.get.invalidate() });
  const updateLocation = trpc.operations.updateWarehouseHeroLocation.useMutation();
  const uploadProof = trpc.operations.uploadWarehouseDeliveryProof.useMutation();
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState("Ready to share your delivery position.");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [proofNote, setProofNote] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState("");
  const watchId = useRef<number | null>(null);
  const isWarehouseHero = user?.role === "warehouse_hero";
  const locationSharing = locationEnabled;
  useEffect(() => { setLocationEnabled(preferences.data?.locationSharing ?? false); }, [preferences.data?.locationSharing]);

  const stopTracking = () => { if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current); watchId.current = null; setTracking(false); setStatus("GPS tracking stopped."); };
  const startTracking = () => {
    if (!locationSharing) { setStatus("Turn on location sharing before starting a delivery shift."); return; }
    if (!navigator.geolocation) { setStatus("GPS is unavailable on this device."); return; }
    setStatus("Acquiring GPS position…");
    watchId.current = navigator.geolocation.watchPosition((next) => {
      const lat = next.coords.latitude; const lng = next.coords.longitude; setPosition({ lat, lng });
      updateLocation.mutate({ latitude: lat.toFixed(7), longitude: lng.toFixed(7) }, { onSuccess: () => setStatus(`Location shared at ${new Date().toLocaleTimeString()}.`), onError: (error) => setStatus(error.message) });
    }, () => setStatus("Location permission was denied or unavailable."), { enableHighAccuracy: true, maximumAge: 15_000, timeout: 15_000 });
    setTracking(true);
  };
  const toggleLocationSharing = (enabled: boolean) => {
    const prior = locationEnabled; setLocationEnabled(enabled); setStatus(enabled ? "Saving location-sharing permission…" : "Location sharing disabled. GPS updates are paused.");
    updatePreferences.mutate({ locationSharing: enabled }, { onSuccess: () => { preferences.refetch(); setStatus(enabled ? "Location sharing enabled. You can now start GPS tracking." : "Location sharing disabled. GPS updates are paused."); if (!enabled && tracking) stopTracking(); }, onError: (error) => { setLocationEnabled(prior); setStatus(error.message); } });
  };
  const selectProof = (file: File | undefined) => { if (!file) return; if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setStatus("Use a JPEG, PNG, or WebP delivery-proof photo."); return; } if (file.size > 8 * 1024 * 1024) { setStatus("Delivery-proof photos must be 8 MB or smaller."); return; } setProofFile(file); const reader = new FileReader(); reader.onload = () => setProofPreview(String(reader.result || "")); reader.readAsDataURL(file); };
  const submitProof = () => { if (!proofFile || !proofPreview) { setStatus("Choose a delivery-proof photo first."); return; } uploadProof.mutate({ fileName: proofFile.name, mimeType: proofFile.type as "image/jpeg" | "image/png" | "image/webp", base64: proofPreview, note: proofNote || undefined }, { onSuccess: () => { setProofFile(null); setProofPreview(""); setProofNote(""); setStatus("Delivery-proof photo uploaded for the assigned Manager."); }, onError: (error) => setStatus(error.message) }); };
  useEffect(() => () => { if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current); }, []);

  if (loading) return <div className="blueprint-page"><div className="blueprint-loader">Loading Warehouse Heroes…</div></div>;
  if (!isAuthenticated) return <div className="blueprint-page login-view"><Card className="login-card blueprint-card"><div className="logo-mark">FFM</div><p className="eyebrow">WAREHOUSE HERO APP</p><h1>FFM Logistics</h1><p className="muted">Secure hospital delivery tracking for warehouse personnel.</p><Button className="w-full mt-6 blueprint-button" onClick={() => startLogin()}>Sign in securely</Button></Card></div>;
  if (!isWarehouseHero) return <div className="blueprint-page login-view"><Card className="login-card blueprint-card"><Truck size={32}/><h1>Warehouse Hero access required</h1><p className="muted">This workspace is available only to accounts invited as Warehouse Heroes.</p><Button variant="outline" onClick={() => logout()}><LogOut size={15}/> Sign out</Button></Card></div>;
  const markers = position ? [{ id: "warehouse-hero-current", position, title: user?.name || user?.email || "Warehouse Hero" }] : [];
  return <div className="delegate-shell"><header className="delegate-topbar"><div className="delegate-brand"><div className="logo-mark small">FFM</div><div><strong>Warehouse Heroes</strong><span>Hospital logistics</span></div></div><div className="delegate-user"><span>{user?.name || user?.email}</span><button onClick={() => logout()}><LogOut size={16}/></button></div></header><main className="delegate-content"><div className="delegate-heading"><div><p className="eyebrow">FFM / DELIVERY GPS</p><h1>Delivery shift</h1></div><div className="delegate-live"><span /> {tracking ? "GPS TRACKING ON" : "GPS TRACKING OFF"}</div></div><Card className="blueprint-card section-card"><CardHeader><div><CardTitle>Share delivery location</CardTitle><p className="muted">Your Manager can view the latest position only while location sharing is enabled.</p></div></CardHeader><CardContent><div className="visit-actions"><Button variant={locationSharing ? "outline" : "default"} className={!locationSharing ? "blueprint-button" : ""} disabled={preferences.isLoading || updatePreferences.isPending} onClick={() => toggleLocationSharing(!locationSharing)}><MapPin size={16}/>{locationSharing ? "Disable location sharing" : "Enable location sharing"}</Button><span className="muted">{locationSharing ? "Consent saved — GPS tracking can start." : "Enable sharing to activate GPS tracking."}</span></div><MapView className="delegate-map-height small-map" initialCenter={position || { lat: 24.7136, lng: 46.6753 }} initialZoom={position ? 15 : 11} markers={markers}/><div className="admin-feedback">{status}</div><div className="visit-actions"><Button className="blueprint-button" disabled={!locationSharing || tracking || updateLocation.isPending || updatePreferences.isPending} onClick={startTracking}><LocateFixed size={16}/> Start GPS tracking</Button><Button variant="outline" disabled={!tracking} onClick={stopTracking}><MapPin size={16}/> Stop tracking</Button></div>{updateLocation.error && <div className="admin-feedback error">{updateLocation.error.message}</div>}</CardContent></Card><Card className="blueprint-card section-card mt-4"><CardHeader><div><CardTitle>Delivery-proof photo</CardTitle><p className="muted">Upload a photo of delivered goods, tools, or handover evidence. Your assigned Manager can review it.</p></div></CardHeader><CardContent><div className="space-y-3"><Input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => selectProof(event.target.files?.[0])}/><Input value={proofNote} maxLength={1000} onChange={(event) => setProofNote(event.target.value)} placeholder="Optional delivery note, hospital, or receiving contact"/>{proofPreview && <img src={proofPreview} alt="Selected delivery proof" className="h-48 w-full rounded-md object-contain bg-slate-950"/>}<Button className="blueprint-button" disabled={!proofFile || uploadProof.isPending} onClick={submitProof}><Camera size={16}/>{uploadProof.isPending ? "Uploading proof…" : "Upload delivery proof"}</Button>{uploadProof.error && <div className="admin-feedback error">{uploadProof.error.message}</div>}</div></CardContent></Card></main></div>;
}
