import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDoctorEditState, type DoctorEditRecord, type DoctorRelationship } from "@/lib/doctorForm";

type ClientOption = { id: number; name: string };
type DoctorDraft = { id?: number; clientId: number; name: string; specialty?: string; relationship: DoctorRelationship };

export function DoctorEditor({ doctor, clients, saving, onSave, onCancel }: { doctor?: DoctorEditRecord; clients: ClientOption[]; saving?: boolean; onSave: (draft: DoctorDraft) => void; onCancel?: () => void }) {
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [relationship, setRelationship] = useState<DoctorRelationship>("new");
  const [clientId, setClientId] = useState("");
  useEffect(() => {
    if (!doctor) { setName(""); setSpecialty(""); setRelationship("new"); setClientId(""); return; }
    const form = getDoctorEditState(doctor);
    setName(form.name); setSpecialty(form.specialty); setRelationship(form.relationship); setClientId(form.clientId);
  }, [doctor]);
  return <div className="inline-form" data-testid="doctor-editor"><Input aria-label="Doctor name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Doctor name"/><Input aria-label="Doctor specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Specialty"/><select aria-label="Doctor relationship" className="blueprint-input" value={relationship} onChange={(e) => setRelationship(e.target.value as DoctorRelationship)}><option value="new">New</option><option value="warm">Warm</option><option value="kol">KOL</option><option value="cold">Cold</option></select><select aria-label="Doctor client" className="blueprint-input" value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">Client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select><Button className="blueprint-button" disabled={!name.trim() || !clientId || saving} onClick={() => onSave({ id: doctor?.id, clientId: Number(clientId), name: name.trim(), specialty: specialty || undefined, relationship })}>{saving ? "Saving…" : doctor ? "Update doctor" : "Add doctor"}</Button>{doctor && onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}</div>;
}
