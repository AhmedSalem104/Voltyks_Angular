import { Injectable } from '@angular/core';

// Lazy loaded - not imported at top level to reduce bundle size
type jsPDFType = import('jspdf').jsPDF;
type Html2CanvasType = typeof import('html2canvas').default;

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

  // Cached lazy loaded modules
  private jsPDFModule: typeof import('jspdf') | null = null;
  private html2canvasModule: Html2CanvasType | null = null;

  constructor() {}

  /**
   * Lazy load jsPDF library
   */
  private async getJsPDF(): Promise<typeof import('jspdf')> {
    if (!this.jsPDFModule) {
      this.jsPDFModule = await import('jspdf');
    }
    return this.jsPDFModule;
  }

  /**
   * Lazy load html2canvas library
   */
  private async getHtml2Canvas(): Promise<Html2CanvasType> {
    if (!this.html2canvasModule) {
      const module = await import('html2canvas');
      this.html2canvasModule = module.default;
    }
    return this.html2canvasModule;
  }

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
      // Lazy load jsPDF
      const { jsPDF } = await this.getJsPDF();

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
          canvas.toDataURL('image/jpeg', 0.92),
          'JPEG',
          margin,
          margin,
          imgWidth,
          Math.min(imgHeight, pageHeight - (margin * 2)),
          undefined,
          'FAST'
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
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif !important;
          }
          body {
            background: #ffffff;
            direction: rtl;
            text-align: right;
          }
          .page {
            width: ${orientation === 'landscape' ? '1120px' : '794px'};
            padding: 0;
            background: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #00C853 0%, #009E3D 100%);
            padding: 25px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 0;
            min-height: 90px;
          }
          .header-right {
            text-align: right;
            order: 2;
          }
          .header-right h1 {
            color: #ffffff;
            font-size: 26px;
            font-weight: 700;
            margin-bottom: 6px;
          }
          .header-right .subtitle {
            color: rgba(255,255,255,0.9);
            font-size: 13px;
            margin-bottom: 4px;
          }
          .header-right .date {
            color: rgba(255,255,255,0.8);
            font-size: 12px;
            margin-top: 4px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
            order: 1;
          }
          .logo {
            width: 55px;
            height: 55px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.15);
          }
          .logo img {
            width: 100%;
            height: 100%;
          }
          .brand-name {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
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
    // Lazy load html2canvas
    const html2canvas = await this.getHtml2Canvas();

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

    // Wait for fonts to load properly
    await this.waitForFonts();

    const canvas = await html2canvas(container, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true
    });

    document.body.removeChild(container);
    return canvas;
  }

  /**
   * Wait for fonts to be ready
   */
  private async waitForFonts(): Promise<void> {
    // Load Cairo font explicitly
    try {
      await document.fonts.load('700 28px Cairo');
      await document.fonts.load('600 14px Cairo');
      await document.fonts.load('400 12px Cairo');
    } catch (e) {
      console.log('Font loading via API not supported');
    }

    // Check if document.fonts API is available
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    // Additional wait for rendering
    await new Promise(resolve => setTimeout(resolve, 800));
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
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif !important;
            }
            body {
              background: #ffffff;
              direction: rtl;
              text-align: right;
            }
            .page {
              width: ${orientation === 'landscape' ? '1050px' : '750px'};
              background: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #00C853 0%, #009E3D 100%);
              padding: 25px 40px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              min-height: 90px;
            }
            .header-right {
              text-align: right;
              order: 2;
            }
            .header-right h1 {
              color: #ffffff;
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 6px;
            }
            .header-right .subtitle {
              color: rgba(255,255,255,0.9);
              font-size: 13px;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 12px;
              order: 1;
            }
            .logo {
              width: 55px;
              height: 55px;
              background: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 8px;
              box-shadow: 0 3px 10px rgba(0,0,0,0.15);
            }
            .logo img {
              width: 100%;
              height: 100%;
            }
            .brand-name {
              color: #ffffff;
              font-size: 28px;
              font-weight: 700;
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

      // Lazy load jsPDF
      const { jsPDF } = await this.getJsPDF();

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
    pdf: jsPDFType,
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
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
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
          pdf.addImage(croppedCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgWidth, heightToDraw, undefined, 'FAST');
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
