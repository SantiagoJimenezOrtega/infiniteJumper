import { Game } from './game/Game.js';

const canvas = document.getElementById("gameCanvas");
const game = new Game(canvas);
game.start();

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registrado con éxito'))
            .catch(err => console.error('Error al registrar Service Worker', err));
    });
}
