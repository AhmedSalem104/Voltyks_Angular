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
  private readonly ROWS_PER_PAGE = 15;

  constructor() {}

  /**
   * Professional Table PDF with Arabic support using html2canvas
   * Creates separate pages with repeating headers
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

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      // Split data into pages
      const totalPages = Math.ceil(data.length / this.ROWS_PER_PAGE);

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        // Get data for this page
        const startRow = pageIndex * this.ROWS_PER_PAGE;
        const endRow = Math.min(startRow + this.ROWS_PER_PAGE, data.length);
        const pageData = data.slice(startRow, endRow);

        // Create HTML for this page
        const pageHtml = this.createTablePageHtml(
          title,
          subtitle,
          showDate,
          columns,
          pageData,
          startRow,
          pageIndex + 1,
          totalPages,
          data.length,
          orientation
        );

        // Render to canvas
        const canvas = await this.renderHtmlToCanvas(pageHtml, orientation);

        // Add to PDF
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          margin,
          margin,
          imgWidth,
          Math.min(imgHeight, pageHeight - (margin * 2))
        );
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
   * Create HTML for a single table page
   */
  private createTablePageHtml(
    title: string,
    subtitle: string,
    showDate: boolean,
    columns: any[],
    pageData: any[],
    startIndex: number,
    currentPage: number,
    totalPages: number,
    totalRecords: number,
    orientation: string
  ): string {
    const dateStr = showDate ? new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '';

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
          }
          body {
            background: #ffffff;
            direction: rtl;
          }
          .page {
            width: ${orientation === 'landscape' ? '1120px' : '794px'};
            padding: 0;
            background: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #00C853 0%, #009E3D 100%);
            padding: 30px 40px;
            display: flex;
            flex-direction: row-reverse;
            justify-content: space-between;
            align-items: center;
            border-radius: 0;
            min-height: 100px;
          }
          .header-right {
            text-align: right;
            flex: 1;
            padding-left: 30px;
          }
          .header-right h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
          }
          .header-right .subtitle {
            color: rgba(255,255,255,0.9);
            font-size: 14px;
            margin-bottom: 6px;
          }
          .header-right .date {
            color: rgba(255,255,255,0.8);
            font-size: 13px;
            margin-top: 6px;
          }
          .header-left {
            display: flex;
            flex-direction: row-reverse;
            align-items: center;
            gap: 16px;
            flex-shrink: 0;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .logo img {
            width: 100%;
            height: 100%;
          }
          .brand-name {
            color: #ffffff;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 1px;
          }
          .page-number {
            color: rgba(255,255,255,0.9);
            font-size: 13px;
            margin-top: 8px;
            text-align: right;
          }
          .table-container {
            padding: 20px 25px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #00C853;
            border-radius: 8px;
            overflow: hidden;
          }
          thead tr {
            background: linear-gradient(135deg, #00C853 0%, #00a844 100%);
          }
          th {
            color: #ffffff;
            font-weight: 600;
            font-size: 13px;
            padding: 14px 10px;
            text-align: center;
            border-left: 1px solid rgba(255,255,255,0.2);
          }
          th:last-child {
            border-left: none;
          }
          tbody tr:nth-child(odd) {
            background: #ffffff;
          }
          tbody tr:nth-child(even) {
            background: #f8f9fa;
          }
          td {
            color: #333333;
            font-size: 12px;
            padding: 12px 10px;
            text-align: center;
            border-bottom: 1px solid #e9ecef;
            border-left: 1px solid #e9ecef;
          }
          td:last-child {
            border-left: none;
          }
          tbody tr:last-child td {
            border-bottom: none;
          }
          .footer {
            padding: 15px 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 2px solid #00C853;
            background: #f8f9fa;
          }
          .footer-left {
            color: #555;
            font-size: 11px;
          }
          .footer-left span {
            color: #00C853;
            font-weight: 600;
          }
          .footer-right {
            color: #777;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="header-right">
              <h1>${title}</h1>
              <div class="subtitle">${subtitle}</div>
              ${showDate ? `<div class="date">${dateStr}</div>` : ''}
            </div>
            <div class="header-left">
              <div class="logo">
                <img src="${VOLTYKS_LOGO}" alt="Voltyks Logo">
              </div>
              <div class="brand-name">Voltyks</div>
            </div>
          </div>
          <div class="page-number" style="text-align: right; padding: 8px 25px; background: #f0f0f0; color: #555; font-size: 12px;">
            صفحة ${currentPage} من ${totalPages}
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  ${columns.map(col => `<th>${col.header}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${pageData.map((row, index) => `
                  <tr>
                    ${columns.map(col => {
                      let value = this.getNestedValue(row, col.field);
                      if (col.field === 'index') {
                        value = startIndex + index + 1;
                      } else if (value === null || value === undefined) {
                        value = '-';
                      } else if (typeof value === 'boolean') {
                        value = value ? 'نعم' : 'لا';
                      }
                      return `<td>${value}</td>`;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="footer">
            <div class="footer-right">
              <span>إجمالي السجلات:</span> ${totalRecords}
            </div>
            <div class="footer-left">
              Voltyks Admin Dashboard © ${new Date().getFullYear()}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Render HTML string to canvas
   */
  private async renderHtmlToCanvas(html: string, orientation: string): Promise<HTMLCanvasElement> {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: ${orientation === 'landscape' ? '1120px' : '794px'};
      background: #ffffff;
    `;
    container.innerHTML = html;
    document.body.appendChild(container);

    // Wait for fonts to load
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true
    });

    document.body.removeChild(container);
    return canvas;
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
      const dateStr = new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Create HTML page
      const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            }
            body {
              background: #ffffff;
              direction: rtl;
            }
            .page {
              width: ${orientation === 'landscape' ? '1050px' : '750px'};
              background: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #00C853 0%, #009E3D 100%);
              padding: 30px 40px;
              display: flex;
              flex-direction: row-reverse;
              justify-content: space-between;
              align-items: center;
              min-height: 100px;
            }
            .header-right {
              text-align: right;
              flex: 1;
              padding-left: 30px;
            }
            .header-right h1 {
              color: #ffffff;
              font-size: 30px;
              font-weight: 700;
              margin-bottom: 8px;
              letter-spacing: 0.5px;
            }
            .header-right .subtitle {
              color: rgba(255,255,255,0.9);
              font-size: 14px;
            }
            .header-left {
              display: flex;
              flex-direction: row-reverse;
              align-items: center;
              gap: 16px;
              flex-shrink: 0;
            }
            .logo {
              width: 60px;
              height: 60px;
              background: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 10px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .logo img {
              width: 100%;
              height: 100%;
            }
            .brand-name {
              color: #ffffff;
              font-size: 32px;
              font-weight: 700;
              letter-spacing: 1px;
            }
            .content {
              padding: 35px 40px;
              background: #ffffff;
              color: #333333;
              font-size: 14px;
              line-height: 2;
            }
            .footer {
              padding: 20px 30px;
              background: #f8f9fa;
              display: flex;
              justify-content: space-between;
              align-items: center;
              color: #666;
              font-size: 11px;
              border-top: 2px solid #00C853;
            }
            .footer .date-label {
              color: #00C853;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="header-right">
                <h1>${title}</h1>
                <div class="subtitle">${subtitle}</div>
              </div>
              <div class="header-left">
                <div class="logo">
                  <img src="${VOLTYKS_LOGO}" alt="Voltyks Logo">
                </div>
                <div class="brand-name">Voltyks</div>
              </div>
            </div>
            <div class="content">
              ${content}
            </div>
            <div class="footer">
              <div>
                <span class="date-label">تاريخ الطباعة:</span> ${dateStr}
              </div>
              <div>
                Voltyks Admin Dashboard © ${new Date().getFullYear()}
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const canvas = await this.renderHtmlToCanvas(html, orientation);

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
      // Single page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imgWidth, imgHeight);
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
