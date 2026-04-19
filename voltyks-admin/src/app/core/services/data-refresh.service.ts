import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

/**
 * Resource topics that broadcast change events across screens.
 * Extend this union when adding new resources that need cross-screen auto-refresh.
 */
export type RefreshTopic =
  | 'vehicle-request'
  | 'brand'
  | 'model'
  | 'user'
  | 'charger'
  | 'vehicle'
  | 'fee'
  | 'report'
  | 'complaint'
  | 'reservation'
  | 'product'
  | 'protocol'
  | 'capacity'
  | 'charging-protocol';

/**
 * Lightweight cross-component event bus for auto-refreshing open screens
 * after any CRUD action — no page reload required.
 *
 * Emit from the component that performed the action; any other component
 * currently rendering the affected resource subscribes and reloads.
 */
@Injectable({ providedIn: 'root' })
export class DataRefreshService {
  private subject = new Subject<RefreshTopic>();

  /**
   * Stream of all refresh events. Prefer `on(topic)` when you only care
   * about a specific resource.
   */
  readonly events$: Observable<RefreshTopic> = this.subject.asObservable();

  /**
   * Broadcast that a resource has changed. Called after successful
   * create/update/delete operations.
   */
  emit(topic: RefreshTopic): void {
    this.subject.next(topic);
  }

  /**
   * Subscribe to change events for a single resource topic.
   */
  on(topic: RefreshTopic): Observable<void> {
    return this.events$.pipe(
      filter(t => t === topic),
      map(() => undefined)
    );
  }
}
