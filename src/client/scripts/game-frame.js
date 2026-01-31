export class GameFrame {
  constructor(iframe) {
    this.iframe = iframe;
    this.currentUrl = null;
  }

  load(url) {
    this.currentUrl = url;
    this.iframe.src = url;
  }

  unload() {
    this.iframe.src = 'about:blank';
    this.currentUrl = null;
  }

  reload() {
    if (this.currentUrl) {
      this.iframe.src = this.currentUrl;
    }
  }

  focus() {
    this.iframe.focus();
    // Also try to focus the iframe content
    try {
      this.iframe.contentWindow?.focus();
    } catch {
      // Cross-origin, can't focus content
    }
  }

  getUrl() {
    return this.currentUrl;
  }
}
