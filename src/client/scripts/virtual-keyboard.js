export class VirtualKeyboard {
  constructor(gameFrame) {
    this.gameFrame = gameFrame;
    this.container = document.getElementById('virtual-keyboard');
    this.swapped = localStorage.getItem('cabinet-vk-swapped') === 'true';
    this.heldKeys = new Set();
    this.handlerInjected = false;

    this.bindEvents();
    this.applySwapState();

    // Listen for iframe load to inject handler
    this.gameFrame.iframe.addEventListener('load', () => {
      this.injectKeyHandler();
    });
  }

  injectKeyHandler() {
    this.handlerInjected = false;
    try {
      const contentWindow = this.gameFrame.iframe.contentWindow;
      const contentDoc = contentWindow.document;

      // Check if we can access the iframe (same-origin)
      if (!contentDoc.body) return;

      // Inject a message listener that dispatches keyboard events
      const script = contentDoc.createElement('script');
      script.textContent = `
        (function() {
          if (window.__vkHandlerInstalled) return;
          window.__vkHandlerInstalled = true;

          window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'vk-key') {
              var event = new KeyboardEvent(e.data.eventType, {
                key: e.data.key,
                code: e.data.code,
                keyCode: e.data.keyCode,
                which: e.data.keyCode,
                bubbles: true,
                cancelable: true
              });
              document.dispatchEvent(event);
            }
          });
        })();
      `;
      contentDoc.body.appendChild(script);
      this.handlerInjected = true;
    } catch (e) {
      // Cross-origin - can't inject, but postMessage will still work
      // if the game includes the vk-key listener
    }
  }

  bindEvents() {
    // Bind key buttons
    this.container.querySelectorAll('.vk-key').forEach((btn) => {
      const key = btn.dataset.key;

      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.pressKey(key);
        btn.classList.add('active');
        this.refocusGame();
      });

      btn.addEventListener('pointerup', (e) => {
        e.preventDefault();
        this.releaseKey(key);
        btn.classList.remove('active');
      });

      btn.addEventListener('pointerleave', (e) => {
        if (this.heldKeys.has(key)) {
          this.releaseKey(key);
          btn.classList.remove('active');
        }
      });

      btn.addEventListener('pointercancel', (e) => {
        if (this.heldKeys.has(key)) {
          this.releaseKey(key);
          btn.classList.remove('active');
        }
      });
    });

    // Bind swap button
    const swapBtn = this.container.querySelector('.vk-swap');
    if (swapBtn) {
      swapBtn.addEventListener('click', () => this.toggleSwap());
    }
  }

  pressKey(key) {
    this.heldKeys.add(key);
    this.dispatchKeyEvent('keydown', key);
  }

  releaseKey(key) {
    this.heldKeys.delete(key);
    this.dispatchKeyEvent('keyup', key);
  }

  dispatchKeyEvent(type, key) {
    const keyMap = {
      w: { key: 'w', code: 'KeyW', keyCode: 87 },
      a: { key: 'a', code: 'KeyA', keyCode: 65 },
      s: { key: 's', code: 'KeyS', keyCode: 83 },
      d: { key: 'd', code: 'KeyD', keyCode: 68 },
      q: { key: 'q', code: 'KeyQ', keyCode: 81 },
      e: { key: 'e', code: 'KeyE', keyCode: 69 },
      ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
      ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
      ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
      ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
      ' ': { key: ' ', code: 'Space', keyCode: 32 },
      Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
    };

    const keyInfo = keyMap[key];
    if (!keyInfo) return;

    // Dispatch to main document (for menu, boot screen, etc.)
    const mainEvent = new KeyboardEvent(type, {
      key: keyInfo.key,
      code: keyInfo.code,
      keyCode: keyInfo.keyCode,
      which: keyInfo.keyCode,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(mainEvent);

    // Also dispatch to iframe via postMessage (for games)
    const iframe = this.gameFrame.iframe;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: 'vk-key',
          eventType: type,
          key: keyInfo.key,
          code: keyInfo.code,
          keyCode: keyInfo.keyCode,
        },
        '*'
      );
    }
  }

  refocusGame() {
    // Refocus the game iframe so physical keyboard continues to work
    const iframe = this.gameFrame.iframe;
    if (iframe) {
      iframe.focus();
      try {
        iframe.contentWindow?.focus();
      } catch (e) {
        // Cross-origin, can't focus content
      }
    }
  }

  toggleSwap() {
    this.swapped = !this.swapped;
    localStorage.setItem('cabinet-vk-swapped', this.swapped);
    this.applySwapState();
  }

  applySwapState() {
    const keyArea = this.container.querySelector('.vk-key-area');
    if (keyArea) {
      keyArea.classList.toggle('swapped', this.swapped);
    }
  }

  show() {
    this.container.classList.remove('hidden');
    // Try to inject handler if not already done
    if (!this.handlerInjected) {
      this.injectKeyHandler();
    }
  }

  hide() {
    // Release all held keys before hiding
    this.heldKeys.forEach((key) => {
      this.dispatchKeyEvent('keyup', key);
    });
    this.heldKeys.clear();

    // Remove active state from all buttons
    this.container.querySelectorAll('.vk-key.active').forEach((btn) => {
      btn.classList.remove('active');
    });

    this.container.classList.add('hidden');
  }
}
