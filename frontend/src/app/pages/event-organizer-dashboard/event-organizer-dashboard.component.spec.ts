import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventOrganizerDashboardComponent } from './event-organizer-dashboard.component';

describe('EventOrganizerDashboardComponent', () => {
  let component: EventOrganizerDashboardComponent;
  let fixture: ComponentFixture<EventOrganizerDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventOrganizerDashboardComponent]  // standalone component
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventOrganizerDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
