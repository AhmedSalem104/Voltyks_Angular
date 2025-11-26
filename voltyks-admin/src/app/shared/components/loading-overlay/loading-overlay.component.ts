import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-overlay">
      <div class="spinner-container">
        <div class="spinner"></div>
        <p class="loading-text">جاري التحميل...</p>
      </div>
    </div>
  `,
  styleUrls: ['./loading-overlay.component.scss']
})
export class LoadingOverlayComponent {}
