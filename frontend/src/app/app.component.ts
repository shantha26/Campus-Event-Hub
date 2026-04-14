import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChatbotComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
// export class AppComponent implements OnInit {
export class AppComponent {
  constructor(
    private authService: AuthService,
    private chatService: ChatService
  ) { }

  // CHATBOT AUTO OPEN LOGIC
  // ngOnInit() {
  //   // Listen for new logins so we can auto-open the chat for onboarding flow
  //   this.authService.loginEvent$.subscribe(() => {
  //     if (!this.chatService.isOpen()) {
  //       this.chatService.toggleChat();
  //     } else {
  //       // If it's already open, just force a refresh to catch the new role
  //       this.chatService.clearChat();
  //     }
  //   });
  // }
}
