import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { EventService } from '../../services/event.service';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.css']
})
export class SuperAdminDashboardComponent implements OnInit {
  currentView = signal<'overview' | 'users' | 'events' | 'reports' | 'settings'>('overview');
  currentDate = new Date();
  isLoading = false;

  // Profile modal
  showProfileModal = false;

  // Stats (from analytics API)
  totalUsers    = 0;
  totalStudents = 0;
  totalAdmins   = 0;
  totalEvents   = 0;
  upcomingEvents = 0;
  ongoingEvents  = 0;
  completedEvents = 0;
  totalRegistrations  = 0;
  pendingRegistrations = 0;
  approvedRegistrations = 0;
  totalColleges = 0;
  monthlyRegistrations: any[] = [];

  // Events
  events: any[] = [];
  filteredEvents: any[] = [];
  eventSearchTerm  = '';
  eventStatusFilter = 'all';
  eventTypeFilter   = 'all';
  startDateFilter   = '';
  endDateFilter     = '';
  eventsLoading     = false;

  // Users (real from DB)
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  userSearchTerm   = '';
  userRoleFilter   = 'all';
  usersLoading     = false;

  constructor(
    public  authService: AuthService,
    private router: Router,
    private eventService: EventService,
    private chatService: ChatService
  ) {
    effect(() => {
      const req = this.chatService.navRequest();
      if (!req) return;
      if (req === 'SA_VIEW_EVENTS')  { this.setView('events');  this.loadEvents(); }
      if (req === 'SA_VIEW_REPORTS') { this.setView('reports'); }
      this.chatService.navRequest.set(null);
    });
  }

  ngOnInit() {
    if (!this.authService.isLoggedIn() || !this.authService.isAuthorized('superadmin')) {
      this.authService.logout();
      this.router.navigate(['/login']);
      return;
    }
    this.loadAnalytics();
    this.loadEvents();
    this.loadUsers();
    this.syncUserProfile();
  }


  // ── Sync profile from server ───────────────────────────
  syncUserProfile() {
    this.authService.getMe().subscribe({
      next: (user: any) => {
        const current = this.authService.getUser();
        if (current && user?.college) {
          current.college = user.college;
          localStorage.setItem('user', JSON.stringify(current));
        }
      },
      error: () => {}
    });
  }

  // ── Analytics ──────────────────────────────────────────
  loadAnalytics() {
    this.authService.getPlatformAnalytics().subscribe({
      next: (data: any) => {
        this.totalUsers    = data.users?.total    || 0;
        this.totalStudents = data.users?.students || 0;
        this.totalAdmins   = data.users?.admins   || 0;
        this.totalEvents   = data.events?.total   || 0;
        this.upcomingEvents  = data.events?.upcoming  || 0;
        this.ongoingEvents   = data.events?.ongoing   || 0;
        this.completedEvents = data.events?.completed || 0;
        this.totalRegistrations   = data.registrations?.total    || 0;
        this.pendingRegistrations = data.registrations?.pending  || 0;
        this.approvedRegistrations = data.registrations?.approved || 0;
        this.totalColleges = data.colleges || 0;
        this.monthlyRegistrations = data.monthlyRegistrations || [];
      },
      error: (err: any) => console.error('Analytics error:', err)
    });
  }

  // ── Events ─────────────────────────────────────────────
  loadEvents() {
    this.eventsLoading = true;
    const filters: any = {};
    if (this.startDateFilter)               filters.startDate = this.startDateFilter;
    if (this.endDateFilter)                 filters.endDate   = this.endDateFilter;
    if (this.eventStatusFilter !== 'all')   filters.status    = this.eventStatusFilter;
    if (this.eventTypeFilter   !== 'all')   filters.type      = this.eventTypeFilter;

    this.eventService.getAllEvents(filters).subscribe({
      next: (events: any) => {
        const list = Array.isArray(events) ? events : events?.events || [];
        this.events = list;
        this.applyEventSearch();
        this.eventsLoading = false;
      },
      error: () => { this.events = []; this.filteredEvents = []; this.eventsLoading = false; }
    });
  }

  applyEventSearch() {
    const term = this.eventSearchTerm.toLowerCase().trim();
    this.filteredEvents = this.events.filter(e =>
      !term ||
      e.title?.toLowerCase().includes(term) ||
      e.organizer?.toLowerCase().includes(term) ||
      e.venue?.toLowerCase().includes(term)
    );
  }

