import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="dialog-overlay" (click)="onCancel()">
        <div class="dialog-container" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>{{ title }}</h3>
            <button class="close-btn" (click)="onCancel()">×</button>
          </div>

          <div class="dialog-body">
            <p>{{ message }}</p>
          </div>

          <div class="dialog-footer">
            <button class="voltyks-btn btn-secondary" (click)="onCancel()">
              {{ cancelText }}
            </button>
            <button
              class="voltyks-btn"
              [class.btn-danger]="type === 'danger'"
              [class.btn-primary]="type === 'primary'"
              (click)="onConfirm()"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./confirm-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
  @Input() isOpen: boolean = false;
  @Input() title: string = 'تأكيد';
  @Input() message: string = 'هل أنت متأكد؟';
  @Input() confirmText: string = 'تأكيد';
  @Input() cancelText: string = 'إلغاء';
  @Input() type: 'primary' | 'danger' = 'primary';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit();
    this.isOpen = false;
  }

  onCancel(): void {
    this.cancel.emit();
    this.isOpen = false;
  }
}
