import { Injectable, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { timer, Subscription, switchMap, catchError, of, EMPTY } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface AppNotification {
  _id: string; type: string; title: string;
  message: string; eventId?: string;
  read: boolean; createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private apiUrl = 'http://localhost:5000/api/notifications';
  notifications = signal<AppNotification[]>([]);
  private pollSub?: Subscription;

  constructor(private http: HttpClient, private auth: AuthService) {
    // Only poll when logged in; catchError silently — never crash
    this.pollSub = timer(0, 20000).pipe(
      filter(() => !!this.auth.getToken()),
      switchMap(() =>
        this.http.get<AppNotification[]>(this.apiUrl).pipe(
          catchError(() => of([] as AppNotification[]))
        )
      )
    ).subscribe(data => {
      if (Array.isArray(data)) this.notifications.set(data);
    });
  }

  get unreadCount() { return this.notifications().filter(n => !n.read).length; }

  reload() {
    if (!this.auth.getToken()) return;
    this.http.get<AppNotification[]>(this.apiUrl).pipe(
      catchError(() => of([] as AppNotification[]))
    ).subscribe(data => {
      if (Array.isArray(data)) this.notifications.set(data);
    });
  }

  markRead(id: string) {
    this.http.patch(`${this.apiUrl}/${id}/read`, {}).pipe(catchError(() => EMPTY)).subscribe();
    this.notifications.update(ns => ns.map(n => n._id === id ? { ...n, read: true } : n));
  }

  markAllRead() {
    this.http.patch(`${this.apiUrl}/mark-all-read`, {}).pipe(catchError(() => EMPTY)).subscribe();
    this.notifications.update(ns => ns.map(n => ({ ...n, read: true })));
  }

  delete(id: string) {
    this.http.delete(`${this.apiUrl}/${id}`).pipe(catchError(() => EMPTY)).subscribe();
    this.notifications.update(ns => ns.filter(n => n._id !== id));
  }

  clear() { this.notifications.set([]); }

  ngOnDestroy() { this.pollSub?.unsubscribe(); }
}
