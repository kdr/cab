export class GameFrame {
  constructor(iframe) {
    this.iframe = iframe;
    this.currentGamePort = null;
  }

  load(port) {
    this.currentGamePort = port;
    this.iframe.src = `http://localhost:${port}`;
  }

  unload() {
    this.iframe.src = 'about:blank';
    this.currentGamePort = null;
  }

  reload() {
    if (this.currentGamePort) {
      this.iframe.src = `http://localhost:${this.currentGamePort}`;
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

  getPort() {
    return this.currentGamePort;
  }
}
