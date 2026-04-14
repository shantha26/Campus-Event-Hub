import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Event {
  _id?: string;
  title: string;
  description: string;
  type: 'technical' | 'cultural' | 'sports' | 'workshop' | 'seminar';
  category: 'college' | 'inter-college';
  venue: string;
  startDate: Date | string;
  endDate: Date | string;
  registrationDeadline: Date | string;
  maxParticipants: number;
  currentParticipants?: number;
  registrationFee: number;
  isPaid?: boolean;
  organizer: string;
  contactEmail: string;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdBy?: string;
  imageUrl?: string;
  college?: string;
  pendingCount?: number;
  feedback?: { userId: string; fullName?: string; college?: string; rating: number; comment?: string; createdAt?: Date }[];
  comments?: { _id: string; userId: string; fullName: string; college: string; role: string; text: string; upvotes: number; isPinned: boolean; createdAt: Date }[];
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private apiUrl    = 'http://localhost:5000/api/events';
  private regUrl    = 'http://localhost:5000/api/registrations';
  private collegeUrl = 'http://localhost:5000/api/colleges';
  private reportUrl  = 'http://localhost:5000/api/reports';

  constructor(private http: HttpClient) {}

  // ── Events ──────────────────────────────────────────────
  getAllEvents(filters?: { startDate?: string; endDate?: string; status?: string; type?: string; category?: string; organizer?: string; college?: string; createdBy?: string; }): Observable<Event[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params = params.set(k, v); });
    }
    return this.http.get<Event[]>(this.apiUrl, { params });
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`);
  }

  getEventById(id: string): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/${id}`);
  }

  createEvent(data: FormData | any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateEvent(id: string, data: FormData | any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  computeStatus(event: any): string {
    if (event.status === 'cancelled') return 'cancelled';
    const now = new Date();
    const start = new Date(event.startDate);
    const end   = new Date(event.endDate);
    if (now < start)             return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'completed';
  }

  // ── Registrations ────────────────────────────────────────
  registerForEvent(eventId: string, payload?: any): Observable<any> {
    return this.http.post(`${this.regUrl}/${eventId}/register`, payload || {});
  }

  getMyRegistrations(): Observable<any> {
    return this.http.get(`${this.regUrl}/my/registrations`);
  }

  getEventRegistrations(id: string): Observable<any> {
    return this.http.get(`${this.regUrl}/${id}/registrations`);
  }

  updateRegistrationStatus(id: string, status: 'approved' | 'rejected' | 'pending', rejectionReason?: string): Observable<any> {
    return this.http.patch(`${this.regUrl}/${id}/status`, { status, rejectionReason: rejectionReason || '' });
  }

  bulkUpdateRegistrationStatus(ids: string[], status: 'approved' | 'rejected' | 'pending', rejectionReason?: string): Observable<any> {
    return this.http.patch(`${this.regUrl}/bulk-status`, { ids, status, rejectionReason: rejectionReason || '' });
  }

  unregisterFromEvent(id: string): Observable<any> {
    return this.http.delete(`${this.regUrl}/${id}`);
  }

  getTicket(registrationId: string): Observable<any> {
    return this.http.get(`${this.regUrl}/${registrationId}/ticket`);
  }

  checkIn(registrationId: string): Observable<any> {
    return this.http.post(`${this.regUrl}/${registrationId}/check-in`, {});
  }

  // ── Feedback ─────────────────────────────────────────────
  submitFeedback(id: string, data: { rating: number; comment: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/feedback`, data);
  }

  getPlatformFeedback(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all-feedback`);
  }

  // ── Discussion Forum ─────────────────────────────────────
  getComments(eventId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${eventId}/comments`);
  }

  postComment(eventId: string, text: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${eventId}/comments`, { text });
  }

  upvoteComment(eventId: string, commentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${eventId}/comments/${commentId}/upvote`, {});
  }

  deleteComment(eventId: string, commentId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${eventId}/comments/${commentId}`);
  }

  // ── College Management ───────────────────────────────────
  getCollegeById(id: string): Observable<any> {
    return this.http.get(`${this.collegeUrl}/${id}`);
  }

  updateCollegeStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.collegeUrl}/${id}/status`, { status });
  }

  deleteCollege(id: string): Observable<any> {
    return this.http.delete(`${this.collegeUrl}/${id}`);
  }

  createCollege(collegeData: any): Observable<any> {
    return this.http.post(this.collegeUrl, collegeData);
  }

  updateCollege(id: string, collegeData: any): Observable<any> {
    return this.http.put(`${this.collegeUrl}/${id}`, collegeData);
  }

  // ── Reports ──────────────────────────────────────────────
  getMonthlyReport(): Observable<Blob> {
    return this.http.get(`${this.reportUrl}/monthly`, { responseType: 'blob' });
  }

  getCollegeReport(): Observable<Blob> {
    return this.http.get(`${this.reportUrl}/college`, { responseType: 'blob' });
  }

  getUserReport(): Observable<Blob> {
    return this.http.get(`${this.reportUrl}/user`, { responseType: 'blob' });
  }

  getFinancialReport(): Observable<Blob> {
    return this.http.get(`${this.reportUrl}/financial`, { responseType: 'blob' });
  }

  // ── Helpers ──────────────────────────────────────────────
  resolveImageUrl(url?: string): string {
    const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80';
    if (!url) return DEFAULT_IMAGE;
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
    // Ensure we don't double up on slashes and use the correct backend port
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `http://localhost:5000${cleanPath}`;
  }
}
