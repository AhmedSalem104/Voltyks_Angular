import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

function dismissSplash() {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  splash.classList.add('is-hidden');
  // Remove after the fade-out completes so it never blocks pointer events.
  window.setTimeout(() => splash.remove(), 350);
}

bootstrapApplication(App, appConfig)
  .then(() => dismissSplash())
  .catch(err => {
    console.error(err);
    dismissSplash();
  });
