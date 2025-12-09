import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PrintOptions {
  title: string;
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  showDate?: boolean;
  showLogo?: boolean;
  columns?: { header: string; field: string; width?: number }[];
  data?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  private readonly primaryColor = '#02e600';
  private readonly darkBg = '#1a1a2e';
  private readonly textColor = '#ffffff';

  constructor() {}

  /**
   * Print table data to PDF
   */
  async printTableToPdf(options: PrintOptions): Promise<void> {
    const { title, filename = 'report', orientation = 'landscape', showDate = true, columns, data } = options;

    if (!columns || !data) {
      console.error('Columns and data are required for table printing');
      return;
    }

    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Add header with gradient effect
    doc.setFillColor(26, 26, 46); // Dark background
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Add green accent line
    doc.setFillColor(2, 230, 0); // Primary green
    doc.rect(0, 35, pageWidth, 2, 'F');

    // Add Voltyks logo text
    doc.setTextColor(2, 230, 0);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Voltyks', pageWidth - margin, 20, { align: 'right' });

    // Add title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(title, margin, 20);

    // Add subtitle
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Admin Dashboard Report', margin, 28);

    // Add date if enabled
    if (showDate) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`تاريخ الطباعة: ${dateStr}`, pageWidth - margin, 28, { align: 'right' });
    }

    // Calculate column widths
    const tableWidth = pageWidth - (margin * 2);
    const colCount = columns.length;
    const defaultColWidth = tableWidth / colCount;

    // Table settings
    let startY = 45;
    const rowHeight = 10;
    const headerHeight = 12;

    // Draw table header
    doc.setFillColor(30, 30, 50);
    doc.rect(margin, startY, tableWidth, headerHeight, 'F');

    doc.setTextColor(2, 230, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    let currentX = margin;
    columns.forEach((col, index) => {
      const colWidth = col.width || defaultColWidth;
      doc.text(col.header, currentX + colWidth / 2, startY + 8, { align: 'center' });
      currentX += colWidth;
    });

    startY += headerHeight;

    // Draw table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    data.forEach((row, rowIndex) => {
      // Check if we need a new page
      if (startY + rowHeight > pageHeight - 20) {
        doc.addPage();
        startY = 20;

        // Redraw header on new page
        doc.setFillColor(30, 30, 50);
        doc.rect(margin, startY, tableWidth, headerHeight, 'F');

        doc.setTextColor(2, 230, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');

        currentX = margin;
        columns.forEach((col) => {
          const colWidth = col.width || defaultColWidth;
          doc.text(col.header, currentX + colWidth / 2, startY + 8, { align: 'center' });
          currentX += colWidth;
        });

        startY += headerHeight;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }

      // Alternate row background
      if (rowIndex % 2 === 0) {
        doc.setFillColor(25, 25, 40);
      } else {
        doc.setFillColor(20, 20, 35);
      }
      doc.rect(margin, startY, tableWidth, rowHeight, 'F');

      // Draw cell content
      doc.setTextColor(220, 220, 220);
      currentX = margin;
      columns.forEach((col) => {
        const colWidth = col.width || defaultColWidth;
        let value = this.getNestedValue(row, col.field);

        // Format value
        if (value === null || value === undefined) {
          value = '-';
        } else if (typeof value === 'boolean') {
          value = value ? 'نعم' : 'لا';
        } else if (value instanceof Date) {
          value = value.toLocaleDateString('ar-EG');
        }

        // Truncate long text
        const maxChars = Math.floor(colWidth / 2);
        if (String(value).length > maxChars) {
          value = String(value).substring(0, maxChars - 3) + '...';
        }

        doc.text(String(value), currentX + colWidth / 2, startY + 7, { align: 'center' });
        currentX += colWidth;
      });

      // Draw row border
      doc.setDrawColor(50, 50, 70);
      doc.line(margin, startY + rowHeight, margin + tableWidth, startY + rowHeight);

      startY += rowHeight;
    });

    // Add footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(26, 26, 46);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text(`صفحة ${i} من ${totalPages}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
      doc.text('Voltyks Admin Dashboard', margin, pageHeight - 6);
      doc.text(`إجمالي السجلات: ${data.length}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    }

    // Save the PDF
    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  /**
   * Print element to PDF by capturing as image
   */
  async printElementToPdf(elementId: string, options: PrintOptions): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id "${elementId}" not found`);
      return;
    }

    const { title, filename = 'report', orientation = 'portrait' } = options;

    // Show loading
    const loadingEl = this.showLoading();

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#121212'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      // Add header
      pdf.setFillColor(26, 26, 46);
      pdf.rect(0, 0, pageWidth, 25, 'F');

      pdf.setFillColor(2, 230, 0);
      pdf.rect(0, 25, pageWidth, 1, 'F');

      pdf.setTextColor(2, 230, 0);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Voltyks', pageWidth - margin, 15, { align: 'right' });

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.text(title, margin, 15);

      // Calculate image dimensions
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add image
      let yPosition = 30;
      let remainingHeight = imgHeight;
      let sourceY = 0;

      while (remainingHeight > 0) {
        const availableHeight = pageHeight - yPosition - 15;
        const heightToDraw = Math.min(remainingHeight, availableHeight);
        const sourceHeight = (heightToDraw / imgHeight) * canvas.height;

        // Create a cropped canvas for this page section
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = canvas.width;
        croppedCanvas.height = sourceHeight;
        const ctx = croppedCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
          const croppedImgData = croppedCanvas.toDataURL('image/png');
          pdf.addImage(croppedImgData, 'PNG', margin, yPosition, imgWidth, heightToDraw);
        }

        remainingHeight -= heightToDraw;
        sourceY += sourceHeight;

        if (remainingHeight > 0) {
          pdf.addPage();
          yPosition = 10;
        }
      }

      // Add footer to all pages
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFillColor(26, 26, 46);
        pdf.rect(0, pageHeight - 10, pageWidth, 10, 'F');

        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(8);
        pdf.text(`صفحة ${i} من ${totalPages}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
      }

      pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      this.hideLoading(loadingEl);
    }
  }

  /**
   * Quick print current view
   */
  printCurrentView(title: string): void {
    const printContent = document.querySelector('.main-content') as HTMLElement;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${title} - Voltyks Admin</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Cairo', sans-serif;
            background: #fff;
            color: #333;
            padding: 20px;
          }

          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #02e600;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }

          .print-logo {
            font-size: 28px;
            font-weight: 700;
            color: #02e600;
          }

          .print-title {
            font-size: 20px;
            color: #1a1a2e;
          }

          .print-date {
            font-size: 12px;
            color: #666;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }

          th {
            background: #1a1a2e;
            color: #02e600;
            padding: 12px;
            text-align: center;
            font-weight: 600;
          }

          td {
            padding: 10px;
            text-align: center;
            border-bottom: 1px solid #ddd;
          }

          tr:nth-child(even) {
            background: #f9f9f9;
          }

          .print-footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 10px;
            color: #999;
          }

          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div>
            <div class="print-title">${title}</div>
            <div class="print-date">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</div>
          </div>
          <div class="print-logo">Voltyks</div>
        </div>
        ${printContent.innerHTML}
        <div class="print-footer">
          Voltyks Admin Dashboard - جميع الحقوق محفوظة © ${new Date().getFullYear()}
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
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
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        flex-direction: column;
        gap: 20px;
      ">
        <div style="
          width: 50px;
          height: 50px;
          border: 4px solid #333;
          border-top-color: #02e600;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <div style="color: #fff; font-size: 16px;">جاري إنشاء ملف PDF...</div>
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
