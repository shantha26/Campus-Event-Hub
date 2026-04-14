import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { EventService } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-scan-check-in',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './scan-check-in.component.html',
  styleUrls: ['./scan-check-in.component.css']
})
export class ScanCheckInComponent implements OnInit {
  scanInput: string = '';
  loading: boolean = false;
  result: any = null;
  error: string = '';
  recentCheckIns: any[] = [];

  constructor(
    private eventService: EventService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const role = this.authService.getRole();
    if (role !== 'college-admin' && role !== 'superadmin') {
      console.warn('Unauthorized access to scanner. Redirecting...');
      this.router.navigate(['/student-dashboard']);
    }
  }

  processScan() {
    this.error = '';
    this.result = null;
    
    if (!this.scanInput.trim()) {
      this.error = 'Please enter a Registration ID or paste the QR data.';
      return;
    }

    let registrationId = this.scanInput.trim();

    // ERROR: User pasted image data instead of text
    if (registrationId.startsWith('data:image')) {
      this.error = '❌ You pasted a QR image. Please scan the QR with your phone/scanner and paste the resulting TEXT code here.';
      this.loading = false;
      return;
    }

    // Try to parse as JSON in case the user pasted the raw QR data
    try {
      const data = JSON.parse(registrationId);
      if (data.registrationId) {
        registrationId = data.registrationId;
      }
    } catch (e) {
      // Not JSON, assume it's just the ID
    }

    // Final validation: check if ID format is vaguely correct (alphanumeric MongoDB ID)
    if (registrationId.length > 50 || registrationId.includes('/') || registrationId.includes(' ')) {
       this.error = '❌ Invalid Registration ID format. Please ensure you are pasting the correct code.';
       this.loading = false;
       return;
    }

    this.loading = true;
    this.eventService.checkIn(registrationId).subscribe({
      next: (res: any) => {
        this.result = res;
        this.loading = false;
        this.scanInput = ''; // Clear for next scan
        
        // Add to recent list
        if (res.registration) {
          this.recentCheckIns.unshift({
            id: res.registration.id || registrationId,
            studentName: res.registration.studentName || 'Student',
            time: new Date()
          });
          if (this.recentCheckIns.length > 5) this.recentCheckIns.pop();
        }
        
        console.log('✅ Check-in success:', res);
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Check-in failed. Invalid ticket or already checked-in.';
        this.loading = false;
        console.error('❌ Check-in error:', err);
      }
    });
  }

  clearResult() {
    this.result = null;
    this.error = '';
  }

  goBack() {
    this.router.navigate(['/admin-dashboard']);
  }
}
