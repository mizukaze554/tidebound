import './style.css';
import { Game } from './core/Game.js';
import { PWAController } from './core/PWAController.js';

const game = new Game(document.querySelector('#game'), document.querySelector('#ui-root'));
game.init();

const pwa = new PWAController(game.menu, document.querySelector('#ui-root'));
window.addEventListener('load', () => pwa.register());
