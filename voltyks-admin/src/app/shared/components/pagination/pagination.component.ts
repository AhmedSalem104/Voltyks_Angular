import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagination-container">
      <div class="pagination-info">
        <span>{{ 'pagination.showing' | translate:{start: startItem, end: endItem, total: totalItems} }}</span>
      </div>

      <div class="pagination-controls">
        <button
          class="pagination-btn"
          [disabled]="currentPage === 1"
          (click)="goToPage(1)"
        >
          {{ 'pagination.first' | translate }}
        </button>

        <button
          class="pagination-btn"
          [disabled]="currentPage === 1"
          (click)="previousPage()"
        >
          {{ 'common.previous' | translate }}
        </button>

        <div class="pagination-pages">
          @for (page of visiblePages; track page) {
            <button
              class="pagination-page"
              [class.active]="page === currentPage"
              (click)="goToPage(page)"
            >
              {{ page }}
            </button>
          }
        </div>

        <button
          class="pagination-btn"
          [disabled]="currentPage === totalPages"
          (click)="nextPage()"
        >
          {{ 'common.next' | translate }}
        </button>

        <button
          class="pagination-btn"
          [disabled]="currentPage === totalPages"
          (click)="goToPage(totalPages)"
        >
          {{ 'pagination.last' | translate }}
        </button>
      </div>

      <div class="pagination-size">
        <label>{{ 'pagination.perPage' | translate }}:</label>
        <select
          [(ngModel)]="pageSize"
          (ngModelChange)="onPageSizeChange()"
          class="voltyks-select"
        >
          <option [value]="5">5</option>
          <option [value]="10">10</option>
          <option [value]="20">20</option>
          <option [value]="50">50</option>
        </select>
      </div>
    </div>
  `,
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
  @Input() totalItems: number = 0;
  @Input() pageSize: number = 5;
  @Input() currentPage: number = 1;
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get startItem(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.totalItems ? this.totalItems : end;
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.pageChange.emit(this.currentPage);
    }
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.pageSizeChange.emit(this.pageSize);
    this.pageChange.emit(this.currentPage);
  }
}
