import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AdminUsersService } from '../../../../core/services/admin/admin-users.service';
import { AdminUserDto } from '../../../../core/models';
import { ToasterService } from '../../../../shared/components/toaster/toaster.service';

/**
 * Multi-select user picker.
 *
 * - Loads the full users list once and filters client-side (search by
 *   name / email / phone).
 * - Two-way bound through `selectedIds` + `(selectedIdsChange)` so it can
 *   be used with `[(selectedIds)]`.
 * - Renders the chosen users as chips above the trigger; clicking a chip
 *   removes the user.
 */
@Component({
  selector: 'app-user-multi-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './user-multi-picker.component.html',
  styleUrls: ['./user-multi-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserMultiPickerComponent implements OnInit {
  @Input() selectedIds: string[] = [];
  @Output() selectedIdsChange = new EventEmitter<string[]>();

  users: AdminUserDto[] = [];
  filteredUsers: AdminUserDto[] = [];
  isLoading = false;
  isOpen = false;

  searchTerm = '';

  constructor(
    private usersService: AdminUsersService,
    private toaster: ToasterService,
    private translate: TranslateService,
    private host: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) {}

  private t(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.usersService.getUsers().subscribe({
      next: response => {
        if (response.status && response.data) {
          this.users = response.data.filter(u => !u.isDeleted && !u.isBanned);
          this.filteredUsers = [...this.users];
        } else {
          this.toaster.error(response.message || this.t('notificationCenter.msg.loadUsersFail'));
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toaster.error(err.message || this.t('notificationCenter.msg.loadUsersFail'));
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ───────────────── Selection ─────────────────

  isSelected(user: AdminUserDto): boolean {
    return this.selectedIds.includes(user.id);
  }

  toggleUser(user: AdminUserDto): void {
    const next = this.selectedIds.includes(user.id)
      ? this.selectedIds.filter(id => id !== user.id)
      : [...this.selectedIds, user.id];
    this.emit(next);
  }

  removeUser(id: string, event?: Event): void {
    event?.stopPropagation();
    this.emit(this.selectedIds.filter(x => x !== id));
  }

  selectAllVisible(): void {
    const visibleIds = this.filteredUsers.map(u => u.id);
    const merged = Array.from(new Set([...this.selectedIds, ...visibleIds]));
    this.emit(merged);
  }

  clearAll(): void {
    this.emit([]);
  }

  private emit(ids: string[]): void {
    this.selectedIds = ids;
    this.selectedIdsChange.emit(ids);
    this.cdr.markForCheck();
  }

  // ───────────────── Selected display ─────────────────

  get selectedUsers(): AdminUserDto[] {
    if (!this.selectedIds.length) return [];
    const map = new Map(this.users.map(u => [u.id, u]));
    return this.selectedIds.map(id => map.get(id)).filter((u): u is AdminUserDto => !!u);
  }

  get visibleSelectedChips(): AdminUserDto[] {
    return this.selectedUsers.slice(0, 3);
  }

  get hiddenSelectedCount(): number {
    return Math.max(0, this.selectedUsers.length - 3);
  }

  // ───────────────── Filter ─────────────────

  onSearchChange(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredUsers = [...this.users];
    } else {
      this.filteredUsers = this.users.filter(
        u =>
          u.fullName?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.phoneNumber?.includes(term)
      );
    }
    this.cdr.markForCheck();
  }

  // ───────────────── Open / close ─────────────────

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.users.length === 0 && !this.isLoading) {
      this.loadUsers();
    }
    this.cdr.markForCheck();
  }

  close(): void {
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  trackById(_: number, u: AdminUserDto): string {
    return u.id;
  }

  // Close on outside click
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
