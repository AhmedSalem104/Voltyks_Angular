import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToasterService {
  private toastSubject = new Subject<Toast>();
  public toasts$ = this.toastSubject.asObservable();

  private generateId(): string {
    return `toast_${Date.now()}_${Math.random()}`;
  }

  show(type: Toast['type'], message: string, duration: number = 3000): void {
    const toast: Toast = {
      id: this.generateId(),
      type,
      message,
      duration
    };

    this.toastSubject.next(toast);
  }

  success(message: string, duration?: number): void {
    this.show('success', message, duration);
  }

  error(message: string, duration?: number): void {
    this.show('error', message, duration);
  }

  warning(message: string, duration?: number): void {
    this.show('warning', message, duration);
  }

  info(message: string, duration?: number): void {
    this.show('info', message, duration);
  }
}
