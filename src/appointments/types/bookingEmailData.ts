/**
 * Interface para datos del email de booking
 */
export interface BookingEmailData {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  appointmentDate: string;
  appointmentTime: string;
  location: string;
  amount: number;
  paymentMethod: string;
  expiresAt?: Date;
}
