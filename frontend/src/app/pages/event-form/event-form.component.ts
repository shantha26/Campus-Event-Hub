import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-container">
      <h2>Create New Event</h2>
      
      <form (ngSubmit)="onSubmit()" #eventForm="ngForm">
        <div class="form-group">
          <label>Event Title</label>
          <input 
            type="text" 
            class="form-control"
            [(ngModel)]="eventData.title"
            name="title"
            required>
        </div>
        
        <div class="form-group">
          <label>Description</label>
          <textarea 
            class="form-control"
            [(ngModel)]="eventData.description"
            name="description"
            rows="4"
            required></textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Type</label>
            <select 
              class="form-control"
              [(ngModel)]="eventData.type"
              name="type"
              required>
              <option value="technical">Technical</option>
              <option value="cultural">Cultural</option>
              <option value="sports">Sports</option>
              <option value="workshop">Workshop</option>
              <option value="seminar">Seminar</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Category</label>
            <select 
              class="form-control"
              [(ngModel)]="eventData.category"
              name="category"
              required>
              <option value="college">College Level</option>
              <option value="inter-college">Inter-College</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label>Venue</label>
          <input 
            type="text" 
            class="form-control"
            [(ngModel)]="eventData.venue"
            name="venue"
            required>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Start Date</label>
            <input 
              type="datetime-local" 
              class="form-control"
              [(ngModel)]="eventData.startDate"
              name="startDate"
              required>
          </div>
          
          <div class="form-group">
            <label>End Date</label>
            <input 
              type="datetime-local" 
              class="form-control"
              [(ngModel)]="eventData.endDate"
              name="endDate"
              required>
          </div>
        </div>
        
        <div class="form-group">
          <label>Registration Deadline</label>
          <input 
            type="datetime-local" 
            class="form-control"
            [(ngModel)]="eventData.registrationDeadline"
            name="registrationDeadline"
            required>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Max Participants</label>
            <input 
              type="number" 
              class="form-control"
              [(ngModel)]="eventData.maxParticipants"
              name="maxParticipants"
              min="1"
              required>
          </div>
          
          <div class="form-group">
            <label>Registration Fee (₹)</label>
            <input 
              type="number" 
              class="form-control"
              [(ngModel)]="eventData.registrationFee"
              name="registrationFee"
              min="0"
              required>
          </div>
        </div>
        
        <div class="form-group">
          <label>Organizer</label>
          <input 
            type="text" 
            class="form-control"
            [(ngModel)]="eventData.organizer"
            name="organizer"
            required>
        </div>
        
        <div class="form-group">
          <label>Contact Email</label>
          <input 
            type="email" 
            class="form-control"
            [(ngModel)]="eventData.contactEmail"
            name="contactEmail"
            required>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-cancel" (click)="cancel()">Cancel</button>
          <button type="submit" class="btn-submit" [disabled]="!eventForm.form.valid">
            Create Event
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .form-container {
      max-width: 800px;
      margin: 20px auto;
      padding: 30px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    h2 {
      margin-bottom: 30px;
      color: #333;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
      color: #555;
    }
    
    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .form-control:focus {
      outline: none;
      border-color: #667eea;
    }
    
    textarea.form-control {
      resize: vertical;
    }
    
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 15px;
      margin-top: 30px;
    }
    
    .btn-submit {
      padding: 10px 20px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .btn-submit:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .btn-cancel {
      padding: 10px 20px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  `]
})
export class EventFormComponent implements OnInit {
  eventData: any = {
    title: '',
    description: '',
    type: 'technical',
    category: 'college',
    venue: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    maxParticipants: 100,
    registrationFee: 0,
    organizer: '',
    contactEmail: ''
  };

  constructor(
    private eventService: EventService,
    private router: Router
  ) {}

  ngOnInit() {}

  onSubmit() {
    // Convert date strings to Date objects
    const eventToSend = {
      ...this.eventData,
      startDate: new Date(this.eventData.startDate),
      endDate: new Date(this.eventData.endDate),
      registrationDeadline: new Date(this.eventData.registrationDeadline)
    };

    this.eventService.createEvent(eventToSend).subscribe({
      next: (res) => {
        alert('Event created successfully!');
        this.router.navigate(['/events']);
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to create event');
      }
    });
  }

  cancel() {
    this.router.navigate(['/events']);
  }
}