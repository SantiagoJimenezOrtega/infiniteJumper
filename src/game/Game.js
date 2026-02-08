import { Input } from './Input.js';
import { Menu } from './Menu.js';
import { Background } from './Background.js';
import { Camera } from './Camera.js';
import { Particles } from './Particles.js';
import { TrajectoryPreview } from './TrajectoryPreview.js';
import { SoundManager } from './SoundManager.js';
import { World } from './World.js';
import { Player } from './Player.js';
import { Collectible } from './Collectible.js';
import { POWER_UPS } from './Constants.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d", { alpha: false });
        this.width = 360;

        this.scale = window.innerWidth / this.width;
        this.height = window.innerHeight / this.scale;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.handleResize = () => {
            this.scale = window.innerWidth / this.width;
            this.height = window.innerHeight / this.scale;
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.ctx.imageSmoothingEnabled = false;
        };

        this.input = new Input();
        this.menu = new Menu(this);
        this.background = new Background(this);
        this.camera = new Camera(this);
        this.particles = new Particles(this);
        this.trajectoryPreview = new TrajectoryPreview(this);
        this.soundManager = new SoundManager();
        this.world = new World(this);
        this.player = new Player(this);

        this.difficulty = "extreme";
        this.gameStarted = false;
        this.lastTime = 0;
        this.highScore = 0;
        this.collectedCount = 0;

        this.seenPowerUps = [];
        this.hasShownFirstRegenPrompt = false;
        this.gameWon = false;
        this.floatingTexts = [];
        this.lastActivePowerUpCount = -1;

        this.setupEventListeners();
        window.addEventListener("resize", this.handleResize);
    }

    setupEventListeners() {
        const bind = (id, action) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.onclick = (e) => { e.preventDefault(); action(e); };
            el.ontouchstart = (e) => { e.preventDefault(); action(e); };
        };

        bind("back-button", () => this.resetGame());
        bind("mute-button", () => {
            const isMuted = this.soundManager.toggleMute();
            const btn = document.getElementById("mute-button");
            if (btn) btn.innerText = isMuted ? "🔇" : "🔊";
        });

        bind("regen-yes", () => {
            this.triggerRegenerationSequence();
            this.closeRegenModal();
        });

        bind("regen-no", () => {
            this.closeRegenModal();
            this.showManualRegenButton(true);
        });

        bind("btn-manual-regen", () => this.triggerRegenerationSequence());

        window.addEventListener("keydown", (e) => {
            if (e.key.toLowerCase() === 'r' && this.gameStarted && !this.menu.active) {
                if (this.player.grounded && this.world.lastReachedCheckpoint) {
                    this.triggerRegenerationSequence();
                }
            }
        });
    }

    closeRegenModal() {
        const regenPopup = document.getElementById("regen-popup");
        if (regenPopup) regenPopup.style.display = "none";
        this.menu.active = false;
    }

    showManualRegenButton(show) {
        const btn = document.getElementById("btn-manual-regen");
        if (btn) btn.style.display = show ? "block" : "none";
    }

    showRegenPopup() {
        if (this.menu.active || this.hasShownFirstRegenPrompt) return;
        const popup = document.getElementById("regen-popup");
        if (popup) {
            popup.style.display = "flex";
            this.menu.active = true;
            this.hasShownFirstRegenPrompt = true;
        }
    }

    continueGame(diff) {
        this.difficulty = diff;
        this.gameStarted = true;
        this.loadGame();
        this.setupGameUI();
    }

    startNewGame(diff) {
        this.difficulty = diff;
        this.gameStarted = true;
        this.collectedCount = 0;
        this.hasShownFirstRegenPrompt = false;
        localStorage.removeItem(`gameState_${this.difficulty}`);
        this.world = new World(this);
        this.player = new Player(this);
        this.camera = new Camera(this);
        this.setupGameUI();
    }

    setupGameUI() {
        this.menu.hideAll();
        document.getElementById("back-button").style.display = "block";
        document.getElementById("score-container").style.display = "flex";
        const hint = document.getElementById("controls-hint");
        if (hint) {
            hint.style.display = "block";
            hint.innerText = "Manten presionado Izq/Der/Centro para saltar";
        }
        if (this.saveInterval) clearInterval(this.saveInterval);
        this.saveInterval = setInterval(() => this.saveGame(), 2000);
    }

    resetGame() {
        if (this.gameStarted) this.saveGame();
        this.gameStarted = false;
        if (this.saveInterval) clearInterval(this.saveInterval);
        document.getElementById("back-button").style.display = "none";
        document.getElementById("score-container").style.display = "none";
        document.getElementById("btn-manual-regen").style.display = "none";
        this.closeRegenModal();
        this.menu.showScreen("main");
    }

    saveGame() {
        if (!this.gameStarted || this.menu.active) return;
        const state = {
            player: { x: this.player.x, y: this.player.y, vx: this.player.vx, vy: this.player.vy },
            camera: { y: this.camera.y },
            world: {
                highestPoint: this.world.highestPoint,
                platforms: this.world.platforms.map(p => ({ ...p })),
                collectibles: this.world.collectibles.map(c => ({ x: c.x, y: c.y, active: c.active, type: c.type }))
            },
            collectedCount: this.collectedCount,
            difficulty: this.difficulty
        };
        localStorage.setItem(`gameState_${this.difficulty}`, JSON.stringify(state));
    }

    loadGame() {
        const data = localStorage.getItem(`gameState_${this.difficulty}`);
        if (!data) return false;
        try {
            const state = JSON.parse(data);
            this.world = new World(this);
            this.world.highestPoint = state.world.highestPoint;
            this.world.platforms = state.world.platforms;
            this.world.collectibles = state.world.collectibles.map(c => {
                const col = new Collectible(c.x, c.y, c.type || "water");
                col.active = c.active;
                return col;
            });
            this.collectedCount = state.collectedCount || 0;
            this.player = new Player(this);
            this.player.x = state.player.x; this.player.y = state.player.y;
            this.player.vx = state.player.vx; this.player.vy = state.player.vy;
            this.camera = new Camera(this);
            this.camera.y = state.camera.y;
            return true;
        } catch (e) { return false; }
    }

    updateHighScoreUI() {
        const savedHigh = localStorage.getItem(`highScore_${this.difficulty}`);
        const highScore = savedHigh ? parseInt(savedHigh) : 0;
        const el = document.getElementById("high-score");
        if (el) el.innerText = `Record: ${highScore}m`;
    }

    updateScoreUI() {
        const el = document.getElementById("drops-score");
        if (el) el.innerText = `💧 ${this.collectedCount}`;
    }

    showComboPopup(count, x, y) {
        this.floatingTexts.push({
            text: isNaN(count) ? count : `${count}x Combo!`,
            x: x + 15, y: y - 20,
            life: 1.0, vy: -2, color: "#ffcc00"
        });
    }

    triggerRegenerationSequence() {
        this.world.regenerate();
        this.showManualRegenButton(false);
        this.modalMessage("¡MUNDO RECONSTRUIDO!\n\nEl camino hacia arriba ha sido renovado.");
        this.soundManager.playBounce();
        for (let i = 0; i < 50; i++) {
            this.particles.spawn(this.player.x + this.player.width / 2, this.player.y, "#ffd700", 8);
        }
    }

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    }

    loop(time) {
        const dt = Math.min(2, Math.max(0.1, (time - this.lastTime) / 16.66));
        this.lastTime = time;
        this.update(dt || 1);
        this.draw();
        requestAnimationFrame(t => this.loop(t));
    }

    update(dt) {
        if (!this.gameStarted) return;
        this.background.update(dt);
        let actualDt = (this.player && this.player.bulletTime) ? dt * 0.5 : dt;

        if (!this.menu.active) {
            this.player.update(actualDt);
            this.particles.update();
            this.camera.update();
            this.world.update();

            if (!this.player.grounded) this.showManualRegenButton(false);

            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const ft = this.floatingTexts[i];
                ft.y += ft.vy * dt; ft.life -= 0.02 * dt;
                if (ft.life <= 0) this.floatingTexts.splice(i, 1);
            }

            const height = Math.max(0, Math.floor((this.height - this.player.y - this.player.height) / 10));
            document.getElementById("score").innerText = `Altura: ${height}m`;

            this.world.collectibles.forEach(c => {
                if (c.active && this.checkCollision(this.player, c)) {
                    c.active = false;
                    if (c.type === "water") {
                        const amount = (this.player.comboCount || 1) * (this.player.activePowerUps.multi ? 2 : 1);
                        this.collectedCount += Math.max(1, amount);
                        this.soundManager.playCollect();
                        this.updateScoreUI();
                    } else {
                        const p = Object.values(POWER_UPS).find(pu => pu.id === c.type);
                        if (p) {
                            this.player.applyPowerUp(p.id, p.duration);
                            this.soundManager.playMilestone();
                            if (!this.seenPowerUps.includes(p.id)) {
                                this.showPowerUpPopup(p);
                                this.seenPowerUps.push(p.id);
                            }
                        }
                    }
                }
            });

            if (this.player.y > this.camera.y + this.height + 150) {
                const cp = this.world.lastReachedCheckpoint;
                this.player.x = cp.x + (cp.width / 2) - (this.player.width / 2);
                this.player.y = cp.y - this.player.height - 20;
                this.player.vx = 0; this.player.vy = 0;
                this.player.grounded = true;
                this.camera.y = this.player.y - this.height / 2;
                if (this.camera.y > 0) this.camera.y = 0;
                this.showRegenPopup();
            }

            const currentHigh = parseInt(localStorage.getItem(`highScore_${this.difficulty}`) || "0");
            if (height > currentHigh) {
                localStorage.setItem(`highScore_${this.difficulty}`, height);
                this.updateHighScoreUI();
            }

            if (height >= 10000 && !this.gameWon) {
                this.gameWon = true; this.menu.showVictory();
            }
        }

        this.updatePowerUpUI();
        this.input.update();
    }

    updatePowerUpUI() {
        const container = document.getElementById("active-powerups");
        if (!container) return;

        const activeIds = Object.keys(this.player.activePowerUps);

        // Only rebuild DOM if the list of powerups has changed size
        if (activeIds.length !== this.lastActivePowerUpCount) {
            this.lastActivePowerUpCount = activeIds.length;
            if (activeIds.length === 0) {
                container.style.display = "none";
                container.innerHTML = "";
                return;
            }

            let html = "";
            activeIds.forEach(id => {
                const p = Object.values(POWER_UPS).find(pu => pu.id === id);
                if (!p) return;
                html += `
                    <div id="pu-timer-${id}" class="pu-timer-item" style="border: 3px solid ${p.color};">
                        <svg class="pu-timer-circle-svg" viewBox="0 0 66 66">
                            <circle class="pu-timer-circle-bg" cx="33" cy="33" r="28"></circle>
                            <circle id="pu-fill-${id}" class="pu-timer-circle-fill" cx="33" cy="33" r="28" 
                                    style="stroke-dasharray: 176; stroke-dashoffset: 0; stroke: ${p.color};"></circle>
                        </svg>
                        <span class="pu-timer-icon">${p.emoji}</span>
                    </div>
                `;
            });
            container.innerHTML = html;
            container.style.display = "flex";
        }

        // Update the offsets of existing circles WITHOUT clearing innerHTML
        activeIds.forEach(id => {
            const timeLeft = this.player.activePowerUps[id];
            const p = Object.values(POWER_UPS).find(pu => pu.id === id);
            const fillEl = document.getElementById(`pu-fill-${id}`);
            if (fillEl && p) {
                const ratio = Math.max(0, Math.min(1, timeLeft / p.duration));
                const circumference = 176; // 2 * PI * 28 approx
                const offset = circumference * (1 - ratio);
                fillEl.style.strokeDashoffset = offset;
            }
        });
    }

    checkCollision(a, b) {
        return a.x < b.x + b.width && a.x + a.width > b.x &&
            a.y < b.y + b.height && a.y + a.height > b.y;
    }

    showPowerUpPopup(p) { this.modalTemplate(p.emoji, p.name, p.description); }
    modalMessage(msg) { this.modalTemplate("🏆", "Aviso", msg); }

    modalTemplate(emoji, title, desc) {
        const popup = document.getElementById("powerup-popup");
        if (!popup) return;
        document.getElementById("pu-popup-emoji").innerText = emoji;
        document.getElementById("pu-popup-name").innerText = title;
        document.getElementById("pu-popup-desc").innerText = desc;
        popup.style.display = "flex";
        this.menu.active = true;

        const closeBtn = document.getElementById("pu-popup-close");
        const close = (e) => {
            if (e) e.preventDefault();
            popup.style.display = "none";
            this.menu.active = false;
        };
        closeBtn.onclick = close;
        closeBtn.ontouchstart = close;
    }

    draw() {
        this.ctx.save(); this.ctx.scale(this.scale, this.scale);
        this.background.draw(this.ctx);
        this.ctx.save(); this.ctx.translate(0, -this.camera.y);
        this.world.draw(this.ctx); this.player.draw(this.ctx); this.particles.draw(this.ctx);
        if (this.difficulty === "assisted" && this.input.isCharging && !this.player.jumpCancelled) {
            let dir = 0, dur = 0;
            if (this.input.keys.ArrowLeft.pressed) { dir = -1; dur = this.input.getCharge("ArrowLeft"); }
            else if (this.input.keys.ArrowRight.pressed) { dir = 1; dur = this.input.getCharge("ArrowRight"); }
            else if (this.input.keys.ArrowUp.pressed) { dir = 0; dur = this.input.getCharge("ArrowUp"); }
            this.trajectoryPreview.draw(this.ctx, this.player, dir, dur);
        }
        for (const ft of this.floatingTexts) {
            this.ctx.save(); this.ctx.globalAlpha = ft.life; this.ctx.fillStyle = ft.color;
            this.ctx.font = `bold 18px Arial`; this.ctx.fillText(ft.text, ft.x, ft.y); this.ctx.restore();
        }
        this.ctx.restore(); this.ctx.restore();
    }
}
