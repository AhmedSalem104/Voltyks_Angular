import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PrintOptions {
  title: string;
  subtitle?: string;
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  showDate?: boolean;
  showLogo?: boolean;
  columns?: { header: string; field: string; width?: number }[];
  data?: any[];
}

// Voltyks Logo as SVG data URL (green bolt icon)
const VOLTYKS_LOGO = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMwMEM4NTMiLz4KPHBhdGggZD0iTTI0IDhMMTIgMjJIMThMMTYgMzJMMjggMThIMjJMMjQgOFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPg==`;

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  // PDF dimensions
  private readonly PAGE_WIDTH_LANDSCAPE = 297;
  private readonly PAGE_WIDTH_PORTRAIT = 210;
  private readonly PAGE_HEIGHT_LANDSCAPE = 210;
  private readonly PAGE_HEIGHT_PORTRAIT = 297;
  private readonly MARGIN = 15;
  private readonly HEADER_HEIGHT = 35;
  private readonly FOOTER_HEIGHT = 15;
  private readonly ROW_HEIGHT = 10;

  constructor() {}

  /**
   * Professional Table PDF with repeating headers on each page
   */
  async printTableToPdf(options: PrintOptions): Promise<void> {
    const {
      title,
      subtitle = 'Voltyks Admin Dashboard',
      filename = 'report',
      orientation = 'landscape',
      showDate = true,
      columns,
      data
    } = options;

    if (!columns || !data || data.length === 0) {
      console.error('Columns and data are required for table printing');
      return;
    }

    const loadingEl = this.showLoading();

    try {
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = orientation === 'landscape' ? this.PAGE_WIDTH_LANDSCAPE : this.PAGE_WIDTH_PORTRAIT;
      const pageHeight = orientation === 'landscape' ? this.PAGE_HEIGHT_LANDSCAPE : this.PAGE_HEIGHT_PORTRAIT;
      const contentWidth = pageWidth - (this.MARGIN * 2);

      // Calculate column widths
      const colWidth = contentWidth / columns.length;

      // Calculate rows per page (accounting for header and footer)
      const tableHeaderHeight = 12;
      const availableHeight = pageHeight - this.MARGIN - this.HEADER_HEIGHT - tableHeaderHeight - this.FOOTER_HEIGHT - this.MARGIN;
      const rowsPerPage = Math.floor(availableHeight / this.ROW_HEIGHT);

      let currentPage = 1;
      const totalPages = Math.ceil(data.length / rowsPerPage);

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
          pdf.addPage();
          currentPage++;
        }

        // Draw page header
        this.drawPageHeader(pdf, title, subtitle, showDate, pageWidth, currentPage, totalPages);

        // Draw table header
        let yPos = this.MARGIN + this.HEADER_HEIGHT + 5;
        this.drawTableHeader(pdf, columns, colWidth, yPos);
        yPos += tableHeaderHeight;

        // Draw table rows for this page
        const startRow = pageIndex * rowsPerPage;
        const endRow = Math.min(startRow + rowsPerPage, data.length);

        for (let i = startRow; i < endRow; i++) {
          const row = data[i];
          const isEven = (i - startRow) % 2 === 0;

          // Row background
          pdf.setFillColor(isEven ? 250 : 245, isEven ? 250 : 245, isEven ? 250 : 245);
          pdf.rect(this.MARGIN, yPos, contentWidth, this.ROW_HEIGHT, 'F');

          // Row data
          pdf.setFontSize(9);
          pdf.setTextColor(50, 50, 50);

          columns.forEach((col, colIndex) => {
            let value = this.getNestedValue(row, col.field);
            if (value === null || value === undefined) value = '-';
            else if (typeof value === 'boolean') value = value ? 'نعم' : 'لا';
            value = String(value);

            // Truncate long text
            if (value.length > 25) {
              value = value.substring(0, 22) + '...';
            }

            const xPos = this.MARGIN + (colIndex * colWidth) + (colWidth / 2);
            pdf.text(value, xPos, yPos + 6.5, { align: 'center' });
          });

          // Row border
          pdf.setDrawColor(230, 230, 230);
          pdf.line(this.MARGIN, yPos + this.ROW_HEIGHT, this.MARGIN + contentWidth, yPos + this.ROW_HEIGHT);

          yPos += this.ROW_HEIGHT;
        }

        // Draw table border
        pdf.setDrawColor(0, 200, 83);
        pdf.setLineWidth(0.5);
        pdf.rect(this.MARGIN, this.MARGIN + this.HEADER_HEIGHT + 5, contentWidth, yPos - (this.MARGIN + this.HEADER_HEIGHT + 5));

        // Draw page footer
        this.drawPageFooter(pdf, pageWidth, pageHeight, data.length);
      }

      pdf.save(`${filename}_${this.getDateString()}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF');
    } finally {
      this.hideLoading(loadingEl);
    }
  }

  /**
   * Print rich content (Terms, About, Protocol, etc.) with proper pagination
   */
  async printContentToPdf(content: string, options: PrintOptions): Promise<void> {
    const {
      title,
      subtitle = 'Voltyks Admin Dashboard',
      filename = 'report',
      orientation = 'portrait'
    } = options;

    const loadingEl = this.showLoading();

    try {
      // Create temporary container with white background
      const container = document.createElement('div');
      container.id = 'print-content-container';
      container.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: ${orientation === 'landscape' ? '1050px' : '750px'};
        background: #ffffff;
        font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
        direction: rtl;
        padding: 0;
      `;

      container.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          #print-content-container * {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            box-sizing: border-box;
          }
        </style>

        <!-- Header -->
        <div style="
          background: linear-gradient(135deg, #00C853 0%, #009E3D 100%);
          padding: 25px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <div>
            <div style="font-size: 26px; font-weight: 700; color: #ffffff;">${title}</div>
            <div style="font-size: 13px; color: rgba(255,255,255,0.85); margin-top: 5px;">${subtitle}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${VOLTYKS_LOGO}" width="45" height="45" style="border-radius: 50%; background: white; padding: 2px;" />
            <div style="font-size: 28px; font-weight: 700; color: #ffffff;">Voltyks</div>
          </div>
        </div>

        <!-- Content -->
        <div style="
          padding: 35px 40px;
          background: #ffffff;
          color: #333333;
          font-size: 14px;
          line-height: 2;
          min-height: 400px;
        ">
          ${content}
        </div>

        <!-- Footer -->
        <div style="
          padding: 20px 30px;
          background: #f8f9fa;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #666;
          font-size: 11px;
          border-top: 2px solid #00C853;
        ">
          <div>
            <span style="color: #00C853; font-weight: 600;">تاريخ الطباعة:</span>
            ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>Voltyks Admin Dashboard</span>
            <span style="color: #00C853;">©</span>
            <span>${new Date().getFullYear()}</span>
          </div>
        </div>
      `;

      document.body.appendChild(container);
      await new Promise(resolve => setTimeout(resolve, 600));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(container);

      const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Smart pagination
      await this.addImageWithPagination(pdf, canvas, imgWidth, imgHeight, margin, pageWidth, pageHeight);

      pdf.save(`${filename}_${this.getDateString()}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF');
    } finally {
      this.hideLoading(loadingEl);
    }
  }

  /**
   * Draw page header with logo
   */
  private drawPageHeader(
    pdf: jsPDF,
    title: string,
    subtitle: string,
    showDate: boolean,
    pageWidth: number,
    currentPage: number,
    totalPages: number
  ): void {
    // Header background
    pdf.setFillColor(0, 200, 83);
    pdf.rect(this.MARGIN, this.MARGIN, pageWidth - (this.MARGIN * 2), this.HEADER_HEIGHT, 'F');

    // Logo circle
    pdf.setFillColor(255, 255, 255);
    pdf.circle(pageWidth - this.MARGIN - 18, this.MARGIN + 17.5, 12, 'F');

    // Bolt icon (simplified)
    pdf.setFillColor(0, 200, 83);
    pdf.triangle(
      pageWidth - this.MARGIN - 22, this.MARGIN + 12,
      pageWidth - this.MARGIN - 18, this.MARGIN + 20,
      pageWidth - this.MARGIN - 14, this.MARGIN + 12
    );
    pdf.triangle(
      pageWidth - this.MARGIN - 22, this.MARGIN + 23,
      pageWidth - this.MARGIN - 18, this.MARGIN + 15,
      pageWidth - this.MARGIN - 14, this.MARGIN + 23
    );

    // Title
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.text(title, this.MARGIN + 8, this.MARGIN + 15);

    // Subtitle
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text(subtitle, this.MARGIN + 8, this.MARGIN + 23);

    // Date
    if (showDate) {
      pdf.setFontSize(8);
      const dateStr = new Date().toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      pdf.text(dateStr, this.MARGIN + 8, this.MARGIN + 30);
    }

    // Page number
    pdf.setFontSize(9);
    pdf.text(`${currentPage} / ${totalPages}`, pageWidth - this.MARGIN - 40, this.MARGIN + 30);

    // Voltyks text
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Voltyks', pageWidth - this.MARGIN - 35, this.MARGIN + 18);
  }

  /**
   * Draw table header row
   */
  private drawTableHeader(pdf: jsPDF, columns: any[], colWidth: number, yPos: number): void {
    const contentWidth = colWidth * columns.length;

    // Header background
    pdf.setFillColor(0, 200, 83);
    pdf.rect(this.MARGIN, yPos, contentWidth, 12, 'F');

    // Header text
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);

    columns.forEach((col, index) => {
      const xPos = this.MARGIN + (index * colWidth) + (colWidth / 2);
      pdf.text(col.header, xPos, yPos + 8, { align: 'center' });
    });
  }

  /**
   * Draw page footer
   */
  private drawPageFooter(pdf: jsPDF, pageWidth: number, pageHeight: number, totalRecords: number): void {
    const yPos = pageHeight - this.MARGIN - 5;

    // Footer line
    pdf.setDrawColor(0, 200, 83);
    pdf.setLineWidth(0.5);
    pdf.line(this.MARGIN, yPos - 5, pageWidth - this.MARGIN, yPos - 5);

    // Total records
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`إجمالي السجلات: ${totalRecords}`, this.MARGIN + 5, yPos);

    // Copyright
    pdf.text(`Voltyks Admin Dashboard © ${new Date().getFullYear()}`, pageWidth - this.MARGIN - 5, yPos, { align: 'right' });
  }

  /**
   * Add image to PDF with smart pagination
   */
  private async addImageWithPagination(
    pdf: jsPDF,
    canvas: HTMLCanvasElement,
    imgWidth: number,
    imgHeight: number,
    margin: number,
    pageWidth: number,
    pageHeight: number
  ): Promise<void> {
    const availableHeight = pageHeight - (margin * 2);

    if (imgHeight <= availableHeight) {
      // Single page - center vertically
      const yPos = margin;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, yPos, imgWidth, imgHeight);
    } else {
      // Multiple pages
      let remainingHeight = imgHeight;
      let sourceY = 0;
      let isFirstPage = true;

      while (remainingHeight > 0) {
        if (!isFirstPage) {
          pdf.addPage();
        }

        const heightToDraw = Math.min(remainingHeight, availableHeight);
        const sourceHeight = (heightToDraw / imgHeight) * canvas.height;

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = canvas.width;
        croppedCanvas.height = sourceHeight;

        const ctx = croppedCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, croppedCanvas.width, croppedCanvas.height);
          ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
          pdf.addImage(croppedCanvas.toDataURL('image/png'), 'PNG', margin, margin, imgWidth, heightToDraw);
        }

        remainingHeight -= heightToDraw;
        sourceY += sourceHeight;
        isFirstPage = false;
      }
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private showLoading(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.id = 'print-loading-overlay';
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255,255,255,0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        flex-direction: column;
        gap: 20px;
      ">
        <div style="
          width: 60px;
          height: 60px;
          border: 4px solid #e0e0e0;
          border-top-color: #00C853;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <div style="color: #333; font-size: 18px; font-family: 'Cairo', sans-serif; font-weight: 600;">
          جاري إنشاء ملف PDF...
        </div>
        <div style="color: #666; font-size: 13px; font-family: 'Cairo', sans-serif;">
          يرجى الانتظار
        </div>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  private hideLoading(element: HTMLElement): void {
    element?.remove();
  }
}
