import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="about-container">
      <div class="hero-section voltyks-card">
        <h1>Voltyks</h1>
        <p class="tagline">حرية التنقل. شفافية الأسعار. قوة الاختيار.</p>
      </div>

      <div class="content-grid">
        <div class="content-card voltyks-card">
          <span class="material-icons card-icon">electric_bolt</span>
          <h3>رؤيتنا</h3>
          <p>
            At its core, Voltyks stands for freedom, transparency, and empowerment.
            We challenge outdated systems and give both drivers and riders the power to choose—
            a true peer-to-peer marketplace where no one gets exploited.
          </p>
        </div>

        <div class="content-card voltyks-card">
          <span class="material-icons card-icon">group</span>
          <h3>المجتمع</h3>
          <p>
            Voltyks fosters a vibrant community where drivers and riders connect directly.
            We believe in fair compensation for drivers and affordable, transparent pricing for riders.
          </p>
        </div>

        <div class="content-card voltyks-card">
          <span class="material-icons card-icon">verified</span>
          <h3>الشفافية</h3>
          <p>
            Every transaction on Voltyks is transparent. We don't hide fees or manipulate prices.
            What you see is what you get—a platform built on trust and honesty.
          </p>
        </div>

        <div class="content-card voltyks-card">
          <span class="material-icons card-icon">security</span>
          <h3>الأمان</h3>
          <p>
            Safety is our top priority. With verified profiles, ratings, and secure payment systems,
            we ensure that every ride on Voltyks is safe and reliable.
          </p>
        </div>

        <div class="content-card voltyks-card">
          <span class="material-icons card-icon">trending_up</span>
          <h3>النمو</h3>
          <p>
            We're constantly evolving and improving our platform based on community feedback.
            Voltyks is more than a service—it's a movement towards better transportation.
          </p>
        </div>

        <div class="content-card voltyks-card">
          <span class="material-icons card-icon">public</span>
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
          <span class="material-icons stat-icon">people</span>
          <h4>1000+</h4>
          <p>مستخدم نشط</p>
        </div>
        <div class="stat-item voltyks-card">
          <span class="material-icons stat-icon">route</span>
          <h4>5000+</h4>
          <p>رحلة مكتملة</p>
        </div>
        <div class="stat-item voltyks-card">
          <span class="material-icons stat-icon">star</span>
          <h4>4.8/5</h4>
          <p>متوسط التقييم</p>
        </div>
        <div class="stat-item voltyks-card">
          <span class="material-icons stat-icon">location_city</span>
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

        h1 {
          font-size: 56px;
          font-weight: 700;
          color: white;
          margin-bottom: 16px;
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
export class AboutComponent {}
