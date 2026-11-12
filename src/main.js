import './style.css';
import { Game } from './core/Game.js';

const game = new Game(document.querySelector('#game'), document.querySelector('#ui-root'));
game.init();

window.tidebound = game;
