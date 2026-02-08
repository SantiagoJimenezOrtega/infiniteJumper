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
        this.height = 0;
        this.scale = 1;

        this.handleResize = () => {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            this.scale = windowWidth / this.width;
            this.height = windowHeight / this.scale;
            this.canvas.width = windowWidth;
            this.canvas.height = windowHeight;
            this.ctx.imageSmoothingEnabled = false;
        };

        this.handleResize();

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
        this.milestonesReached = [];
        this.milestones = [100, 250, 500, 1000, 5000, 10000];

        this.seenPowerUps = JSON.parse(localStorage.getItem("seenPowerUps") || "[]");
        this.tutorialStep = 0;
        this.gameWon = false;
        this.floatingTexts = [];

        this.setupEventListeners();
        window.addEventListener("resize", this.handleResize);
    }

    setupEventListeners() {
        const backBtn = document.getElementById("back-button");
        if (backBtn) {
            const newBack = backBtn.cloneNode(true);
            backBtn.parentNode.replaceChild(newBack, backBtn);
            const goBack = (e) => { e.preventDefault(); e.stopPropagation(); this.resetGame(); };
            newBack.addEventListener("click", goBack);
            newBack.addEventListener("touchstart", goBack, { passive: false });
        }

        const muteBtn = document.getElementById("mute-button");
        if (muteBtn) {
            const toggle = (e) => {
                e.preventDefault(); e.stopPropagation();
                const isMuted = this.soundManager.toggleMute();
                muteBtn.innerText = isMuted ? "🔇" : "🔊";
            };
            muteBtn.addEventListener("click", toggle);
            muteBtn.addEventListener("touchstart", toggle, { passive: false });
        }
    }

    continueGame(diff) {
        this.difficulty = diff;
        this.gameStarted = true;
        const savedHigh = localStorage.getItem(`highScore_${this.difficulty}`);
        this.highScore = savedHigh ? parseInt(savedHigh) : 0;
        this.updateHighScoreUI();
        if (!this.loadGame()) {
            this.startNewGame(diff);
            return;
        }
        this.setupGameUI();
    }

    startNewGame(diff) {
        this.difficulty = diff;
        this.gameStarted = true;
        localStorage.removeItem(`gameState_${this.difficulty}`);
        const savedHigh = localStorage.getItem(`highScore_${this.difficulty}`);
        this.highScore = savedHigh ? parseInt(savedHigh) : 0;
        this.collectedCount = 0;
        this.updateHighScoreUI();
        this.updateScoreUI();
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
        hint.style.display = "block";
        hint.innerText = "Manten presionado Izq/Der/Centro para saltar";
        if (this.saveInterval) clearInterval(this.saveInterval);
        this.saveInterval = setInterval(() => this.saveGame(), 2000);
    }

    resetGame() {
        if (this.gameStarted) this.saveGame();
        this.gameStarted = false;
        if (this.saveInterval) clearInterval(this.saveInterval);
        document.getElementById("back-button").style.display = "none";
        document.getElementById("score-container").style.display = "none";
        document.getElementById("controls-hint").style.display = "none";
        document.getElementById("milestone-notification").style.display = "none";
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
            timestamp: Date.now()
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
            this.updateScoreUI();
            this.player = new Player(this);
            this.player.x = state.player.x;
            this.player.y = state.player.y;
            this.player.vx = state.player.vx;
            this.player.vy = state.player.vy;
            this.camera = new Camera(this);
            this.camera.y = state.camera.y;
            return true;
        } catch (e) {
            return false;
        }
    }

    updateHighScoreUI() {
        const el = document.getElementById("high-score");
        if (el) el.innerText = `Record: ${this.highScore}m`;
    }

    updateScoreUI() {
        const el = document.getElementById("drops-score");
        if (el) el.innerText = `💧 ${this.collectedCount}`;
    }

    showMilestoneNotification(m, reward) {
        const el = document.getElementById("milestone-notification");
        if (el) {
            el.innerText = `🏆 ¡${m}m Alcanzados!\n+${reward} 💧`;
            el.style.display = "block";
            this.soundManager.playMilestone();
            setTimeout(() => { el.style.display = "none"; }, 3000);
        }
    }

    showComboPopup(count, x, y) {
        this.floatingTexts.push({
            text: isNaN(count) ? count : `${count}x Combo!`,
            x: x + 15, y: y - 20,
            life: 1.0, vy: -2,
            color: "#ffcc00",
            scale: isNaN(count) ? 1.0 : Math.min(1 + (count * 0.2), 2)
        });
    }

    triggerRegenerationSequence() {
        // UNIFIED REGENERATION FLOW
        this.world.regenerate();
        this.modalMessage("¡MENSAJE DEL CIELO!\n\nParece que has regresado a un checkpoint. Hemos reconstruido el camino hacia arriba para que tengas una oportunidad fresca.");
        this.soundManager.playBounce();
    }

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    }

    loop(time) {
        const dt = (time - this.lastTime) / 16.66;
        this.lastTime = time;
        this.update(dt);
        this.draw();
        requestAnimationFrame(t => this.loop(t));
    }

    update(dt) {
        if (!this.gameStarted) return;
        this.background.update(dt);
        if (this.player && this.player.bulletTime) dt *= 0.5;

        if (!this.menu.active) {
            this.player.update(dt);
            this.particles.update();
            this.camera.update();
            this.world.update();

            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const ft = this.floatingTexts[i];
                ft.y += ft.vy;
                ft.life -= 0.02;
                if (ft.life <= 0) this.floatingTexts.splice(i, 1);
            }

            const height = Math.max(0, Math.floor((this.height - this.player.y - this.player.height) / 10));
            document.getElementById("score").innerText = `Altura: ${height}m`;

            this.world.collectibles.forEach(c => {
                if (c.active && this.checkCollision(this.player, c)) {
                    c.active = false;
                    if (c.type === "water") {
                        const combo = this.player.comboCount || 1;
                        const multiPower = this.player.activePowerUps.multi ? 2 : 1;
                        const amount = 1 * combo * multiPower;
                        this.collectedCount += amount;
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
                                localStorage.setItem("seenPowerUps", JSON.stringify(this.seenPowerUps));
                            }
                        }
                    }
                }
            });

            // FALLING INTO THE VOID
            if (this.player.y > this.camera.y + this.height + 100) {
                const cp = this.world.lastReachedCheckpoint;
                this.player.x = cp.x + (cp.width / 2) - (this.player.width / 2);
                this.player.y = cp.y - this.player.height - 20;
                this.player.vx = 0;
                this.player.vy = 0;
                this.player.grounded = true;
                this.camera.y = this.player.y - this.height / 2;
                if (this.camera.y > 0) this.camera.y = 0;

                if (cp.id !== 'start') {
                    this.triggerRegenerationSequence();
                } else {
                    this.world.generatePlatforms();
                }
            }

            if (height > this.highScore) {
                this.highScore = height;
                localStorage.setItem(`highScore_${this.difficulty}`, this.highScore);
                this.updateHighScoreUI();
            }

            if (height >= 10000 && !this.gameWon) {
                this.gameWon = true;
                this.menu.showVictory();
            }
        }
        this.input.update();
    }

    checkCollision(a, b) {
        return a.x < b.x + b.width && a.x + a.width > b.x &&
            a.y < b.y + b.height && a.y + a.height > b.y;
    }

    showPowerUpPopup(p) {
        const popup = document.getElementById("powerup-popup");
        document.getElementById("pu-popup-emoji").innerText = p.emoji;
        document.getElementById("pu-popup-name").innerText = p.name;
        document.getElementById("pu-popup-desc").innerText = p.description;
        popup.style.display = "flex";
        this.menu.active = true;
        document.getElementById("pu-popup-close").onclick = () => {
            popup.style.display = "none";
            this.menu.active = false;
        };
    }

    modalMessage(msg) {
        const popup = document.getElementById("powerup-popup");
        document.getElementById("pu-popup-emoji").innerText = "🏆";
        document.getElementById("pu-popup-name").innerText = "MENSAJE DEL CIELO";
        document.getElementById("pu-popup-desc").innerText = msg;
        popup.style.display = "flex";
        this.menu.active = true;
        document.getElementById("pu-popup-close").onclick = () => {
            popup.style.display = "none";
            this.menu.active = false;
        };
    }

    draw() {
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);
        this.background.draw(this.ctx);
        this.ctx.save();
        this.ctx.translate(0, -this.camera.y);
        this.world.draw(this.ctx);
        this.player.draw(this.ctx);
        this.particles.draw(this.ctx);
        for (const ft of this.floatingTexts) {
            this.ctx.save();
            this.ctx.globalAlpha = ft.life;
            this.ctx.fillStyle = ft.color;
            this.ctx.font = `bold 20px Arial`;
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.restore();
        }
        this.ctx.restore();
        this.ctx.restore();
    }
}
