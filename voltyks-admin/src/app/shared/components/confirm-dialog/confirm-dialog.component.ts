import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    @if (isOpen) {
      <div class="dialog-overlay" (click)="onCancel()">
        <div class="dialog-container" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>{{ title || ('confirmDialog.defaultTitle' | translate) }}</h3>
            <button class="close-btn" (click)="onCancel()">×</button>
          </div>

          <div class="dialog-body">
            <p>{{ message || ('confirmDialog.defaultMessage' | translate) }}</p>
          </div>

          <div class="dialog-footer">
            <button class="voltyks-btn btn-secondary" (click)="onCancel()">
              {{ cancelText || ('common.cancel' | translate) }}
            </button>
            <button
              class="voltyks-btn"
              [class.btn-danger]="type === 'danger'"
              [class.btn-primary]="type === 'primary'"
              (click)="onConfirm()"
            >
              {{ confirmText || ('common.confirm' | translate) }}
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
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() confirmText: string = '';
  @Input() cancelText: string = '';
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
