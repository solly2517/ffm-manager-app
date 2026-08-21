import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { Camera, CheckCircle2, LocateFixed, LogOut, MapPin, MessageSquare, Send, Truck } from "lucide-react";

export default function WarehouseHero() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"delivery" | "messages">("delivery");
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState("Ready to share your delivery position.");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [proofNote, setProofNote] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState("");
  const [messageRecipientId, setMessageRecipientId] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const watchId = useRef<number | null>(null);
  const messagesReadWorkspaceRef = useRef(false);
  const isWarehouseHero = user?.role === "warehouse_hero";

  const preferences = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const updatePreferences = trpc.preferences.update.useMutation({ onSuccess: () => utils.preferences.get.invalidate() });
  const updateLocation = trpc.operations.updateWarehouseHeroLocation.useMutation();
  const uploadProof = trpc.operations.uploadWarehouseDeliveryProof.useMutation();
  const proofHistory = trpc.operations.myWarehouseDeliveryProofs.useQuery(undefined, { enabled: isAuthenticated && isWarehouseHero });
  const assignmentStatus = trpc.operations.warehouseHeroAssignmentStatus.useQuery(undefined, { enabled: isAuthenticated && isWarehouseHero });
  const messagesQuery = trpc.operations.messages.useQuery(undefined, { enabled: isAuthenticated && isWarehouseHero && activeTab === "messages" });
  const messageRecipientsQuery = trpc.operations.messageRecipients.useQuery(undefined, { enabled: isAuthenticated && isWarehouseHero && activeTab === "messages" });
  const markMessagesRead = trpc.operations.markMessagesRead.useMutation({
    onSuccess: () => messagesQuery.refetch(),
    onError: () => { messagesReadWorkspaceRef.current = false; },
  });
  const sendMessage = trpc.operations.sendMessage.useMutation({
    onSuccess: () => { setMessageRecipientId(""); setMessageBody(""); messagesQuery.refetch(); },
    onError: (error) => setStatus(error.message),
  });

  const isAssignedToManager = assignmentStatus.data?.assigned ?? false;
  const locationSharing = locationEnabled;
  const unreadMessageCount = messagesQuery.data?.filter((message) => message.recipientId === user?.id && !message.readAt).length ?? 0;

  useEffect(() => { setLocationEnabled(preferences.data?.locationSharing ?? false); }, [preferences.data?.locationSharing]);
  useEffect(() => {
    if (activeTab !== "messages") { messagesReadWorkspaceRef.current = false; return; }
    if (isAuthenticated && isWarehouseHero && !messagesReadWorkspaceRef.current && !markMessagesRead.isPending) {
      messagesReadWorkspaceRef.current = true;
      markMessagesRead.mutate();
    }
  }, [activeTab, isAuthenticated, isWarehouseHero, markMessagesRead.isPending, markMessagesRead.mutate]);
  useEffect(() => () => { if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current); }, []);

  const stopTracking = () => {
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current);
    watchId.current = null;
    setTracking(false);
    setStatus("GPS tracking stopped.");
  };
  const startTracking = () => {
    if (!isAssignedToManager) { setStatus("An Administrator must assign you to a Manager before GPS tracking can start."); return; }
    if (!locationSharing) { setStatus("Turn on location sharing before starting a delivery shift."); return; }
    if (!navigator.geolocation) { setStatus("GPS is unavailable on this device."); return; }
    setStatus("Acquiring GPS position…");
    watchId.current = navigator.geolocation.watchPosition((next) => {
      const lat = next.coords.latitude;
      const lng = next.coords.longitude;
      setPosition({ lat, lng });
      updateLocation.mutate({ latitude: lat.toFixed(7), longitude: lng.toFixed(7) }, {
        onSuccess: () => setStatus(`Location shared at ${new Date().toLocaleTimeString()}.`),
        onError: (error) => setStatus(error.message),
      });
    }, () => setStatus("Location permission was denied or unavailable."), { enableHighAccuracy: true, maximumAge: 15_000, timeout: 15_000 });
    setTracking(true);
  };
  const toggleLocationSharing = (enabled: boolean) => {
    const prior = locationEnabled;
    setLocationEnabled(enabled);
    updatePreferences.mutate({ locationSharing: enabled }, {
      onSuccess: () => { preferences.refetch(); setStatus(enabled ? "Location sharing enabled. You can now start GPS tracking." : "Location sharing disabled. GPS updates are paused."); if (!enabled && tracking) stopTracking(); },
      onError: (error) => { setLocationEnabled(prior); setStatus(error.message); },
    });
  };
  const selectProof = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setStatus("Use a JPEG, PNG, or WebP delivery-proof photo."); return; }
    if (file.size > 8 * 1024 * 1024) { setStatus("Delivery-proof photos must be 8 MB or smaller."); return; }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => setProofPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  };
  const submitProof = () => {
    if (!isAssignedToManager) { setStatus("An Administrator must assign you to a Manager before uploading delivery proof."); return; }
    if (!proofFile || !proofPreview) { setStatus("Choose a delivery-proof photo first."); return; }
    uploadProof.mutate({ fileName: proofFile.name, mimeType: proofFile.type as "image/jpeg" | "image/png" | "image/webp", base64: proofPreview, note: proofNote || undefined }, {
      onSuccess: () => { setProofFile(null); setProofPreview(""); setProofNote(""); utils.operations.myWarehouseDeliveryProofs.invalidate(); setStatus("Delivery-proof photo uploaded. It now appears in your history below."); },
      onError: (error) => setStatus(error.message),
    });
  };

  if (loading) return <div className="blueprint-page"><div className="blueprint-loader">Loading Warehouse Heroes…</div></div>;
  if (!isAuthenticated) return <div className="blueprint-page login-view"><Card className="login-card blueprint-card"><div className="logo-mark">FFM</div><p className="eyebrow">WAREHOUSE HERO APP</p><h1>FFM Logistics</h1><p className="muted">Secure hospital delivery tracking for warehouse personnel.</p><Button className="w-full mt-6 blueprint-button" onClick={() => startLogin()}>Sign in securely</Button></Card></div>;
  if (!isWarehouseHero) return <div className="blueprint-page login-view"><Card className="login-card blueprint-card"><Truck size={32}/><h1>Warehouse Hero access required</h1><p className="muted">This workspace is available only to accounts invited as Warehouse Heroes.</p><Button variant="outline" onClick={() => logout()}><LogOut size={15}/> Sign out</Button></Card></div>;

  const markers = position ? [{ id: "warehouse-hero-current", position, title: user?.name || user?.email || "Warehouse Hero" }] : [];
  return <div className="delegate-shell">
    <header className="delegate-topbar"><div className="delegate-brand"><div className="logo-mark small">FFM</div><div><strong>Warehouse Heroes</strong><span>Hospital logistics</span></div></div><div className="delegate-user"><span>{user?.name || user?.email}</span><button onClick={() => logout()} aria-label="Sign out"><LogOut size={16}/></button></div></header>
    <main className="delegate-content">
      <div className="delegate-heading"><div><p className="eyebrow">FFM / {activeTab === "messages" ? "MESSAGES" : "DELIVERY GPS"}</p><h1>{activeTab === "messages" ? "Messages" : "Delivery shift"}</h1></div><div className="delegate-live"><span /> {tracking ? "GPS TRACKING ON" : "GPS TRACKING OFF"}</div></div>
      <div className="visit-actions" aria-label="Warehouse Hero workspaces"><Button variant={activeTab === "delivery" ? "default" : "outline"} className={activeTab === "delivery" ? "blueprint-button" : ""} onClick={() => setActiveTab("delivery")}><Truck size={16}/> Delivery</Button><Button variant={activeTab === "messages" ? "default" : "outline"} className={activeTab === "messages" ? "blueprint-button" : ""} onClick={() => setActiveTab("messages")}><MessageSquare size={16}/> Messages{unreadMessageCount > 0 ? ` (${unreadMessageCount})` : ""}</Button></div>
      {activeTab === "messages" ? <Card className="blueprint-card section-card"><CardHeader><div><CardTitle>Team messages</CardTitle><p className="muted">Send an operational update to any authenticated FFM member. Opening this workspace marks messages addressed to you as read.</p></div></CardHeader><CardContent><div className="form-stack"><label htmlFor="warehouse-message-recipient">Recipient</label><select id="warehouse-message-recipient" value={messageRecipientId} disabled={messageRecipientsQuery.isLoading || sendMessage.isPending} onChange={(event) => setMessageRecipientId(event.target.value)}><option value="">Choose an FFM member</option>{(messageRecipientsQuery.data || []).map((member) => <option key={member.id} value={member.id}>{member.displayName} · {member.role.replace("_", " ")}</option>)}</select><label htmlFor="warehouse-message-body">Message</label><textarea id="warehouse-message-body" value={messageBody} disabled={sendMessage.isPending} onChange={(event) => setMessageBody(event.target.value)} maxLength={5000} placeholder="Write a delivery or operational update…"/><Button className="blueprint-button" disabled={!messageRecipientId || !messageBody.trim() || sendMessage.isPending} onClick={() => sendMessage.mutate({ recipientId: Number(messageRecipientId), body: messageBody.trim() })}><Send size={16}/>{sendMessage.isPending ? "Sending…" : "Send message"}</Button></div>{messageRecipientsQuery.error && <div className="admin-feedback error">Unable to load recipients: {messageRecipientsQuery.error.message}</div>}{sendMessage.error && <div className="admin-feedback error">Unable to send: {sendMessage.error.message}</div>}<div className="mt-6">{messagesQuery.isLoading ? <div className="admin-feedback">Loading messages…</div> : messagesQuery.error ? <div className="admin-feedback error">Unable to load messages: {messagesQuery.error.message}</div> : messagesQuery.data?.length ? messagesQuery.data.slice().reverse().map((message) => <div className={message.senderId === user?.id ? "delegate-message from-me" : "delegate-message from-manager"} key={message.id}><strong>{message.senderId === user?.id ? "You" : message.senderName || "FFM member"}</strong><p>{message.body}</p><small>{new Date(message.createdAt).toLocaleString()}</small></div>) : <div className="admin-feedback">No direct messages yet.</div>}</div></CardContent></Card> : <><Card className="blueprint-card section-card"><CardHeader><div><CardTitle>Share delivery location</CardTitle><p className="muted">Your Manager can view the latest position only while location sharing is enabled.</p></div></CardHeader><CardContent>{assignmentStatus.isLoading ? <div className="admin-feedback">Checking Manager assignment…</div> : assignmentStatus.error ? <div className="admin-feedback error">{assignmentStatus.error.message}</div> : isAssignedToManager ? <div className="admin-feedback success">Manager assignment confirmed. GPS tracking and delivery-proof uploads are ready.</div> : <div className="admin-feedback error">Waiting for an Administrator to assign you to a Manager. GPS tracking and delivery-proof uploads are unavailable until then.</div>}<div className="visit-actions"><Button variant={locationSharing ? "outline" : "default"} className={!locationSharing ? "blueprint-button" : ""} disabled={preferences.isLoading || updatePreferences.isPending} onClick={() => toggleLocationSharing(!locationSharing)}><MapPin size={16}/>{locationSharing ? "Disable location sharing" : "Enable location sharing"}</Button><span className="muted">{locationSharing ? "Consent saved — GPS tracking can start once a Manager assignment is confirmed." : "Enable sharing to activate GPS tracking."}</span></div><MapView className="delegate-map-height small-map" initialCenter={position || { lat: 24.7136, lng: 46.6753 }} initialZoom={position ? 15 : 11} markers={markers}/><div className="admin-feedback">{status}</div><div className="visit-actions"><Button className="blueprint-button" disabled={!isAssignedToManager || !locationSharing || tracking || updateLocation.isPending || updatePreferences.isPending || assignmentStatus.isLoading} onClick={startTracking}><LocateFixed size={16}/> Start GPS tracking</Button><Button variant="outline" disabled={!tracking} onClick={stopTracking}><MapPin size={16}/> Stop tracking</Button></div>{updateLocation.error && <div className="admin-feedback error">{updateLocation.error.message}</div>}</CardContent></Card><Card className="blueprint-card section-card mt-4"><CardHeader><div><CardTitle>Delivery-proof photo</CardTitle><p className="muted">Upload a photo of delivered goods, tools, or handover evidence.</p></div></CardHeader><CardContent><div className="space-y-3"><Input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => selectProof(event.target.files?.[0])}/><Input value={proofNote} maxLength={1000} onChange={(event) => setProofNote(event.target.value)} placeholder="Optional delivery note, hospital, or receiving contact"/>{proofPreview && <img src={proofPreview} alt="Selected delivery proof" className="h-48 w-full rounded-md object-contain bg-slate-950"/>}<Button className="blueprint-button" disabled={!isAssignedToManager || !proofFile || uploadProof.isPending || assignmentStatus.isLoading} onClick={submitProof}><Camera size={16}/>{uploadProof.isPending ? "Uploading proof…" : "Upload delivery proof"}</Button>{uploadProof.error && <div className="admin-feedback error">{uploadProof.error.message}</div>}</div></CardContent></Card><Card className="blueprint-card section-card mt-4"><CardHeader><div><CardTitle>Your uploaded proof history</CardTitle><p className="muted">Only you and the assigned Manager can review these proof records.</p></div></CardHeader><CardContent>{proofHistory.isLoading ? <p className="muted">Loading your uploaded proofs…</p> : proofHistory.error ? <div className="admin-feedback error">{proofHistory.error.message}</div> : proofHistory.data?.length ? <div className="grid gap-3 sm:grid-cols-2">{proofHistory.data.map((proof) => <a key={proof.id} href={proof.url} target="_blank" rel="noreferrer" className="block rounded-md border border-blue-500/30 bg-slate-950/40 p-3 text-sm transition-colors hover:border-blue-300"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={17}/><div className="min-w-0"><strong className="block text-slate-100">Proof #{proof.id}</strong><span className="block text-xs text-slate-400">{new Date(proof.capturedAt).toLocaleString()} · {(proof.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>{proof.note && <span className="mt-1 block text-slate-300">{proof.note}</span>}<span className="mt-2 block text-xs text-blue-300">Open uploaded photo</span></div></div></a>)}</div> : <p className="muted">No delivery proofs have been uploaded yet. Your completed uploads will appear here.</p>}</CardContent></Card></>}
    </main>
  </div>;
}
