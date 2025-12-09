import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface PrintOptions {
  title: string;
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  showDate?: boolean;
  columns?: { header: string; field: string; width?: number }[];
  data?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  constructor() {}

  /**
   * Print table data to PDF with Arabic support
   */
  async printTableToPdf(options: PrintOptions): Promise<void> {
    const { title, filename = 'report', orientation = 'landscape', showDate = true, columns, data } = options;

    if (!columns || !data) {
      console.error('Columns and data are required for table printing');
      return;
    }

    // Show loading
    const loadingEl = this.showLoading();

    try {
      // Create temporary container for rendering
      const container = document.createElement('div');
      container.id = 'print-temp-container';
      container.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: ${orientation === 'landscape' ? '1100px' : '800px'};
        background: #1a1a2e;
        padding: 30px;
        font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
        direction: rtl;
      `;
      document.body.appendChild(container);

      // Build HTML content
      const dateStr = showDate ? new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

      container.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          #print-temp-container * {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            box-sizing: border-box;
          }
        </style>
        <div style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          padding: 20px 30px;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #02e600;
        ">
          <div>
            <div style="font-size: 28px; font-weight: 700; color: #ffffff; margin-bottom: 5px;">${title}</div>
            <div style="font-size: 14px; color: #888;">Voltyks Admin Dashboard</div>
          </div>
          <div style="text-align: left;">
            <div style="font-size: 32px; font-weight: 700; color: #02e600;">Voltyks</div>
            ${showDate ? `<div style="font-size: 12px; color: #888; margin-top: 5px;">${dateStr}</div>` : ''}
          </div>
        </div>

        <div style="
          background: #121212;
          padding: 20px;
          border-radius: 0 0 12px 12px;
        ">
          <table style="
            width: 100%;
            border-collapse: collapse;
            direction: rtl;
          ">
            <thead>
              <tr style="background: linear-gradient(135deg, #1e1e32 0%, #252540 100%);">
                ${columns.map(col => `
                  <th style="
                    padding: 15px 12px;
                    color: #02e600;
                    font-weight: 600;
                    font-size: 14px;
                    text-align: center;
                    border-bottom: 2px solid #02e600;
                  ">${col.header}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map((row, index) => `
                <tr style="background: ${index % 2 === 0 ? '#1a1a2e' : '#151525'};">
                  ${columns.map(col => {
                    let value = this.getNestedValue(row, col.field);
                    if (value === null || value === undefined) value = '-';
                    else if (typeof value === 'boolean') value = value ? 'نعم' : 'لا';
                    return `
                      <td style="
                        padding: 12px;
                        color: #e0e0e0;
                        font-size: 13px;
                        text-align: center;
                        border-bottom: 1px solid #333;
                      ">${value}</td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #666;
            font-size: 12px;
          ">
            <div>إجمالي السجلات: ${data.length}</div>
            <div>Voltyks Admin Dashboard © ${new Date().getFullYear()}</div>
          </div>
        </div>
      `;

      // Wait for fonts to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture as canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#121212',
        allowTaint: true
      });

      // Remove temporary container
      document.body.removeChild(container);

      // Create PDF
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Handle multiple pages
      let yPosition = margin;
      let remainingHeight = imgHeight;
      let sourceY = 0;
      let pageNum = 1;

      while (remainingHeight > 0) {
        const availableHeight = pageHeight - (margin * 2);
        const heightToDraw = Math.min(remainingHeight, availableHeight);
        const sourceHeight = (heightToDraw / imgHeight) * canvas.height;

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
          pageNum++;
          yPosition = margin;
        }
      }

      // Save PDF
      pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF');
    } finally {
      this.hideLoading(loadingEl);
    }
  }

  /**
   * Print HTML element to PDF
   */
  async printElementToPdf(elementId: string, options: PrintOptions): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id "${elementId}" not found`);
      return;
    }

    const { title, filename = 'report', orientation = 'portrait' } = options;
    const loadingEl = this.showLoading();

    try {
      // Clone element for printing
      const clone = element.cloneNode(true) as HTMLElement;
      const container = document.createElement('div');
      container.id = 'print-element-container';
      container.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: ${orientation === 'landscape' ? '1100px' : '800px'};
        background: #121212;
        padding: 20px;
        font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
        direction: rtl;
      `;

      // Add header
      const header = document.createElement('div');
      header.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          padding: 20px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #02e600;
          margin-bottom: 20px;
        ">
          <div style="font-size: 24px; font-weight: 700; color: #ffffff;">${title}</div>
          <div style="font-size: 28px; font-weight: 700; color: #02e600;">Voltyks</div>
        </div>
      `;

      container.appendChild(header);
      container.appendChild(clone);
      document.body.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#121212'
      });

      document.body.removeChild(container);

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yPosition = margin;
      let remainingHeight = imgHeight;
      let sourceY = 0;

      while (remainingHeight > 0) {
        const availableHeight = pageHeight - (margin * 2);
        const heightToDraw = Math.min(remainingHeight, availableHeight);
        const sourceHeight = (heightToDraw / imgHeight) * canvas.height;

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = canvas.width;
        croppedCanvas.height = sourceHeight;
        const ctx = croppedCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
          pdf.addImage(croppedCanvas.toDataURL('image/png'), 'PNG', margin, yPosition, imgWidth, heightToDraw);
        }

        remainingHeight -= heightToDraw;
        sourceY += sourceHeight;

        if (remainingHeight > 0) {
          pdf.addPage();
          yPosition = margin;
        }
      }

      pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF');
    } finally {
      this.hideLoading(loadingEl);
    }
  }

  /**
   * Print rich content (Terms, About, etc.)
   */
  async printContentToPdf(content: string, options: PrintOptions): Promise<void> {
    const { title, filename = 'report', orientation = 'portrait' } = options;
    const loadingEl = this.showLoading();

    try {
      const container = document.createElement('div');
      container.id = 'print-content-container';
      container.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: ${orientation === 'landscape' ? '1100px' : '800px'};
        background: #121212;
        font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
        direction: rtl;
      `;

      container.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          #print-content-container * {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            box-sizing: border-box;
          }
        </style>
        <div style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          padding: 25px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #02e600;
        ">
          <div>
            <div style="font-size: 28px; font-weight: 700; color: #ffffff;">${title}</div>
            <div style="font-size: 14px; color: #888; margin-top: 5px;">Voltyks Admin Dashboard</div>
          </div>
          <div style="font-size: 32px; font-weight: 700; color: #02e600;">Voltyks</div>
        </div>
        <div style="
          padding: 30px;
          background: #1a1a2e;
          color: #e0e0e0;
          font-size: 15px;
          line-height: 1.8;
        ">
          ${content}
        </div>
        <div style="
          padding: 15px 30px;
          background: #121212;
          display: flex;
          justify-content: space-between;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #333;
        ">
          <div>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</div>
          <div>Voltyks © ${new Date().getFullYear()}</div>
        </div>
      `;

      document.body.appendChild(container);
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#121212'
      });

      document.body.removeChild(container);

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yPosition = margin;
      let remainingHeight = imgHeight;
      let sourceY = 0;

      while (remainingHeight > 0) {
        const availableHeight = pageHeight - (margin * 2);
        const heightToDraw = Math.min(remainingHeight, availableHeight);
        const sourceHeight = (heightToDraw / imgHeight) * canvas.height;

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = canvas.width;
        croppedCanvas.height = sourceHeight;
        const ctx = croppedCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
          pdf.addImage(croppedCanvas.toDataURL('image/png'), 'PNG', margin, yPosition, imgWidth, heightToDraw);
        }

        remainingHeight -= heightToDraw;
        sourceY += sourceHeight;

        if (remainingHeight > 0) {
          pdf.addPage();
          yPosition = margin;
        }
      }

      pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF');
    } finally {
      this.hideLoading(loadingEl);
    }
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
        background: rgba(0,0,0,0.85);
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
          border: 4px solid #333;
          border-top-color: #02e600;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <div style="color: #fff; font-size: 18px; font-family: 'Cairo', sans-serif;">جاري إنشاء ملف PDF...</div>
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
