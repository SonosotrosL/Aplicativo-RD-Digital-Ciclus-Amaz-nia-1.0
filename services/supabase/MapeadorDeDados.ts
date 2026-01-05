import { RDData, GeoLocation, ProductionMetrics, AttendanceRecord, TrackSegment } from '../../types';

export class MapeadorDeDados {
    static toSupabase(rd: RDData) {
        return {
            id: rd.id,
            date: rd.date,
            // Metadata
            foreman_id: rd.foremanId,
            foreman_name: rd.foremanName,
            foreman_registration: rd.foremanRegistration,
            supervisor_id: rd.supervisorId,
            supervisor_name: rd.supervisorName,

            status: rd.status,
            base: rd.base,
            shift: rd.shift,
            team: rd.team,
            foreman_team: rd.foremanTeam,
            supervisor_team: rd.supervisorTeam,
            service_category: rd.serviceCategory,

            // Location
            street: rd.street,
            neighborhood: rd.neighborhood,
            perimeter: rd.perimeter,
            location: rd.location ? JSON.stringify(rd.location) : null,

            // Metrics (Store as JSONB)
            metrics: rd.metrics, // JSONB in Supabase

            // Relations/Complex Types (Store as JSONB)
            segments: rd.segments, // JSONB
            team_attendance: rd.teamAttendance, // JSONB

            // Images
            work_photo_initial: rd.workPhotoInitial,
            work_photo_progress: rd.workPhotoProgress,
            work_photo_final: rd.workPhotoFinal,
            work_photo_url: rd.workPhotoUrl,
            signature_image_url: rd.signatureImageUrl,

            observations: rd.observations,
            created_at: new Date(rd.createdAt).toISOString(),
            supervisor_note: rd.supervisorNote
        };
    }

    static fromSupabase(data: any): RDData {
        return {
            id: data.id,
            date: data.date,
            foremanId: data.foreman_id,
            foremanName: data.foreman_name,
            foremanRegistration: data.foreman_registration,
            supervisorId: data.supervisor_id,
            supervisorName: data.supervisor_name,

            status: data.status,
            base: data.base,
            shift: data.shift,
            team: data.team,
            foremanTeam: data.foreman_team,
            supervisorTeam: data.supervisor_team,
            serviceCategory: data.service_category,

            street: data.street,
            neighborhood: data.neighborhood,
            perimeter: data.perimeter,
            location: typeof data.location === 'string' ? JSON.parse(data.location) : data.location,

            metrics: data.metrics as ProductionMetrics,

            segments: data.segments as TrackSegment[] || [],
            teamAttendance: data.team_attendance as AttendanceRecord[] || [],

            workPhotoInitial: data.work_photo_initial,
            workPhotoProgress: data.work_photo_progress,
            workPhotoFinal: data.work_photo_final,

            workPhotoUrl: data.work_photo_url,
            signatureImageUrl: data.signature_image_url,
            observations: data.observations,
            createdAt: new Date(data.created_at).getTime(),
            supervisorNote: data.supervisor_note
        };
    }
}
