// Base class for optional features (views, editing, export...). The app only knows this interface,
// so a plugin can be added or removed from main.js without touching anything else.
export class Plugin {
  static id = 'plugin';
  constructor(app) { this.app = app; }
  install() {}
  uninstall() {}
}
