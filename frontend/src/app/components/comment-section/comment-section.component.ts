import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-comment-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comment-section.component.html',
  styleUrls: ['./comment-section.component.css']
})
export class CommentSectionComponent implements OnChanges {
  @Input() eventId: string = '';
  @Input() currentUser: any = null;

  @ViewChild('listEndRef') listEndRef!: ElementRef;

  comments: any[] = [];
  newComment: string = '';
  loading: boolean = false;
  posting: boolean = false;
  error: string = '';
  inputError: string = '';

  private readonly API_BASE = 'http://localhost:5000/api';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId'] && this.eventId) {
      this.fetchComments();
    }
  }

  async fetchComments(): Promise<void> {
    this.loading = true;
    this.error = '';
    
    try {
      const res = await fetch(`${this.API_BASE}/comments/${this.eventId}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      this.comments = data;
    } catch (err) {
      this.error = 'Unable to load comments. Please check your connection.';
      console.error('Fetch comments error:', err);
    } finally {
      this.loading = false;
    }
  }

  async handleSubmit(): Promise<void> {
    this.inputError = '';

    const commentText = this.newComment.trim();
    if (!commentText) {
      this.inputError = 'Comment cannot be empty.';
      return;
    }

    // Default to 'Anonymous Student' if we somehow can't get the current user's name
    const userName = (this.currentUser?.fullName || 'Anonymous Student').trim();

    this.posting = true;
    try {
      const res = await fetch(`${this.API_BASE}/comments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          eventId: this.eventId,
          userName: userName,
          text:     commentText
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server error: ${res.status}`);
      }

      const saved = await res.json();
      // Prepend to top matching the newest-first sort
      this.comments = [saved, ...this.comments];
      this.newComment = '';
      
      // Scroll to top
      if (this.listEndRef?.nativeElement) {
        this.listEndRef.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      this.inputError = err.message || 'Failed to post comment. Try again.';
      console.error('Post comment error:', err);
    } finally {
      this.posting = false;
    }
  }

  // Helpers ported from React
  getTimeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60)              return `${diff}s ago`;
    if (diff < 3600)            return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)           return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800)          return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  getInitial(name: string): string {
    return (name?.charAt(0) || '?').toUpperCase();
  }

  getAvatarColor(name: string): string {
    const avatarColors = [
      '#7c3aed', '#2563eb', '#059669', '#d97706',
      '#db2777', '#0891b2', '#65a30d', '#dc2626'
    ];
    const idx = (name?.charCodeAt(0) || 0) % avatarColors.length;
    return avatarColors[idx];
  }
}