  onEventFilterChange() { this.loadEvents(); }
  onEventSearch()       { this.applyEventSearch(); }
  clearEventFilters() {
    this.eventSearchTerm = ''; this.eventStatusFilter = 'all';
    this.eventTypeFilter = 'all'; this.startDateFilter = ''; this.endDateFilter = '';
    this.loadEvents();
  }

  // ── Users (real data) ──────────────────────────────────
  loadUsers() {
    this.usersLoading = true;
    this.authService.getAllUsers(
      this.userRoleFilter !== 'all' ? this.userRoleFilter : undefined,
      this.userSearchTerm || undefined
    ).subscribe({
      next: (users: any[]) => {
        this.allUsers      = users;
        this.filteredUsers = users;
        this.usersLoading  = false;
      },
      error: () => { this.allUsers = []; this.filteredUsers = []; this.usersLoading = false; }
    });
  }

  applyUserFilters() {
    const term = this.userSearchTerm.toLowerCase().trim();
    this.filteredUsers = this.allUsers.filter(u => {
      const matchRole   = this.userRoleFilter === 'all' || u.role === this.userRoleFilter;
      const matchSearch = !term ||
        u.fullName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)    ||
        u.college?.toLowerCase().includes(term);
      return matchRole && matchSearch;
    });
  }

  onUserSearch()       { this.applyUserFilters(); }
  onUserRoleChange()   { this.applyUserFilters(); }
  clearUserFilters()   { this.userSearchTerm = ''; this.userRoleFilter = 'all'; this.applyUserFilters(); }

  suspendUser(id: string) {
    if (!confirm('Suspend this user?')) return;
    this.authService.updateUserStatus(id, 'suspended').subscribe({
      next: () => {
        const u = this.allUsers.find((x: any) => x._id === id);
        if (u) u.status = 'suspended';
        this.applyUserFilters();
      }
    });
  }

  activateUser(id: string) {
    this.authService.updateUserStatus(id, 'active').subscribe({
      next: () => {
        const u = this.allUsers.find((x: any) => x._id === id);
        if (u) u.status = 'active';
        this.applyUserFilters();
      }
    });
  }

  // ── View ───────────────────────────────────────────────
  setView(view: 'overview' | 'users' | 'events' | 'reports' | 'settings') {
    this.currentView.set(view);
    if (view === 'events') this.loadEvents();
    if (view === 'users')  this.loadUsers();
  }

  // ── Profile ────────────────────────────────────────────
  openProfileModal()  { this.showProfileModal = true; }
  closeProfileModal() { this.showProfileModal = false; }

  getFullName(): string { return this.authService.getFullName() || 'Super Admin'; }
  getEmail():    string { return this.authService.getEmail()    || ''; }
  getRole():     string { return this.authService.getRole()     || 'superadmin'; }
  getCollege():  string { return (this.authService.getUser() as any)?.college || 'Platform Administration'; }
  getInitial():  string { return this.getFullName().charAt(0).toUpperCase(); }

  // ── Logout ─────────────────────────────────────────────
  logout() { this.authService.logout(); this.router.navigate(['/login']); }

  // ── Helpers ────────────────────────────────────────────
  formatDate(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      active: 'badge-success', suspended: 'badge-danger',
      pending: 'badge-pending', upcoming: 'badge-info',
      ongoing: 'badge-success', completed: 'badge-secondary',
      cancelled: 'badge-danger', student: 'badge-info',
      'college-admin': 'badge-primary', superadmin: 'badge-warning'
    };
    return map[status?.toLowerCase()] || 'badge-info';
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      student: 'Student', 'college-admin': 'College Admin', superadmin: 'Super Admin'
    };
    return map[role] || role;
  }

  getUpcomingEventsCount() { return this.upcomingEvents; }

  getMonthLabel(month: number): string {
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month - 1] || '';
  }

  getMaxMonthlyCount(): number {
    return Math.max(...this.monthlyRegistrations.map(m => m.count), 1);
  }

  viewEvent(id: string)  { alert('Event detail view — ID: ' + id); }
  cancelEvent(id: string) {
    if (confirm('Cancel this event?')) alert('Cancelled ' + id);
  }

  generateReport(type: string) { alert('Generating ' + type + ' report...'); }
  exportData(type: string)     { alert('Exporting '   + type + ' data...'); }
  saveSettings()               { alert('Settings saved'); }
}
