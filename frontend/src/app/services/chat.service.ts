import { Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { EventService } from './event.service';
import { HttpClient } from '@angular/common/http';

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  options?: { label: string; action: string }[];
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class ChatService {

  messages   = signal<ChatMessage[]>([]);
  isOpen     = signal<boolean>(false);
  navRequest = signal<string | null>(null);

  private botState = 'IDLE';
  private flowData: any = {};

  constructor(
    private authService: AuthService,
    private router: Router,
    private eventService: EventService,
    private http: HttpClient
  ) {
    // Reset chat when auth state changes (login / logout)
    this.authService.loginEvent$.subscribe(() => {
      this.messages.set([]);
      this.botState = 'IDLE';
      this.flowData = {};
      // If chat is open, show fresh welcome message for new session
      if (this.isOpen()) {
        this.sendWelcomeMessage();
      }
    });
  }

  // ─── OPEN / CLOSE ──────────────────────────────────────────────────────────

  toggleChat() {
    this.isOpen.set(!this.isOpen());
    if (this.isOpen() && this.messages().length === 0) {
      this.sendWelcomeMessage();
    }
  }

  // ─── MESSAGE HELPERS ────────────────────────────────────────────────────────

  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>) {
    const newMessage: ChatMessage = {
      ...message,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, newMessage]);
  }

  /** Remove the last bot message (used to strip "Thinking…" placeholder) */
  private removeLastBotMessage() {
    const current = this.messages();
    if (current.length > 0 && current[current.length - 1].sender === 'bot') {
      this.messages.set(current.slice(0, -1));
    }
  }

  clearChat() {
    this.messages.set([]);
    this.botState = 'IDLE';
    this.flowData = {};
    this.sendWelcomeMessage();
  }

  // ─── WELCOME ────────────────────────────────────────────────────────────────

  sendWelcomeMessage() {
    const role      = this.authService.getRole();
    const isLoggedIn = this.authService.isLoggedIn();
    const fullName  = this.authService.getFullName() || 'User';
    const currentUrl = this.router.url;

    this.botState = 'IDLE';
    this.flowData = {};

    // ─── Case 1: On Home Page (or any non-dashboard page) ─────────────────────
    const isDashboard = currentUrl.includes('dashboard');

    if (!isDashboard) {
      if (isLoggedIn) {
        this.addMessage({
          sender: 'bot',
          text: `Welcome back, ${fullName}! 👋 You are currently on the Home Page. How can I help?`,
          options: [
            { label: '📊 Go to my Dashboard', action: 'GO_DASHBOARD' },
            { label: '❓ How it works',       action: 'LEARN_MORE'  }
          ]
        });
      } else {
        this.addMessage({
          sender: 'bot',
          text: 'Hi! 👋 I\'m your Campus Assistant. Log in or register to explore upcoming events!',
          options: [
            { label: '🔑 How to Login',    action: 'AUTH_LOGIN'    },
            { label: '📝 How to Register', action: 'AUTH_REGISTER' }
          ]
        });
      }
      return;
    }

    // ─── Case 2: On Dashboard Page (Role-specific content) ────────────────────
    if (isLoggedIn && role === 'student') {
      this.addMessage({
        sender: 'bot',
        text: `Hi ${fullName} 👋 Ready to find your next event?`,
        options: [
          { label: '1️⃣ View all events',  action: 'STUDENT_BROWSE'       },
          { label: '2️⃣ My Schedule',      action: 'STUDENT_SCHEDULE'     },
          { label: '🏆 Leaderboard',       action: 'STUDENT_LEADERBOARD'  },
          { label: '🎲 Surprise Me!',      action: 'STUDENT_SURPRISE'     },
          { label: '✨ Event Wizard',      action: 'STUDENT_WIZARD_START' }
        ]
      });
    } else if (isLoggedIn && role === 'college-admin') {
      this.addMessage({
        sender: 'bot',
        text: `Hello Admin ${fullName} 👋 How can I help with your events today?`,
        options: [
          { label: '✏️ Create new event',  action: 'ADMIN_CREATE_START' },
          { label: '📊 Manage my events',  action: 'ADMIN_MANAGE'       },
          { label: '❌ Cancel my event',   action: 'ADMIN_CANCEL_FLOW'  }
        ]
      });
    } else if (isLoggedIn && role === 'superadmin') {
      this.addMessage({
        sender: 'bot',
        text: `Hello Super Admin ${fullName} 👋 Current platform status:`,
        options: [
          { label: '📊 Platform Stats',   action: 'SA_STATS'    },
          { label: '🏛️ View Colleges',    action: 'SA_COLLEGES' },
          { label: '👥 View Admins',      action: 'SA_ADMINS'   },
          { label: '📅 View All Events',  action: 'SA_EVENTS'   },
          { label: '📈 Reports',          action: 'SA_REPORTS'  }
        ]
      });
    } else {
      // Fallback for unexpected states while on dashboard
      this.addMessage({
        sender: 'bot',
        text: 'Please log in to see your dashboard options.',
        options: [
          { label: '🏠 Go to Home', action: 'GUEST_HOME' }
        ]
      });
    }
  }

  // ─── FREE-TEXT FROM INPUT BOX ───────────────────────────────────────────────

  handleUserMessage(text: string) {
    this.addMessage({ sender: 'user', text });

    // Handle stateful flows
    if (this.botState.startsWith('ADMIN_CREATE_')) {
      this.handleAdminCreateFlow(text);
      return;
    }

    if (this.botState === 'AWAITING_FALLBACK_EMAIL') {
      this.flowData.fallbackEmail = text;
      this.botState = 'IDLE';
      const originalMessage = this.flowData.pendingMessage || 'Hello';
      this.sendToGemini(originalMessage, this.authService.getRole(), this.authService.isLoggedIn());
      return;
    }

    // NLP / Generic fallback
    const lowerText = text.toLowerCase();
    const role = this.authService.getRole();
    const isLoggedIn = this.authService.isLoggedIn();

    // Greetings → show welcome
    if (lowerText.includes('hello') || lowerText.includes('hi')) {
      this.sendWelcomeMessage();
      return;
    }

    // Role-specific keyword shortcuts
    if (isLoggedIn && role === 'student') {
      if (lowerText.includes('schedule') || lowerText.includes('registered')) {
        this.handleAction('STUDENT_SCHEDULE');
        return;
      }
      if (lowerText.includes('browse') || lowerText.includes('events')) {
        this.handleAction('STUDENT_BROWSE');
        return;
      }
    }

    if (isLoggedIn && role === 'college-admin') {
      if (lowerText.includes('create') || lowerText.includes('new event')) {
        this.handleAction('ADMIN_CREATE_START');
        return;
      }
      if (lowerText.includes('manage') || lowerText.includes('my events')) {
        this.handleAction('ADMIN_MANAGE');
        return;
      }
    }

    // FAQ MATCHING (Global)
    if (lowerText.includes('password') || lowerText.includes('reset')) {
      this.addMessage({ sender: 'bot', text: 'If you need to reset your password, please contact your College Administrator or the Super Admin.' });
      return;
    }
    if (lowerText.includes('who') || lowerText.includes('created') || lowerText.includes('support')) {
      this.addMessage({ sender: 'bot', text: 'This platform is the Campus Event Hub, built to streamline event management! Contact support@campushub.edu for help.' });
      return;
    }

    if (lowerText.includes('help') || lowerText.includes('what can you do') || lowerText.includes('question')) {
      this.sendHelpMessage(role, isLoggedIn);
      return;
    }

    // AI FALLBACK (Gemini integration)
    this.sendToGemini(text, role, isLoggedIn);
  }

  private sendToGemini(text: string, role: string | null, isLoggedIn: boolean) {
    this.addMessage({ sender: 'bot', text: 'Thinking... ⏳' });

    const payload: any = { message: text, role };
    if (this.flowData.fallbackEmail) {
      payload.fallbackEmail = this.flowData.fallbackEmail;
    }

    const token = this.authService.getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    this.http.post('http://localhost:5000/api/chat/ask', payload, { headers }).subscribe({
      next: (res: any) => {
        // Remove the 'Thinking... ⏳' message
        const currentMessages = this.messages();
        if (currentMessages.length > 0 && currentMessages[currentMessages.length - 1].text === 'Thinking... ⏳') {
          this.messages.set(currentMessages.slice(0, -1));
        }

        if (res.requiresEmail) {
          this.botState = 'AWAITING_FALLBACK_EMAIL';
          this.flowData.pendingMessage = text;
          this.addMessage({ sender: 'bot', text: res.reply });
          return;
        }

        this.addMessage({
          sender: 'bot',
          text: res.reply || 'I couldn\'t find an answer for that.',
          options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
        });

        // Clear fallback email after successful use
        if (this.flowData.fallbackEmail) {
          delete this.flowData.fallbackEmail;
        }
      },
      error: () => {
        this.removeLastBotMessage();
        this.addMessage({
          sender: 'bot',
          text: '⚠️ AI server is currently unavailable. Please try again later.',
          options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
        });
      }
    });
  }

  // ─── BUTTON / OPTION ACTIONS ────────────────────────────────────────────────

  handleAction(action: string) {

    // ── Universal ──────────────────────────────────────────────────────────────
    if (action === 'MAIN_MENU') {
      this.sendWelcomeMessage();
      return;
    }

    if (action === 'GUEST_HOME') {
      this.router.navigate(['/']);
      this.isOpen.set(false);
      return;
    }

    if (action === 'GO_DASHBOARD') {
      const role = this.authService.getRole();
      if (role === 'student') this.router.navigate(['/student-dashboard']);
      else if (role === 'college-admin') this.router.navigate(['/admin-dashboard']);
      else if (role === 'superadmin') this.router.navigate(['/super-admin-dashboard']);
      else this.router.navigate(['/login']);
      this.isOpen.set(false);
      return;
    }

    if (action === 'LEARN_MORE') {
      this.addMessage({
        sender: 'bot',
        text: '📚 **CampusEventHub** is your one-stop platform to explore, register, and manage inter-college events! \n\nLog in to see your personalized dashboard, track your points on the leaderboard, and never miss a workshop or fest again.',
        options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
      });
      return;
    }

    // ── Auth / guest actions ───────────────────────────────────────────────────
    if (action === 'AUTH_LOGIN') {
      this.addMessage({
        sender: 'bot',
        text: '🔑 **How to Login:**\n\n1. Click the **Login** button in the top navbar.\n2. Enter your email and password.\n3. You will be redirected to your dashboard based on your role.',
        options: [
          { label: '🚀 Login Now',       action: 'AUTH_LOGIN_NOW'    },
          { label: '📝 How to Register',  action: 'AUTH_REGISTER'     },
          { label: '🏠 Main Menu',        action: 'MAIN_MENU'         }
        ]
      });
      return;
    }

    if (action === 'AUTH_REGISTER') {
      this.addMessage({
        sender: 'bot',
        text: '📝 **How to Register:**\n\n1. Click the **Sign Up** button in the top navbar.\n2. Fill in your name, email, and choose your role (Student/Admin).\n3. Once registered, you can log in to access the platform.',
        options: [
          { label: '🚀 Register Now',    action: 'AUTH_REGISTER_NOW' },
          { label: '🔑 How to Login',     action: 'AUTH_LOGIN'        },
          { label: '🏠 Main Menu',        action: 'MAIN_MENU'         }
        ]
      });
      return;
    }

    if (action === 'AUTH_LOGIN_NOW') {
      this.addMessage({ sender: 'bot', text: '🔑 Redirecting to Login page...' });
      setTimeout(() => {
        this.router.navigate(['/login']);
        this.isOpen.set(false);
      }, 500);
      return;
    }

    if (action === 'AUTH_REGISTER_NOW') {
      this.addMessage({ sender: 'bot', text: '📝 Redirecting to Register page...' });
      setTimeout(() => {
        this.router.navigate(['/register']);
        this.isOpen.set(false);
      }, 500);
      return;
    }

    // ── Admin actions ──────────────────────────────────────────────────────────
    if (action === 'ADMIN_CREATE_START') {
      this.addMessage({ sender: 'bot', text: '🎨 Opening the event creation wizard in your dashboard...' });
      
      if (!this.router.url.includes('admin-dashboard')) {
        this.router.navigate(['/admin-dashboard']);
      }
      this.navRequest.set('ADMIN_CREATE');
      return;
    }

    if (action === 'ADMIN_MANAGE') {
      this.addMessage({ sender: 'bot', text: '📊 Opening your event manager...' });
      if (!this.router.url.includes('admin-dashboard')) {
        this.router.navigate(['/admin-dashboard']);
      }
      this.navRequest.set('ADMIN_EVENTS');
      return;
    }

    if (action === 'ADMIN_CANCEL_FLOW') {
      this.addMessage({ sender: 'bot', text: '❌ Taking you to the events list to cancel...' });
      if (!this.router.url.includes('admin-dashboard')) {
        this.router.navigate(['/admin-dashboard']);
      }
      this.navRequest.set('ADMIN_EVENTS');
      return;
    }
    if (action === 'STUDENT_BROWSE') {
      this.addMessage({
        sender: 'bot',
        text: '🔍 Navigating to all events…'
      });
      
      // If not in dashboard, go there first
      if (!this.router.url.includes('student-dashboard')) {
        this.router.navigate(['/student-dashboard']);
      }
      
      // Signal the dashboard to switch view
      this.navRequest.set('BROWSE_EVENTS');
      return;
    }

    if (action === 'STUDENT_SCHEDULE') {
      this.addMessage({ sender: 'bot', text: 'Checking your schedule… ⏳' });

      this.eventService.getMyRegistrations().subscribe({
        next: (regs: any[]) => {
          // Remove the "checking" message
          this.removeLastBotMessage();

          if (!regs || regs.length === 0) {
            this.addMessage({
              sender: 'bot',
              text: 'You are not registered for any events yet! Browse events to find something interesting.',
              options: [
                { label: '1️⃣ Browse Events', action: 'STUDENT_BROWSE' },
                { label: '🏠 Main Menu',      action: 'MAIN_MENU'     }
              ]
            });
          } else {
            let replyText = `You are registered for **${regs.length}** event(s):\n\n`;
            regs.forEach((r: any) => {
              const title  = r.event?.title || r.title || 'Untitled';
              const status = r.status       || r.event?.status || '';
              replyText += `✅ **${title}**${status ? ` — *${status}*` : ''}\n`;
            });
            this.addMessage({
              sender: 'bot',
              text: replyText,
              options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
            });
          }
        },
        error: () => {
          this.removeLastBotMessage();
          this.addMessage({
            sender: 'bot',
            text: '❌ Failed to fetch your schedule. Please try again.',
            options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
          });
        }
      });
      return;
    }

    if (action === 'STUDENT_LEADERBOARD') {
      this.addMessage({
        sender: 'bot',
        text: '🏆 Navigating to the Leaderboard…'
      });
      if (!this.router.url.includes('student-dashboard')) {
        this.router.navigate(['/student-dashboard']);
      }
      this.navRequest.set('LEADERBOARD');
      return;
    }

    if (action === 'STUDENT_SURPRISE') {
      this.addMessage({ sender: 'bot', text: '🎲 Finding a random event for you… ⏳' });

      this.eventService.getAllEvents({ status: 'upcoming' }).subscribe({
        next: (events: any[]) => {
          this.removeLastBotMessage();

          if (!events || events.length === 0) {
            this.addMessage({
              sender: 'bot',
              text: 'No upcoming events right now. Check back soon!',
              options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
            });
            return;
          }

          const randomEvent = events[Math.floor(Math.random() * events.length)];
          this.addMessage({
            sender: 'bot',
            text: `🎉 How about this one?\n\n**${randomEvent.title}**\n📍 ${randomEvent.venue || 'TBA'}\n📅 ${randomEvent.startDate ? new Date(randomEvent.startDate).toLocaleDateString() : 'TBA'}\n\nInterested?`,
            options: [
              { label: '🎲 Another one!', action: 'STUDENT_SURPRISE' },
              { label: '🏠 Main Menu',    action: 'MAIN_MENU'       }
            ]
          });
        },
        error: () => {
          this.removeLastBotMessage();
          this.addMessage({
            sender: 'bot',
            text: '❌ Couldn\'t load events right now.',
            options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
          });
        }
      });
      return;
    }

    if (action === 'STUDENT_WIZARD_START') {
      this.botState = 'WIZARD_TYPE';
      this.addMessage({
        sender: 'bot',
        text: '✨ Event Wizard! What type of event are you interested in?',
        options: [
          { label: '💻 Technical',  action: 'WIZARD_TYPE_technical'  },
          { label: '🎭 Cultural',   action: 'WIZARD_TYPE_cultural'   },
          { label: '⚽ Sports',     action: 'WIZARD_TYPE_sports'     },
          { label: '🛠️ Workshop',   action: 'WIZARD_TYPE_workshop'   },
          { label: '📣 Seminar',    action: 'WIZARD_TYPE_seminar'    }
        ]
      });
      return;
    }

    if (action.startsWith('WIZARD_TYPE_')) {
      const type = action.replace('WIZARD_TYPE_', '');
      this.flowData.wizardType = type;
      this.addMessage({ sender: 'bot', text: `Searching for **${type}** events… ⏳` });

      this.eventService.getAllEvents({ type, status: 'upcoming' }).subscribe({
        next: (events: any[]) => {
          this.removeLastBotMessage();

          if (!events || events.length === 0) {
            this.addMessage({
              sender: 'bot',
              text: `No upcoming **${type}** events found right now.`,
              options: [
                { label: '🔄 Try another type', action: 'STUDENT_WIZARD_START' },
                { label: '🏠 Main Menu',        action: 'MAIN_MENU'           }
              ]
            });
            return;
          }

          const top3  = events.slice(0, 3);
          let text    = `Found ${events.length} **${type}** event(s). Here are the top ones:\n\n`;
          top3.forEach((e: any) => {
            text += `🔹 **${e.title}** — ${e.venue || 'TBA'} | ${e.startDate ? new Date(e.startDate).toLocaleDateString() : 'TBA'}\n`;
          });

          this.addMessage({
            sender: 'bot',
            text,
            options: [
              { label: '📋 View all events', action: 'STUDENT_BROWSE' },
              { label: '🏠 Main Menu',       action: 'MAIN_MENU'     }
            ]
          });
        },
        error: () => {
          this.removeLastBotMessage();
          this.addMessage({
            sender: 'bot',
            text: '❌ Couldn\'t load events. Please try again.',
            options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
          });
        }
      });
      return;
    }

    if (action.startsWith('STUDENT_SHARE_EVENT_')) {
      const shareUrl = `${window.location.origin}/student-dashboard`;
      (navigator as any).clipboard?.writeText(
        `Check out this event on Campus Event Hub! ${shareUrl}`
      ).then(() => {
        this.addMessage({ sender: 'bot', text: '✅ Event link copied to clipboard!' });
      }).catch(() => {
        this.addMessage({ sender: 'bot', text: `📋 Share this link: ${shareUrl}` });
      });
      return;
    }

    // ── Admin actions ──────────────────────────────────────────────────────────
    if (action === 'ADMIN_CREATE_START') {
      this.addMessage({
        sender: 'bot',
        text: '✏️ Opening the event creation wizard in your dashboard…'
      });
      if (!this.router.url.includes('college-admin-dashboard')) {
        this.router.navigate(['/college-admin-dashboard']);
      }
      this.navRequest.set('ADMIN_CREATE');
      return;
    }

    if (action === 'ADMIN_MANAGE') {
      this.addMessage({
        sender: 'bot',
        text: '📊 Navigating to your events management view…'
      });
      if (!this.router.url.includes('college-admin-dashboard')) {
        this.router.navigate(['/college-admin-dashboard']);
      }
      this.navRequest.set('ADMIN_EVENTS');
      return;
    }

    if (action === 'ADMIN_CANCEL_FLOW') {
      this.addMessage({ sender: 'bot', text: 'Loading your events… ⏳' });

      this.eventService.getAllEvents().subscribe({
        next: (events: any[]) => {
          this.removeLastBotMessage();
          const myUserId = this.authService.getUserId();
          const myEvents = events.filter(
            (e: any) => String(e.createdBy) === String(myUserId) && e.status !== 'cancelled'
          );

          if (!myEvents || myEvents.length === 0) {
            this.addMessage({
              sender: 'bot',
              text: 'You have no active events to cancel.',
              options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
            });
            return;
          }

          this.addMessage({
            sender: 'bot',
            text: `You have **${myEvents.length}** active event(s). Go to the Events tab in your dashboard to cancel them.`,
            options: [
              { label: '📊 Manage Events', action: 'ADMIN_MANAGE' },
              { label: '🏠 Main Menu',     action: 'MAIN_MENU'   }
            ]
          });
        },
        error: () => {
          this.removeLastBotMessage();
          this.addMessage({
            sender: 'bot',
            text: '❌ Could not load your events.',
            options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
          });
        }
      });
      return;
    }

    // ── Super admin ────────────────────────────────────────────────────────────
    if (action === 'SUPERADMIN_DASHBOARD' || action === 'SA_DASHBOARD') {
      this.router.navigate(['/super-admin-dashboard']);
      return;
    }

    if (action === 'SA_STATS') {
      this.eventService.getStats().subscribe({
        next: (stats: any) => {
          this.addMessage({
            sender: 'bot',
            text: `📊 **Platform Overview:**\n\n🏛️ Total Events: **${stats.totalEvents}**\n📅 Upcoming Events: **${stats.upcomingEvents}**\n👥 College Admins: **${stats.totalAdmins}**\n👤 Students: **${stats.totalStudents}**`,
            options: [
              { label: '📅 View Events',   action: 'SA_EVENTS'   },
              { label: '📈 Reports',       action: 'SA_REPORTS'  },
              { label: '🏠 Main Menu',     action: 'MAIN_MENU'   }
            ]
          });
        },
        error: () => {
          this.addMessage({
            sender: 'bot',
            text: '❌ Could not load stats. Make sure the backend is running.',
            options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
          });
        }
      });
      return;
    }

    if (action === 'SA_COLLEGES') {
      this.addMessage({
        sender: 'bot',
        text: '🏛️ Navigating to the Colleges section…'
      });
      if (!this.router.url.includes('super-admin-dashboard')) {
        this.router.navigate(['/super-admin-dashboard']);
      }
      this.navRequest.set('SA_VIEW_COLLEGES');
      return;
    }

    if (action === 'SA_ADMINS') {
      this.addMessage({
        sender: 'bot',
        text: '👥 Navigating to the Admins section…'
      });
      if (!this.router.url.includes('super-admin-dashboard')) {
        this.router.navigate(['/super-admin-dashboard']);
      }
      this.navRequest.set('SA_VIEW_ADMINS');
      return;
    }

    if (action === 'SA_EVENTS') {
      this.addMessage({ sender: 'bot', text: 'Loading all events… ⏳' });
      this.eventService.getAllEvents().subscribe({
        next: (events: any[]) => {
          this.removeLastBotMessage();
          const upcoming  = events.filter(e => e.status === 'upcoming').length;
          const ongoing   = events.filter(e => e.status === 'ongoing').length;
          const completed = events.filter(e => e.status === 'completed').length;
          this.addMessage({
            sender: 'bot',
            text: `📅 There are **${events.length}** total events:\n✅ Upcoming: **${upcoming}**\n🟢 Ongoing: **${ongoing}**\n✔️ Completed: **${completed}**`,
            options: [
              { label: '📋 Go to Events tab', action: 'SA_VIEW_EVENTS' },
              { label: '📈 Reports',          action: 'SA_REPORTS'     },
              { label: '🏠 Main Menu',        action: 'MAIN_MENU'      }
            ]
          });
        },
        error: () => {
          this.removeLastBotMessage();
          this.addMessage({
            sender: 'bot',
            text: '❌ Could not load events.',
            options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
          });
        }
      });
      return;
    }

    if (action === 'SA_VIEW_EVENTS') {
      this.addMessage({ sender: 'bot', text: '📅 Navigating to All Events tab…' });
      if (!this.router.url.includes('super-admin-dashboard')) {
        this.router.navigate(['/super-admin-dashboard']);
      }
      this.navRequest.set('SA_VIEW_EVENTS');
      return;
    }

    if (action === 'SA_REPORTS') {
      this.addMessage({
        sender: 'bot',
        text: '📈 Go to the **Reports** section of your dashboard to download CSV reports for events, colleges, users and financials.',
        options: [
          { label: '📊 Go to Reports', action: 'SA_VIEW_REPORTS' },
          { label: '🏠 Main Menu',     action: 'MAIN_MENU'       }
        ]
      });
      return;
    }

    if (action === 'SA_VIEW_REPORTS') {
      this.addMessage({ sender: 'bot', text: '📈 Navigating to Reports…' });
      if (!this.router.url.includes('super-admin-dashboard')) {
        this.router.navigate(['/super-admin-dashboard']);
      }
      this.navRequest.set('SA_VIEW_REPORTS');
      return;
    }

    // ── Fallback for any unhandled action ──────────────────────────────────────
    this.addMessage({
      sender: 'bot',
      text: 'I\'m not sure how to handle that. Let me take you back to the main menu.',
      options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
    });
  }

  private submitEventcreation() {
    this.addMessage({ sender: 'bot', text: 'Creating your event... ⏳' });
    const payload = {
      title: this.flowData.title,
      description: this.flowData.description,
      type: this.flowData.category,
      category: 'college',
      venue: this.flowData.venue,
      startDate: this.flowData.date,
      endDate: this.flowData.date,
      registrationDeadline: this.flowData.date,
      maxParticipants: this.flowData.participants,
      registrationFee: 0,
      organizer: this.flowData.email,
      contactEmail: this.flowData.email,
      imageUrl: this.flowData.imageUrl || ''
    };

    this.eventService.createEvent(payload).subscribe({
      next: () => {
        this.botState = 'IDLE';
        this.flowData = {};
        this.addMessage({ 
          sender: 'bot', 
          text: '✅ Event created successfully!',
          options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
        });
      },
      error: (err: any) => {
        this.botState = 'IDLE';
        this.addMessage({ sender: 'bot', text: '❌ Failed to create event: ' + (err.error?.message || 'Unknown error') });
      }
    });
  }

  private handleAdminCreateFlow(text: string) {
    switch (this.botState) {
      case 'ADMIN_CREATE_EMAIL':
        this.flowData.email = text;
        this.botState = 'ADMIN_CREATE_TITLE';
        this.addMessage({ sender: 'bot', text: 'Great! Now enter the **event title**:' });
        break;
      case 'ADMIN_CREATE_TITLE':
        this.flowData.title = text;
        this.botState = 'ADMIN_CREATE_DESC';
        this.addMessage({ sender: 'bot', text: 'Nice! Provide a **short description** for the event:' });
        break;
      case 'ADMIN_CREATE_DESC':
        this.flowData.description = text;
        this.botState = 'ADMIN_CREATE_DATE';
        this.addMessage({ sender: 'bot', text: 'When will the event happen?\nFormat: **YYYY-MM-DD**' });
        break;
      case 'ADMIN_CREATE_DATE':
        this.flowData.date = text;
        this.botState = 'ADMIN_CREATE_CAT';
        this.addMessage({
          sender: 'bot',
          text: 'Select the **event category**:',
          options: [
            { label: 'Technical', action: 'ADMIN_CAT_TECH' },
            { label: 'Workshop', action: 'ADMIN_CAT_WORKSHOP' },
            { label: 'Cultural', action: 'ADMIN_CAT_CULTURAL' },
            { label: 'Sports', action: 'ADMIN_CAT_SPORTS' }
          ]
        });
        break;
      case 'ADMIN_CREATE_CAT':
        this.flowData.category = text.toLowerCase();
        this.botState = 'ADMIN_CREATE_VENUE';
        this.addMessage({ sender: 'bot', text: 'Where will the event take place? (Enter **venue name**)' });
        break;
      case 'ADMIN_CREATE_VENUE':
        this.flowData.venue = text;
        this.botState = 'ADMIN_CREATE_PARTICIPANTS';
        this.addMessage({ sender: 'bot', text: 'Maximum number of participants allowed?' });
        break;
      case 'ADMIN_CREATE_PARTICIPANTS':
        this.flowData.participants = Number(text) || 100;
        this.botState = 'ADMIN_CREATE_IMAGE';
        this.addMessage({ sender: 'bot', text: 'Provide an **image URL** or type **skip**.' });
        break;
      case 'ADMIN_CREATE_IMAGE':
        this.flowData.imageUrl = text.toLowerCase() === 'skip' ? '' : text;
        this.botState = 'ADMIN_CREATE_REVIEW';
        const summary = `
📋 Please confirm the event details

Title: ${this.flowData.title}
Description: ${this.flowData.description}
Category: ${this.flowData.category}
Venue: ${this.flowData.venue}
Date: ${this.flowData.date}
Participants: ${this.flowData.participants}
`;
        this.addMessage({
          sender: 'bot',
          text: summary,
          options: [
            { label: '✅ Create Event', action: 'ADMIN_CREATE_CONFIRM' },
            { label: '❌ Cancel', action: 'ADMIN_CREATE_CANCEL' }
          ]
        });
        break;
    }
  }

  private sendHelpMessage(role: string | null, isLoggedIn: boolean) {
    let helpText = 'Here are the questions and commands I am programmed to answer:\n\n';
    if (isLoggedIn && role === 'student') {
      helpText += '• "Show me upcoming events"\n';
      helpText += '• "What is my event schedule?"\n';
      helpText += '• "Find me a tech / cultural / sports event"\n';
    } else if (isLoggedIn && role === 'college-admin') {
      helpText += '• "I need to cancel an event"\n';
      helpText += '• Use the menu buttons to Create and Manage events\n';
    } else {
      helpText += '• "How do I login?"\n';
      helpText += '• "How do I register?"\n';
      helpText += '• "Show me upcoming events"\n';
    }
    helpText += '\n• "I forgot my password"\n';
    helpText += '• "Who created this website?"\n';
    this.addMessage({ sender: 'bot', text: helpText, options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }] });
  }
}
