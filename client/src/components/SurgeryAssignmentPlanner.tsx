import { useEffect, useMemo, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

export function SurgeryAssignmentPlanner() {
  const utils = trpc.useUtils();
  const assignmentOptions = trpc.operations.surgeryAssignmentOptions.useQuery();
  const clients = trpc.operations.clients.useQuery();
  const doctors = trpc.operations.doctors.useQuery();
  const [managerId, setManagerId] = useState("");
  const [delegateId, setDelegateId] = useState("");
  const [clientId, setClientId] = useState("");
  const [procedureName, setProcedureName] = useState("");
  const [surgeryDate, setSurgeryDate] = useState("");
  const [hospital, setHospital] = useState("");
  const [surgeon, setSurgeon] = useState("");
  const [notice, setNotice] = useState("");
  const canChooseManager = assignmentOptions.data?.canChooseManager ?? false;
  const effectiveManagerId = managerId || (!delegateId ? String(assignmentOptions.data?.defaultManagerId ?? "") : "");
  const selectedClient = clients.data?.find(client => client.id === Number(clientId));
  const eligibleDelegates = useMemo(() => (assignmentOptions.data?.delegates ?? []).filter(delegate => !managerId || delegate.managerIds.includes(Number(managerId))), [assignmentOptions.data?.delegates, managerId]);
  const clientDoctors = useMemo(() => (doctors.data ?? []).filter(doctor => doctor.clientId === Number(clientId)), [doctors.data, clientId]);

  useEffect(() => {
    setHospital(selectedClient?.name ?? "");
    setSurgeon("");
  }, [selectedClient?.id, selectedClient?.name]);
  useEffect(() => {
    if (delegateId && !eligibleDelegates.some(delegate => delegate.id === Number(delegateId))) setDelegateId("");
  }, [delegateId, eligibleDelegates]);

  const createSurgery = trpc.operations.createManagerSurgery.useMutation({
    onSuccess: async () => {
      setNotice("Surgery plan saved to the shared calendar.");
      setDelegateId(""); setManagerId(""); setClientId(""); setProcedureName(""); setSurgeryDate(""); setHospital(""); setSurgeon("");
      await Promise.all([utils.operations.surgeries.invalidate(), utils.operations.surgeryCalendar.invalidate()]);
    },
    onError: () => setNotice("Surgery could not be saved. Please check the required details and try again."),
  });
  const canSubmit = Boolean((effectiveManagerId || delegateId) && clientId && procedureName.trim() && surgeryDate);

  return <section className="blueprint-card section-card surgery-assignment-planner">
    <div className="section-heading"><div><p className="eyebrow">Surgery ownership</p><h2>Assign Manager or Delegate</h2><p className="muted">Choose a Manager, a Delegate, or both. When both are selected, the Delegate must belong to the selected Manager.</p></div></div>
    {assignmentOptions.isLoading ? <div className="admin-feedback">Loading authorized assignment options…</div> : assignmentOptions.error ? <div className="admin-feedback error">{assignmentOptions.error.message}</div> : <div className="grid gap-3 md:grid-cols-2">
      {canChooseManager && <div><Label htmlFor="surgery-assigned-manager">Assigned Manager <span className="muted">(optional)</span></Label><select id="surgery-assigned-manager" className="ffm-select mt-1" value={managerId} onChange={event => setManagerId(event.target.value)}><option value="">{assignmentOptions.data?.defaultManagerId ? "My own Manager responsibility" : "No Manager assigned"}</option>{(assignmentOptions.data?.managers ?? []).map(manager => <option key={manager.id} value={manager.id}>{manager.name}{manager.email ? ` · ${manager.email}` : ""}</option>)}</select></div>}
      <div><Label htmlFor="surgery-assigned-delegate">Assigned Delegate <span className="muted">(optional)</span></Label><select id="surgery-assigned-delegate" className="ffm-select mt-1" value={delegateId} onChange={event => setDelegateId(event.target.value)}><option value="">No Delegate assigned</option>{eligibleDelegates.map(delegate => <option key={delegate.id} value={delegate.id}>{delegate.name}{delegate.email ? ` · ${delegate.email}` : ""}</option>)}</select></div>
      <div><Label htmlFor="surgery-assignment-client">Hospital / client</Label><select id="surgery-assignment-client" className="ffm-select mt-1" value={clientId} onChange={event => setClientId(event.target.value)}><option value="">Choose hospital / client</option>{(clients.data ?? []).map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div>
      <div><Label htmlFor="surgery-assignment-procedure">Procedure</Label><Input id="surgery-assignment-procedure" value={procedureName} onChange={event => setProcedureName(event.target.value)} placeholder="Procedure name" maxLength={220}/></div>
      <div><Label htmlFor="surgery-assignment-date">Surgery date</Label><Input id="surgery-assignment-date" type="date" value={surgeryDate} onChange={event => setSurgeryDate(event.target.value)}/></div>
      <div><Label htmlFor="surgery-assignment-hospital">Hospital</Label><Input id="surgery-assignment-hospital" value={hospital} readOnly placeholder="Select hospital / client first"/></div>
      <div><Label htmlFor="surgery-assignment-surgeon">Surgeon</Label><select id="surgery-assignment-surgeon" className="ffm-select mt-1" value={surgeon} disabled={!clientId} onChange={event => setSurgeon(event.target.value)}><option value="">{clientId ? "Choose surgeon (optional)" : "Select hospital / client first"}</option>{clientDoctors.map(doctor => <option key={doctor.id} value={doctor.name}>{doctor.name}</option>)}</select></div>
      <div className="flex items-end"><Button className="blueprint-button w-full" disabled={!canSubmit || createSurgery.isPending} onClick={() => createSurgery.mutate({ managerId: effectiveManagerId ? Number(effectiveManagerId) : undefined, delegateId: delegateId ? Number(delegateId) : undefined, clientId: Number(clientId), surgeryDate: new Date(surgeryDate), procedureName: procedureName.trim(), hospital: hospital || undefined, surgeon: surgeon || undefined })}><CalendarPlus size={16}/>{createSurgery.isPending ? "Saving…" : "Plan surgery"}</Button></div>
    </div>}
    {notice && <div className={createSurgery.error ? "admin-feedback error mt-4" : "admin-feedback success mt-4"}>{notice}</div>}
  </section>;
}
