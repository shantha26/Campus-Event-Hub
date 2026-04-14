import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';

import { StudentDashboardComponent } from './student-dashboard.component';
import { EventService } from '../../services/event.service';
import { AuthService } from '../../services/auth.service';

describe('StudentDashboardComponent', () => {

  let component: StudentDashboardComponent;
  let fixture: ComponentFixture<StudentDashboardComponent>;

  const mockEventService = {
    getEvents: () => of([]),
    getMyRegistrations: () => of([]),
    registerForEvent: () => of({}),
    cancelRegistration: () => of({})
  };

  const mockAuthService = {
    getUser: () => ({}),
    getFullName: () => 'Test User',
    getEmail: () => 'test@email.com',
    logout: () => {}
  };

  const mockRouter = {
    navigate: () => {}
  };

  beforeEach(async () => {

    await TestBed.configureTestingModule({
      imports: [StudentDashboardComponent],
      providers: [
        { provide: EventService, useValue: mockEventService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

});