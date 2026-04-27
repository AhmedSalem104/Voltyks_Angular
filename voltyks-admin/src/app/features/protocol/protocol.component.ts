import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PrintService } from '../../core/services/print.service';

@Component({
  selector: 'app-protocol',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './protocol.component.html',
  styleUrls: ['./protocol.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProtocolComponent implements OnInit {
  selectedType: 'chinese' | 'european' = 'chinese';

  constructor(
    private printService: PrintService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {}

  toggleProtocolType(): void {
    this.selectedType = this.selectedType === 'chinese' ? 'european' : 'chinese';
  }

  get detailedContent(): string {
    const key = this.selectedType === 'chinese' ? 'protocol.contentChinese' : 'protocol.contentEuropean';
    return this.translate.instant(key);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get protocolTypeLabel(): string {
    const key = this.selectedType === 'chinese' ? 'protocol.chineseLabel' : 'protocol.europeanLabel';
    return this.translate.instant(key);
  }

  get otherProtocolTypeLabel(): string {
    const key = this.selectedType === 'chinese' ? 'protocol.europeanLabel' : 'protocol.chineseLabel';
    return this.translate.instant(key);
  }

  get protocolTypeIcon(): string {
    return this.selectedType === 'chinese' ? '🇨🇳' : '🇪🇺';
  }

  printToPdf(): void {
    const content = this.detailedContent.replace(/\n/g, '<br>');
    this.printService.printContentToPdf(content, {
      title: this.protocolTypeLabel,
      filename: this.selectedType === 'chinese' ? 'chinese_protocol' : 'european_protocol',
      orientation: 'portrait'
    });
  }
}
