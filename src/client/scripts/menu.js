export class Menu {
  constructor(listElement, onSelect, onHighlight) {
    this.listElement = listElement;
    this.games = [];
    this.selectedIndex = 0;
    this.onSelect = onSelect;
    this.onHighlight = onHighlight || (() => {});

    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  async loadGames() {
    try {
      const response = await fetch('/api/games');
      const data = await response.json();
      this.games = data.games;
      this.render();
      // Notify of initial selection
      this.notifyHighlight();
    } catch (error) {
      console.error('Failed to load games:', error);
    }
  }

  render() {
    this.listElement.innerHTML = '';

    if (this.games.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No games found';
      li.classList.add('no-games');
      this.listElement.appendChild(li);
      return;
    }

    this.games.forEach((game, index) => {
      const li = document.createElement('li');
      li.textContent = game.displayName || game.name;
      li.dataset.index = String(index);

      if (index === this.selectedIndex) {
        li.classList.add('selected');
      }

      li.addEventListener('click', () => {
        this.selectedIndex = index;
        this.updateSelection();
        this.selectCurrent();
      });

      li.addEventListener('mouseenter', () => {
        this.selectedIndex = index;
        this.updateSelection();
        this.notifyHighlight();
      });

      this.listElement.appendChild(li);
    });
  }

  updateSelection() {
    const items = this.listElement.querySelectorAll('li');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === this.selectedIndex);
    });
  }

  scrollToSelected() {
    const selectedItem = this.listElement.querySelector('li.selected');
    if (selectedItem) {
      selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  notifyHighlight() {
    if (this.games.length > 0 && this.games[this.selectedIndex]) {
      this.onHighlight(this.games[this.selectedIndex]);
    }
  }

  attach() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  detach() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown(e) {
    if (this.games.length === 0) return;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault();
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateSelection();
        this.notifyHighlight();
        this.scrollToSelected();
        break;

      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault();
        this.selectedIndex = Math.min(this.games.length - 1, this.selectedIndex + 1);
        this.updateSelection();
        this.notifyHighlight();
        this.scrollToSelected();
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        this.selectCurrent();
        break;
    }
  }

  selectCurrent() {
    if (this.games.length > 0 && this.games[this.selectedIndex]) {
      this.onSelect(this.games[this.selectedIndex]);
    }
  }

  reset() {
    this.selectedIndex = 0;
    this.updateSelection();
    this.notifyHighlight();
    this.listElement.scrollTop = 0;
  }
}
