import { Component, OnInit, inject, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EventService } from '../../services/event.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit {
  private eventService = inject(EventService);
  testimonials: any[] = [];

  ngOnInit() {
    this.loadTestimonials();
  }

  ngAfterViewInit() {
    this.initScrollAnimations();
  }

  private initScrollAnimations() {
    if (typeof window === 'undefined') return;

    const observerOptions = {
      root: null,
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-entrance, .animate-reveal');
    animatedElements.forEach(el => observer.observe(el));
  }

  loadTestimonials() {

    this.eventService.getPlatformFeedback().subscribe({
      next: (data) => {
        this.testimonials = data;
      },
      error: (err) => {
        console.error('Error loading testimonials:', err);
        // Fallback or leave empty
      }
    });
  }

  getStars(rating: number): string {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  }

  getInitial(name: string): string {
    return name?.charAt(0)?.toUpperCase() || 'S';
  }
}

