import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { ToasterService, Toast } from './toaster.service';

@Component({
  selector: 'app-toaster',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ],
  template: `
    <div class="toaster-container">
      @for (toast of toasts; track toast.id) {
        <div
          class="toast toast-{{toast.type}}"
          @slideIn
        >
          <div class="toast-icon">
            @switch (toast.type) {
              @case ('success') { <span>✓</span> }
              @case ('error') { <span>✗</span> }
              @case ('warning') { <span>⚠</span> }
              @case ('info') { <span>ℹ</span> }
            }
          </div>
          <div class="toast-message">{{ toast.message }}</div>
          <button class="toast-close" (click)="removeToast(toast.id)">×</button>
        </div>
      }
    </div>
  `,
  styleUrls: ['./toaster.component.scss']
})
export class ToasterComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private subscription?: Subscription;
  private readonly MAX_TOASTS = 3;

  constructor(
    private toasterService: ToasterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscription = this.toasterService.toasts$.subscribe(toast => {
      // Ignore empty messages
      if (!toast.message || toast.message.trim() === '') {
        return;
      }

      // Prevent duplicates — check for an existing matching toast
      const isDuplicate = this.toasts.some(
        t => t.message === toast.message && t.type === toast.type
      );

      if (isDuplicate) {
        return;
      }

      // Remove the oldest toast when at the limit
      if (this.toasts.length >= this.MAX_TOASTS) {
        const oldestToast = this.toasts[0];
        this.removeToast(oldestToast.id);
      }

      this.toasts.push(toast);
      this.cdr.markForCheck();

      // Auto remove after duration
      if (toast.duration) {
        setTimeout(() => {
          this.removeToast(toast.id);
        }, toast.duration);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  removeToast(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.cdr.markForCheck();
  }
}
