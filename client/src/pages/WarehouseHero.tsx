import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/Map";
import { DigitalSignaturePad } from "@/components/DigitalSignaturePad";
import { useUnsavedFormGuard } from "@/hooks/useUnsavedFormGuard";
import { trpc } from "@/lib/trpc";
import { HANDOVER_CHECKLIST, initialHandoverChecklist, isHandoverChecklistComplete, MAX_LIVE_CAMERA_PROOFS, type HandoverChecklistId } from "@/lib/warehouseHandoverCapture";
import { Camera, CheckCircle2, CircleDollarSign, Eye, LocateFixed, LogOut, MapPin, MessageSquare, RotateCcw, Send, Truck, X } from "lucide-react";

type CapturedProof = { id: string; dataUrl: string };

export default function WarehouseHero() {
  const { user, loading, isAuthenticated, logout: performLogout } = useAuth();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"delivery" | "messages">("delivery");
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState("Ready to share your delivery position.");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [proofNote, setProofNote] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [capturedProofs, setCapturedProofs] = useState<CapturedProof[]>([]);
  const [handoverChecklist, setHandoverChecklist] = useState(initialHandoverChecklist);
  const [previewProofId, setPreviewProofId] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [uploadingCount, setUploadingCount] = useState(0);
  const [messageRecipientId, setMessageRecipientId] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const watchId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const messagesReadWorkspaceRef = useRef(false);
  const isWarehouseHero = user?.role === "warehouse_hero";

  const preferences = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const updatePreferences = trpc.preferences.update.useMutation({ onSuccess: () => utils.preferences.get.invalidate() });
  const updateLocation = trpc.operations.updateWarehouseHeroLocation.useMutation();
  const submitHandover = trpc.operations.submitWarehouseHandover.useMutation();
  const proofHistory = trpc.operations.myWarehouseDeliveryProofs.useQuery(undefined, { enabled: isAuthenticated && isWarehouseHero });
  const assignmentStatus = trpc.operations.warehouseHeroAssignmentStatus.useQuery(undefined, { enabled: isAuthenticated && isWarehouseHero });
  const messagesQuery = trpc.operations.messages.useQuery(undefined, { enabled: isAuthenticated && isWarehouseHero && activeTab === "messages" });
  const messageRecipientsQuery = trpc.operations.messageRecipients.useQuery(undefined, { enabled: isAuthenticated && isWarehouseHero && activeTab === "messages" });
  const markMessagesRead = trpc.operations.markMessagesRead.useMutation({ onSuccess: () => messagesQuery.refetch(), onError: () => { messagesReadWorkspaceRef.current = false; } });
  const sendMessage = trpc.operations.sendMessage.useMutation({ onSuccess: () => { setMessageRecipientId(""); setMessageBody(""); messagesQuery.refetch(); }, onError: error => setStatus(error.message) });

  const isAssignedToManager = assignmentStatus.data?.assigned ?? false;
  const unreadMessageCount = messagesQuery.data?.filter(message => message.recipientId === user?.id && !message.readAt).length ?? 0;
  const handoverChecklistComplete = isHandoverChecklistComplete(handoverChecklist);
  const previewProof = capturedProofs.find(proof => proof.id === previewProofId) ?? null;
  const handoverDraftDirty = Boolean(proofNote.trim() || recipientName.trim() || signatureDataUrl || capturedProofs.length || HANDOVER_CHECKLIST.some(item => handoverChecklist[item.id]));
  const { requestLeave } = useUnsavedFormGuard(handoverDraftDirty, "You have an unfinished hospital handover. Leave and discard the recipient details, signature, checklist, and captured photos?");
  const logout = () => requestLeave(performLogout);

  useEffect(() => { setLocationEnabled(preferences.data?.locationSharing ?? false); }, [preferences.data?.locationSharing]);
  useEffect(() => {
    if (activeTab !== "messages") { messagesReadWorkspaceRef.current = false; return; }
    if (isAuthenticated && isWarehouseHero && !messagesReadWorkspaceRef.current && !markMessagesRead.isPending) {
      messagesReadWorkspaceRef.current = true;
      markMessagesRead.mutate();
    }
  }, [activeTab, isAuthenticated, isWarehouseHero, markMessagesRead.isPending, markMessagesRead.mutate]);
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => setCameraError("Camera preview could not start. Please reopen the camera."));
    }
  }, [cameraOpen]);
  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  };
  const startCamera = async () => {
    if (!isAssignedToManager) { setStatus("An Administrator must assign you to a Manager before capturing delivery proof."); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError("Live camera capture is not supported by this browser. Use an up-to-date mobile browser and allow camera access."); return; }
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setCameraError("Camera permission was denied or the camera is unavailable. Allow camera access in browser settings and try again.");
    }
  };
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) { setCameraError("The camera preview is not ready. Please wait a moment and try again."); return; }
    if (capturedProofs.length >= MAX_LIVE_CAMERA_PROOFS) { setCameraError(`A maximum of ${MAX_LIVE_CAMERA_PROOFS} photos can be queued at once.`); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) { setCameraError("Could not capture a camera frame."); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    if (dataUrl.length > 11_200_000) { setCameraError("This camera photo is too large. Move closer or capture a lower-resolution frame."); return; }
    setCapturedProofs(current => [...current, { id: `${Date.now()}-${current.length}`, dataUrl }]);
    setCameraError("");
  };
  const removeCapturedProof = (id: string) => {
    setCapturedProofs(current => current.filter(proof => proof.id !== id));
    if (previewProofId === id) setPreviewProofId(null);
  };
  const retakeCapturedProof = (id: string) => {
    removeCapturedProof(id);
    if (!cameraOpen) void startCamera();
    setCameraError("Photo removed. Capture a replacement through the live camera.");
  };
  const submitProofs = async () => {
    if (!isAssignedToManager) { setStatus("An Administrator must assign you to a Manager before uploading delivery proof."); return; }
    if (!capturedProofs.length) { setStatus("Capture at least one live camera photo first."); return; }
    if (!handoverChecklistComplete) { setStatus("Complete every hospital handover checklist step before submitting delivery proof."); return; }
    if (recipientName.trim().length < 2) { setStatus("Enter the recipient's name before submitting the handover."); return; }
    if (!signatureDataUrl) { setStatus("Capture the recipient's digital signature before submitting the handover."); return; }
    setUploadingCount(capturedProofs.length);
    setStatus(`Uploading ${capturedProofs.length} live-camera photo${capturedProofs.length === 1 ? "" : "s"}…`);
    try {
      await submitHandover.mutateAsync({ recipientName: recipientName.trim(), signatureBase64: signatureDataUrl, note: proofNote.trim() || undefined, proofs: capturedProofs.map((proof, index) => ({ fileName: `live-camera-${Date.now()}-${index + 1}.jpg`, base64: proof.dataUrl })) });
      setCapturedProofs([]);
      setProofNote("");
      setRecipientName("");
      setSignatureDataUrl(null);
      setHandoverChecklist(initialHandoverChecklist());
      setPreviewProofId(null);
      utils.operations.myWarehouseDeliveryProofs.invalidate();
      setStatus("Live-camera delivery proof uploaded. Each photo is now in your history.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "A delivery-proof photo could not be uploaded. The queued photos remain available to retry.");
    } finally {
      setUploadingCount(0);
    }
  };
  const stopTracking = () => {
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current);
    watchId.current = null;
    setTracking(false);
    setStatus("GPS tracking stopped.");
  };
  const startTracking = () => {
    if (!isAssignedToManager) { setStatus("An Administrator must assign you to a Manager before GPS tracking can start."); return; }
    if (!locationEnabled) { setStatus("Turn on location sharing before starting a delivery shift."); return; }
    if (!navigator.geolocation) { setStatus("GPS is unavailable on this device."); return; }
    setStatus("Acquiring GPS position…");
    watchId.current = navigator.geolocation.watchPosition(next => {
      const lat = next.coords.latitude;
      const lng = next.coords.longitude;
      setPosition({ lat, lng });
      updateLocation.mutate({ latitude: lat.toFixed(7), longitude: lng.toFixed(7) }, { onSuccess: () => setStatus(`Location shared at ${new Date().toLocaleTimeString()}.`), onError: error => setStatus(error.message) });
    }, () => setStatus("Location permission was denied or unavailable."), { enableHighAccuracy: true, maximumAge: 15_000, timeout: 15_000 });
    setTracking(true);
  };
  const toggleLocationSharing = (enabled: boolean) => {
    const prior = locationEnabled;
    setLocationEnabled(enabled);
    updatePreferences.mutate({ locationSharing: enabled }, {
      onSuccess: () => { preferences.refetch(); setStatus(enabled ? "Location sharing enabled. You can now start GPS tracking." : "Location sharing disabled. GPS updates are paused."); if (!enabled && tracking) stopTracking(); },
      onError: error => { setLocationEnabled(prior); setStatus(error.message); },
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
      <div className="visit-actions" aria-label="Warehouse Hero workspaces"><Button variant={activeTab === "delivery" ? "default" : "outline"} className={activeTab === "delivery" ? "blueprint-button" : ""} onClick={() => setActiveTab("delivery")}><Truck size={16}/> Delivery</Button><Button variant={activeTab === "messages" ? "default" : "outline"} className={activeTab === "messages" ? "blueprint-button" : ""} onClick={() => setActiveTab("messages")}><MessageSquare size={16}/> Messages{unreadMessageCount > 0 ? ` (${unreadMessageCount})` : ""}</Button><Button variant="outline" onClick={() => window.location.assign("/travel-expenses")}><CircleDollarSign size={16}/> Travel Expenses</Button></div>
      {activeTab === "messages" ? <Card className="blueprint-card section-card"><CardHeader><CardTitle>Team messages</CardTitle><p className="muted">Send an operational update to any authenticated FFM member. Opening this workspace marks messages addressed to you as read.</p></CardHeader><CardContent><div className="form-stack"><label htmlFor="warehouse-message-recipient">Recipient</label><select id="warehouse-message-recipient" value={messageRecipientId} disabled={messageRecipientsQuery.isLoading || sendMessage.isPending} onChange={event => setMessageRecipientId(event.target.value)}><option value="">Choose an FFM member</option>{(messageRecipientsQuery.data || []).map(member => <option key={member.id} value={member.id}>{member.displayName} · {member.role.replace("_", " ")}</option>)}</select><label htmlFor="warehouse-message-body">Message</label><textarea id="warehouse-message-body" value={messageBody} disabled={sendMessage.isPending} onChange={event => setMessageBody(event.target.value)} maxLength={5000} placeholder="Write a delivery or operational update…"/><Button className="blueprint-button" disabled={!messageRecipientId || !messageBody.trim() || sendMessage.isPending} onClick={() => sendMessage.mutate({ recipientId: Number(messageRecipientId), body: messageBody.trim() })}><Send size={16}/>{sendMessage.isPending ? "Sending…" : "Send message"}</Button></div>{messageRecipientsQuery.error && <div className="admin-feedback error">Unable to load recipients: {messageRecipientsQuery.error.message}</div>}<div className="mt-6">{messagesQuery.isLoading ? <div className="admin-feedback">Loading messages…</div> : messagesQuery.error ? <div className="admin-feedback error">Unable to load messages: {messagesQuery.error.message}</div> : messagesQuery.data?.length ? messagesQuery.data.slice().reverse().map(message => <div className={message.senderId === user?.id ? "delegate-message from-me" : "delegate-message from-manager"} key={message.id}><strong>{message.senderId === user?.id ? "You" : message.senderName || "FFM member"}</strong><p>{message.body}</p><small>{new Date(message.createdAt).toLocaleString()}</small></div>) : <div className="admin-feedback">No direct messages yet.</div>}</div></CardContent></Card> : <>
        <Card className="blueprint-card section-card"><CardHeader><CardTitle>Share delivery location</CardTitle><p className="muted">Your Manager can view the latest position only while location sharing is enabled.</p></CardHeader><CardContent>{assignmentStatus.isLoading ? <div className="admin-feedback">Checking Manager assignment…</div> : assignmentStatus.error ? <div className="admin-feedback error">{assignmentStatus.error.message}</div> : isAssignedToManager ? <div className="admin-feedback success">Manager assignment confirmed. GPS tracking and live-camera proof capture are ready.</div> : <div className="admin-feedback error">Waiting for an Administrator to assign you to a Manager. GPS tracking and delivery-proof uploads are unavailable until then.</div>}<div className="visit-actions"><Button variant={locationEnabled ? "outline" : "default"} className={!locationEnabled ? "blueprint-button" : ""} disabled={preferences.isLoading || updatePreferences.isPending} onClick={() => toggleLocationSharing(!locationEnabled)}><MapPin size={16}/>{locationEnabled ? "Disable location sharing" : "Enable location sharing"}</Button><span className="muted">{locationEnabled ? "Consent saved — GPS tracking can start once a Manager assignment is confirmed." : "Enable sharing to activate GPS tracking."}</span></div><MapView className="delegate-map-height small-map" initialCenter={position || { lat: 24.7136, lng: 46.6753 }} initialZoom={position ? 15 : 11} markers={markers}/><div className="admin-feedback">{status}</div><div className="visit-actions"><Button className="blueprint-button" disabled={!isAssignedToManager || !locationEnabled || tracking || updateLocation.isPending || updatePreferences.isPending || assignmentStatus.isLoading} onClick={startTracking}><LocateFixed size={16}/> Start GPS tracking</Button><Button variant="outline" disabled={!tracking} onClick={stopTracking}><MapPin size={16}/> Stop tracking</Button></div>{updateLocation.error && <div className="admin-feedback error">{updateLocation.error.message}</div>}</CardContent></Card>
        <Card className="blueprint-card section-card mt-4"><CardHeader><CardTitle>Live-camera delivery proof</CardTitle><p className="muted">Capture up to 20 delivery photos through the app camera. Device and gallery upload are intentionally unavailable.</p></CardHeader><CardContent><div className="space-y-4"><label className="block text-sm text-slate-200">Recipient full name<Input className="mt-1" value={recipientName} maxLength={160} disabled={uploadingCount > 0} onChange={event => setRecipientName(event.target.value)} placeholder="Name of hospital recipient"/></label><Input value={proofNote} maxLength={1000} onChange={event => setProofNote(event.target.value)} placeholder="Optional delivery note, hospital, or receiving contact"/><p className="text-xs text-slate-400">Live capture strengthens process integrity and records its capture source, but a browser photo cannot independently prove the physical delivery contents.</p><fieldset className="rounded-md border border-cyan-400/25 bg-slate-950/25 p-3"><legend className="px-1 text-sm font-medium text-slate-100">Required hospital handover checklist</legend><p className="mb-3 text-xs text-slate-400">Confirm every step before submitting the delivery-proof photos.</p><div className="space-y-3">{HANDOVER_CHECKLIST.map(item => <label key={item.id} className="flex items-start gap-3 text-sm text-slate-200"><input className="mt-1 h-4 w-4 accent-cyan-400" type="checkbox" checked={handoverChecklist[item.id]} disabled={uploadingCount > 0} onChange={event => setHandoverChecklist(current => ({ ...current, [item.id]: event.target.checked }))}/><span>{item.label}</span></label>)}</div>{!handoverChecklistComplete && <p className="mt-3 text-xs text-amber-200">All four confirmations are required before photo submission.</p>}</fieldset><div className="rounded-md border border-cyan-400/25 bg-slate-950/25 p-3"><p className="mb-1 text-sm font-medium text-slate-100">Recipient digital signature</p><p className="mb-3 text-xs text-slate-400">The receiving hospital representative must sign before this handover can be submitted.</p><DigitalSignaturePad disabled={uploadingCount > 0} onChange={setSignatureDataUrl}/>{!signatureDataUrl && <p className="mt-2 text-xs text-amber-200">A recipient signature is required.</p>}</div>{cameraError && <div className="admin-feedback error">{cameraError}</div>}<canvas ref={canvasRef} className="hidden" aria-hidden="true"/>{cameraOpen ? <div className="space-y-3"><video ref={videoRef} className="h-64 w-full rounded-md bg-slate-950 object-cover" autoPlay muted playsInline/><div className="visit-actions"><Button className="blueprint-button" disabled={capturedProofs.length >= MAX_LIVE_CAMERA_PROOFS || uploadingCount > 0} onClick={capturePhoto}><Camera size={16}/> Capture photo ({capturedProofs.length}/{MAX_LIVE_CAMERA_PROOFS})</Button><Button variant="outline" onClick={stopCamera}><X size={16}/> Close camera</Button></div></div> : <Button className="blueprint-button" disabled={!isAssignedToManager || assignmentStatus.isLoading || uploadingCount > 0} onClick={startCamera}><Camera size={16}/> Open live camera</Button>}{previewProof && <div className="rounded-md border border-cyan-300/35 bg-slate-950/65 p-3"><div className="mb-2 flex items-center justify-between gap-3"><div><strong className="text-sm">Photo preview</strong><p className="text-xs text-slate-400">Review this live-camera JPEG before submission.</p></div><Button variant="outline" size="icon" aria-label="Close photo preview" onClick={() => setPreviewProofId(null)}><X size={15}/></Button></div><img src={previewProof.dataUrl} alt="Full preview of captured delivery proof" className="max-h-[60vh] w-full rounded-md object-contain bg-black"/><div className="mt-3"><Button variant="outline" disabled={uploadingCount > 0} onClick={() => retakeCapturedProof(previewProof.id)}><RotateCcw size={16}/> Retake this photo</Button></div></div>}{capturedProofs.length > 0 && <div><div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">Captured photo queue</p><span className="text-xs text-slate-400">{capturedProofs.length}/{MAX_LIVE_CAMERA_PROOFS}</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{capturedProofs.map((proof, index) => <div className="relative" key={proof.id}><button type="button" className="block w-full rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-300" aria-label={`Preview captured photo ${index + 1}`} onClick={() => setPreviewProofId(proof.id)}><img src={proof.dataUrl} alt={`Captured delivery proof ${index + 1}`} className="h-28 w-full rounded-md object-cover bg-slate-950"/></button><div className="absolute bottom-1 left-1 rounded bg-slate-950/85 px-1.5 py-0.5 text-xs text-slate-100">{index + 1}</div><div className="absolute right-1 top-1 flex gap-1"><Button type="button" variant="outline" size="icon" className="h-7 w-7 bg-slate-950/90" disabled={uploadingCount > 0} aria-label={`Preview captured photo ${index + 1}`} onClick={() => setPreviewProofId(proof.id)}><Eye size={14}/></Button><Button type="button" variant="outline" size="icon" className="h-7 w-7 bg-slate-950/90" disabled={uploadingCount > 0} aria-label={`Remove captured photo ${index + 1}`} onClick={() => removeCapturedProof(proof.id)}><X size={14}/></Button></div></div>)}</div></div>}<Button className="blueprint-button" disabled={!isAssignedToManager || !capturedProofs.length || !handoverChecklistComplete || recipientName.trim().length < 2 || !signatureDataUrl || uploadingCount > 0 || assignmentStatus.isLoading || submitHandover.isPending} onClick={submitProofs}><CheckCircle2 size={16}/>{uploadingCount ? `Uploading ${uploadingCount} remaining…` : `Submit signed handover with ${capturedProofs.length || ""} photo${capturedProofs.length === 1 ? "" : "s"}`}</Button>{submitHandover.error && <div className="admin-feedback error">{submitHandover.error.message}</div>}</div></CardContent></Card>
        <Card className="blueprint-card section-card mt-4"><CardHeader><CardTitle>Your delivery-proof history</CardTitle><p className="muted">Live-camera proof records are available to you and the assigned Manager.</p></CardHeader><CardContent>{proofHistory.isLoading ? <p className="muted">Loading your delivery proofs…</p> : proofHistory.error ? <div className="admin-feedback error">{proofHistory.error.message}</div> : proofHistory.data?.length ? <div className="grid gap-3 sm:grid-cols-2">{proofHistory.data.map(proof => <a key={proof.id} href={proof.url} target="_blank" rel="noreferrer" className="block rounded-md border border-blue-500/30 bg-slate-950/40 p-3 text-sm transition-colors hover:border-blue-300"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={17}/><div className="min-w-0"><strong className="block text-slate-100">Proof #{proof.id}</strong><span className="block text-xs text-slate-400">{new Date(proof.capturedAt).toLocaleString()} · {(proof.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>{proof.note && <span className="mt-1 block text-slate-300">{proof.note}</span>}<span className="mt-2 block text-xs text-blue-300">Open delivery photo</span></div></div></a>)}</div> : <p className="muted">No delivery proofs have been uploaded yet. Your completed live-camera uploads will appear here.</p>}</CardContent></Card>
      </>}
    </main>
  </div>;
}
