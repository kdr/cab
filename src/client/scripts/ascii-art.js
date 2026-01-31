// ASCII art for "CAB" boot screen
const CAB_ASCII = `
 ██████╗ █████╗ ██████╗
██╔════╝██╔══██╗██╔══██╗
██║     ███████║██████╔╝
██║     ██╔══██║██╔══██╗
╚██████╗██║  ██║██████╔╝
 ╚═════╝╚═╝  ╚═╝╚═════╝
`.trim();

export function renderAsciiArt(element, text) {
  const art = text || CAB_ASCII;
  element.textContent = '';

  return new Promise((resolve) => {
    let index = 0;
    const chars = art.split('');

    const interval = setInterval(() => {
      if (index < chars.length) {
        element.textContent += chars[index];
        index++;
      } else {
        clearInterval(interval);
        resolve();
      }
    }, 5); // Fast typewriter effect
  });
}

export function setAsciiArt(element, text) {
  element.textContent = text || CAB_ASCII;
}

export { CAB_ASCII };
