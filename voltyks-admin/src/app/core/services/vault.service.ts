import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VaultService {
  private unlocked = false;

  unlock(): void {
    this.unlocked = true;
  }

  lock(): void {
    this.unlocked = false;
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }
}
