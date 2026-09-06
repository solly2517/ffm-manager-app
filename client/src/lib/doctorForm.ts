export type DoctorRelationship = "new" | "warm" | "kol" | "cold";

export type DoctorEditRecord = {
  id: number;
  clientId: number;
  name: string;
  specialty: string | null;
  relationship: DoctorRelationship;
};

export function getDoctorEditState(doctor: DoctorEditRecord) {
  return {
    id: doctor.id,
    clientId: String(doctor.clientId),
    name: doctor.name,
    specialty: doctor.specialty || "",
    relationship: doctor.relationship,
  };
}
  
