import { Component, ElementRef, ViewChild, AfterViewChecked, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('chatBody') private chatBody!: ElementRef;

  userInput = '';

  constructor(public chatService: ChatService) {
    // Scroll to bottom whenever messages change
    effect(() => {
      this.chatService.messages(); // track dependency
      setTimeout(() => this.scrollToBottom(), 50);
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.chatBody?.nativeElement) {
        this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
      }
    } catch (err) { }
  }

  sendMessage() {
    if (!this.userInput.trim()) return;
    this.chatService.handleUserMessage(this.userInput.trim());
    this.userInput = '';
  }

  handleOptionClick(action: string) {
    this.chatService.handleAction(action);
  }
}
