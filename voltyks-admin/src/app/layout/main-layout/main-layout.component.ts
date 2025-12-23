import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { ToasterComponent } from '../../shared/components/toaster/toaster.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarComponent,
    HeaderComponent,
    ToasterComponent
  ],
  template: `
    <div class="main-layout">
      <app-sidebar></app-sidebar>

      <div class="content-area">
        <app-header></app-header>

        <main class="page-content">
          <router-outlet></router-outlet>
        </main>
      </div>

      <app-toaster></app-toaster>
    </div>
  `,
  styleUrls: ['./main-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent {}
