import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi, withInterceptors } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),

    // HttpClient for API calls to backend
    // provideHttpClient(withInterceptorsFromDi()),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),

    // Needed for ngModel in forms (login/signup)
    importProvidersFrom(ReactiveFormsModule)

  ]
};