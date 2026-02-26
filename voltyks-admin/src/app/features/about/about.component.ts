import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrintService } from '../../core/services/print.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="about-container">
      <div class="hero-section voltyks-card">
        <div class="hero-header">
          <h1>Voltyks</h1>
          <button class="voltyks-btn print-btn hero-print-btn" (click)="printToPdf()">
            <span class="material-symbols-rounded">print</span>
            <span>طباعة PDF</span>
          </button>
        </div>
        <p class="tagline">حرية التنقل. شفافية الأسعار. قوة الاختيار.</p>
      </div>

      <div class="content-grid">
        <div class="content-card voltyks-card">
          <span class="material-symbols-rounded card-icon">electric_bolt</span>
          <h3>رؤيتنا</h3>
          <p>
            At its core, Voltyks stands for freedom, transparency, and empowerment.
            We challenge outdated systems and give both drivers and riders the power to choose—
            a true peer-to-peer marketplace where no one gets exploited.
          </p>
        </div>

        <div class="content-card voltyks-card">
          <span class="material-symbols-rounded card-icon">group</span>
          <h3>المجتمع</h3>
          <p>
            Voltyks fosters a vibrant community where drivers and riders connect directly.
            We believe in fair compensation for drivers and affordable, transparent pricing for riders.
          </p>
        </div>

        <div class="content-card voltyks-card">
          <span class="material-symbols-rounded card-icon">verified</span>
          <h3>الشفافية</h3>
          <p>
            Every transaction on Voltyks is transparent. We don't hide fees or manipulate prices.
            What you see is what you get—a platform built on trust and honesty.
          </p>
        </div>

        <div class="content-card voltyks-card">
          <span class="material-symbols-rounded card-icon">security</span>
          <h3>الأمان</h3>
          <p>
            Safety is our top priority. With verified profiles, ratings, and secure payment systems,
            we ensure that every ride on Voltyks is safe and reliable.
          </p>
        </div>

        <div class="content-card voltyks-card">
          <span class="material-symbols-rounded card-icon">trending_up</span>
          <h3>النمو</h3>
          <p>
            We're constantly evolving and improving our platform based on community feedback.
            Voltyks is more than a service—it's a movement towards better transportation.
          </p>
        </div>

        <div class="content-card voltyks-card">
          <span class="material-symbols-rounded card-icon">public</span>
          <h3>التأثير العالمي</h3>
          <p>
            Starting locally, thinking globally. Voltyks aims to revolutionize transportation
            markets worldwide, one community at a time.
          </p>
        </div>
      </div>

      <div class="mission-section voltyks-card">
        <h2>مهمتنا</h2>
        <p>
          To create a sustainable, fair, and transparent transportation ecosystem
          where drivers earn what they deserve and riders pay fair prices—
          all while maintaining the highest standards of safety and service quality.
        </p>
        <p>
          Join us in building the future of transportation. Together, we can create
          a system that works for everyone.
        </p>
      </div>

      <div class="stats-section">
        <div class="stat-item voltyks-card">
          <span class="material-symbols-rounded stat-icon">people</span>
          <h4>1000+</h4>
          <p>مستخدم نشط</p>
        </div>
        <div class="stat-item voltyks-card">
          <span class="material-symbols-rounded stat-icon">route</span>
          <h4>5000+</h4>
          <p>رحلة مكتملة</p>
        </div>
        <div class="stat-item voltyks-card">
          <span class="material-symbols-rounded stat-icon">star</span>
          <h4>4.8/5</h4>
          <p>متوسط التقييم</p>
        </div>
        <div class="stat-item voltyks-card">
          <span class="material-symbols-rounded stat-icon">location_city</span>
          <h4>10+</h4>
          <p>مدن مغطاة</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .about-container {
      .hero-section {
        text-align: center;
        padding: 64px 32px;
        background: linear-gradient(135deg, #00C853 0%, #009E3D 100%);
        margin-bottom: 32px;

        .hero-header {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 24px;
          margin-bottom: 16px;
          flex-wrap: wrap;

          .hero-print-btn {
            background: rgba(255,255,255,0.15) !important;
            border-color: rgba(255,255,255,0.6) !important;
            color: white !important;
            backdrop-filter: blur(10px);

            &:hover:not(:disabled) {
              background: rgba(255,255,255,0.25) !important;
              border-color: white !important;
              box-shadow: 0 4px 15px rgba(255,255,255,0.3) !important;
            }
          }

          @media (max-width: 768px) {
            gap: 16px;
          }

          @media (max-width: 480px) {
            flex-direction: column;
            gap: 12px;
          }
        }

        h1 {
          font-size: 56px;
          font-weight: 700;
          color: white;
          margin-bottom: 0;
        }

        .tagline {
          font-size: 24px;
          color: rgba(255, 255, 255, 0.95);
          font-weight: 500;
        }
      }

      .content-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
        margin-bottom: 32px;

        .content-card {
          text-align: center;
          padding: 32px 24px;

          .card-icon {
            font-size: 64px;
            color: #00C853;
            margin-bottom: 16px;
          }

          h3 {
            color: white;
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 16px;
          }

          p {
            color: #B0B0B0;
            font-size: 15px;
            line-height: 1.7;
          }
        }
      }

      .mission-section {
        padding: 48px 32px;
        text-align: center;
        margin-bottom: 32px;

        h2 {
          color: white;
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 24px;
        }

        p {
          color: #B0B0B0;
          font-size: 18px;
          line-height: 1.8;
          max-width: 800px;
          margin: 0 auto 16px;
        }
      }

      .stats-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 24px;

        .stat-item {
          text-align: center;
          padding: 32px 24px;

          .stat-icon {
            font-size: 48px;
            color: #00C853;
            margin-bottom: 12px;
          }

          h4 {
            color: white;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
          }

          p {
            color: #B0B0B0;
            font-size: 14px;
          }
        }
      }
    }
  `]
})
export class AboutComponent {
  constructor(private printService: PrintService) {}

  printToPdf(): void {
    const content = `
      <!-- Hero Section -->
      <div style="text-align: center; margin-bottom: 40px; padding: 30px; background: linear-gradient(135deg, #f0fff4 0%, #e8f5e9 100%); border-radius: 16px; border: 2px solid #00C853;">
        <h1 style="font-size: 42px; color: #00C853; margin-bottom: 12px; font-weight: 700;">Voltyks</h1>
        <p style="font-size: 18px; color: #555; font-weight: 500;">حرية التنقل. شفافية الأسعار. قوة الاختيار.</p>
      </div>

      <!-- Vision & Mission Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; border-right: 4px solid #00C853;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
            <span style="font-size: 28px;">⚡</span>
            <h3 style="color: #333; margin: 0; font-size: 18px;">رؤيتنا</h3>
          </div>
          <p style="color: #555; font-size: 14px; line-height: 1.8; margin: 0;">
            At its core, Voltyks stands for freedom, transparency, and empowerment.
            We challenge outdated systems and give both drivers and riders the power to choose—
            a true peer-to-peer marketplace where no one gets exploited.
          </p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; border-right: 4px solid #00C853;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
            <span style="font-size: 28px;">👥</span>
            <h3 style="color: #333; margin: 0; font-size: 18px;">مجتمعنا</h3>
          </div>
          <p style="color: #555; font-size: 14px; line-height: 1.8; margin: 0;">
            We connect drivers and riders directly with fair, transparent pricing.
            No middlemen taking excessive cuts. No hidden algorithms manipulating prices.
            Just people helping people get where they need to go.
          </p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; border-right: 4px solid #00C853;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
            <span style="font-size: 28px;">✓</span>
            <h3 style="color: #333; margin: 0; font-size: 18px;">الشفافية</h3>
          </div>
          <p style="color: #555; font-size: 14px; line-height: 1.8; margin: 0;">
            Every transaction is transparent. No hidden fees or manipulated prices.
            Both drivers and riders see exactly what they're paying and earning.
            Trust built on openness.
          </p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; border-right: 4px solid #00C853;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
            <span style="font-size: 28px;">🔒</span>
            <h3 style="color: #333; margin: 0; font-size: 18px;">الأمان</h3>
          </div>
          <p style="color: #555; font-size: 14px; line-height: 1.8; margin: 0;">
            Verified accounts, ratings, and secure payment systems ensure safety for everyone.
            We prioritize the security of our community above all else.
          </p>
        </div>
      </div>

      <!-- Mission Statement -->
      <div style="background: linear-gradient(135deg, #00C853 0%, #009E3D 100%); padding: 35px; border-radius: 16px; text-align: center; margin-bottom: 30px;">
        <h2 style="color: #fff; margin-bottom: 16px; font-size: 22px;">مهمتنا</h2>
        <p style="color: rgba(255,255,255,0.95); line-height: 2; font-size: 15px; max-width: 700px; margin: 0 auto;">
          إنشاء نظام نقل مستدام وعادل وشفاف حيث يكسب السائقون ما يستحقونه ويدفع الركاب أسعاراً عادلة.
          نحن نؤمن بأن التكنولوجيا يجب أن تمكّن الناس، لا أن تستغلهم.
        </p>
      </div>

      <!-- Contact Info -->
      <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; text-align: center;">
        <h3 style="color: #333; margin-bottom: 20px; font-size: 18px;">تواصل معنا</h3>
        <div style="display: flex; justify-content: center; gap: 40px; flex-wrap: wrap;">
          <div style="text-align: center;">
            <div style="font-size: 24px; margin-bottom: 8px;">📧</div>
            <div style="color: #00C853; font-weight: 600;">البريد الإلكتروني</div>
            <div style="color: #555; font-size: 13px;">support@voltyks.com</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; margin-bottom: 8px;">🌐</div>
            <div style="color: #00C853; font-weight: 600;">الموقع</div>
            <div style="color: #555; font-size: 13px;">www.voltyks.com</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; margin-bottom: 8px;">📱</div>
            <div style="color: #00C853; font-weight: 600;">التطبيق</div>
            <div style="color: #555; font-size: 13px;">متاح على iOS & Android</div>
          </div>
        </div>
      </div>
    `;

    this.printService.printContentToPdf(content, {
      title: 'عن Voltyks',
      filename: 'about_voltyks',
      orientation: 'portrait'
    });
  }
}
