import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface UserData {
  token: string;
  role: string;
  fullName: string;
  email: string;
  userId?: string;
  college?: string;
  walletBalance?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/auth';
  public loginEvent$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  // ── Authentication ───────────────────────────────────────
  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');
    localStorage.removeItem('email');
    localStorage.removeItem('user');
    this.loginEvent$.next();
  }

  // ── User Data ────────────────────────────────────────────
  saveUserData(token: string, role: string, fullName: string, email: string, userId?: string, college?: string, walletBalance?: number) {
    const user: UserData = { token, role, fullName, email, userId, college, walletBalance };
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('fullName', fullName);
    localStorage.setItem('email', email);
    localStorage.setItem('user', JSON.stringify(user));
    this.loginEvent$.next();
  }

  getUser(): UserData | null {
    try {
      const s = localStorage.getItem('user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }

  getToken():    string | null { return localStorage.getItem('token'); }
  getRole():     string | null { return this.getUser()?.role     || localStorage.getItem('role')     || null; }
  getFullName(): string | null { return this.getUser()?.fullName || localStorage.getItem('fullName') || null; }
  getEmail():    string | null { return this.getUser()?.email    || localStorage.getItem('email')    || null; }
  getUserId():   string | null { return this.getUser()?.userId   || null; }
  getCollege():  string | null { return this.getUser()?.college  || null; }

  getWallet(): number {
    return this.getUser()?.walletBalance || 0;
  }

  updateWalletBalance(balance: number) {
    const user = this.getUser();
    if (user) {
      user.walletBalance = balance;
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  isLoggedIn(): boolean { return !!this.getToken(); }

  isAuthorized(expectedRole: string | string[]): boolean {
    const role = this.getRole();
    if (!role || !this.isLoggedIn()) return false;
    const allowed = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
    return allowed.includes(role);
  }

  // ── Wallet ───────────────────────────────────────────────
  getWalletBalance(): Observable<any> {
    return this.http.get(`${this.apiUrl}/wallet`);
  }

  topUpWallet(amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/wallet/topup`, { amount });
  }

  // ── User Management ──────────────────────────────────────
  getMe(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`);
  }

  getUserById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`);
  }

  updateUserRole(id: string, role: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${id}/role`, { role });
  }

  // ── Super Admin ──────────────────────────────────────────
  getAllUsers(role?: string, search?: string): Observable<any> {
    let params = new HttpParams();
    if (role   && role   !== 'all') params = params.set('role',   role);
    if (search && search.trim())    params = params.set('search', search.trim());
    return this.http.get(`${this.apiUrl}/users`, { params });
  }

  updateUserStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${id}/status`, { status });
  }

  getPlatformAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics`);
  }
}
