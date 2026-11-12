export class PWAController {
  constructor(menu, root) {
    this.menu = menu;
    this.root = root;
    this.installPrompt = null;
    this.registration = null;
    this.reloading = false;
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPrompt = event;
      this.menu.configureInstall('INSTALL TIDEBOUND', () => this.install());
    });
    window.addEventListener('appinstalled', () => {
      this.installPrompt = null;
      this.menu.hideInstall();
    });
    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isiOS && !navigator.standalone) this.menu.configureInstall('HOW TO INSTALL', () => this.showIOSHelp());
  }

  async register() {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
    try {
      this.registration = await navigator.serviceWorker.register('./sw.js');
      if (this.registration.waiting) this.showUpdate();
      this.registration.addEventListener('updatefound', () => {
        const worker = this.registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) this.showUpdate();
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.reloading) return;
        this.reloading = true;
        location.reload();
      });
    } catch (error) { console.warn('TIDEBOUND offline mode unavailable:', error); }
  }

  async install() {
    if (!this.installPrompt) return;
    this.installPrompt.prompt();
    await this.installPrompt.userChoice;
    this.installPrompt = null;
    this.menu.hideInstall();
  }

  showIOSHelp() {
    const message = document.createElement('div');
    message.className = 'install-help panel-cut';
    const title = document.createElement('b'); title.textContent = 'INSTALL TIDEBOUND';
    const copy = document.createElement('p'); copy.textContent = 'In Safari, tap Share, then choose “Add to Home Screen”. Launch the new icon and rotate to landscape.';
    const close = document.createElement('button'); close.className = 'ghost-button'; close.textContent = 'GOT IT'; close.onclick = () => message.remove();
    message.append(title, copy, close); this.root.append(message);
  }

  showUpdate() {
    if (this.root.querySelector('[data-update-app]')) return;
    const toast = document.createElement('div'); toast.className = 'update-toast'; toast.dataset.updateApp = '';
    const copy = document.createElement('span'); copy.textContent = 'A NEW TIDEBOUND BUILD IS READY';
    const apply = document.createElement('button'); apply.className = 'primary-button'; apply.textContent = 'UPDATE';
    apply.onclick = () => this.registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    toast.append(copy, apply); this.root.append(toast);
  }
}
