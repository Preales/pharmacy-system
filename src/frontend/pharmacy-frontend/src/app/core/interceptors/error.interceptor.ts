import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let userMessage = 'An unexpected error occurred';

      if (error.status === 0) {
        userMessage = 'Unable to connect to the server. Please check your connection.';
      } else if (error.error && typeof error.error === 'object') {
        const problem = error.error as ProblemDetails;
        userMessage = problem.detail ?? problem.title ?? userMessage;
      } else {
        switch (error.status) {
          case 400:
            userMessage = 'Invalid request. Please check your input.';
            break;
          case 401:
            userMessage = 'Your session has expired. Please log in again.';
            authService.logout();
            break;
          case 403:
            userMessage = 'You do not have permission to perform this action.';
            break;
          case 404:
            userMessage = 'The requested resource was not found.';
            break;
          case 409:
            userMessage = 'A conflict occurred. The resource may have been modified.';
            break;
          case 429:
            userMessage = 'Too many requests. Please wait and try again.';
            break;
          case 500:
            userMessage = 'A server error occurred. Please try again later.';
            break;
        }
      }

      console.error(`[HTTP ${error.status}] ${req.method} ${req.url}:`, userMessage);

      return throwError(() => ({ ...error, userMessage }));
    })
  );
};
