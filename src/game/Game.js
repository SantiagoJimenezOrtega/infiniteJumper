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
        this.ctx = canvas.getContext("2d", { alpha: false }); // Performance: Disable alpha for main canvas
        this.width = 360; // Tighter logical width for better sizing on mobile
        this.height = 0; // Will be set in resize
        this.scale = 1;

        this.handleResize = () => {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            // Calculate scale to fit logical width
            this.scale = windowWidth / this.width;
            this.height = windowHeight / this.scale;

            this.canvas.width = windowWidth;
            this.canvas.height = windowHeight;

            // Reset context properties as they are lost on resize
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
        this.tutorialStep = 0;

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
        this.tutorialStep = localStorage.getItem("tutorialCompleted") ? 0 : 1;

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
        hint.innerText = "Manten presionado Izq/Der/Centro para saltar | Plataformas Rosas = Bullet Time ⚡";

        this.milestonesReached = [];
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
        document.getElementById("score").innerText = "Altura: 0m";
        document.getElementById("drops-score").innerText = "💧 0";
        document.getElementById("high-score").innerText = "Record: 0m";

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
            console.error("Error cargando partida", e);
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

            // Trigger animation
            el.style.animation = 'none';
            el.offsetHeight;
            el.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

            setTimeout(() => { el.style.display = "none"; }, 3000);

            for (let i = 0; i < 30; i++) {
                this.particles.spawn(this.player.x + Math.random() * this.player.width, this.player.y + Math.random() * this.player.height, "#ffd700", 15);
            }
        }
    }

    showComboPopup(count, x, y) {
        this.floatingTexts.push({
            text: `${count}x Combo!`,
            x: x + 15, y: y - 20,
            life: 1.0, vy: -2,
            color: "#ffcc00",
            scale: Math.min(1 + (count * 0.2), 2)
        });
    }

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    }

    loop(time) {
        try {
            const dt = (time - this.lastTime) / 16.66;
            this.lastTime = time;

            this.update(dt);
            this.draw();

            requestAnimationFrame(t => this.loop(t));
        } catch (e) {
            console.error("Game Loop Error:", e);
        }
    }

    update(dt) {
        this.background.update(dt);

        // Bullet time slows down update speed
        if (this.player && this.player.bulletTime) dt *= 0.5;

        if (!this.menu.active && this.gameStarted) {
            this.player.update(dt);
            this.particles.update();
            this.camera.update();
            this.world.update();

            // Update floating texts
            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const ft = this.floatingTexts[i];
                ft.y += ft.vy;
                ft.life -= 0.02;
                if (ft.life <= 0) this.floatingTexts.splice(i, 1);
            }

            // Height and scoring
            const height = Math.max(0, Math.floor((this.height - this.player.y - this.player.height) / 10));
            document.getElementById("score").innerText = `Altura: ${height}m`;

            // Collectibles collision
            this.world.collectibles.forEach(c => {
                if (c.active && this.checkCollision(this.player, c)) {
                    c.active = false;

                    if (c.type === "water") {
                        const combo = this.player.comboCount || 1;
                        const multiPower = this.player.activePowerUps.multi ? 2 : 1;
                        const amount = 1 * combo * multiPower;
                        this.collectedCount += amount;

                        let wallet = parseInt(localStorage.getItem("walletDrops") || "0");
                        wallet += amount;
                        localStorage.setItem("walletDrops", wallet);

                        this.soundManager.playCollect();
                        this.updateScoreUI();
                        if (combo > 1 || multiPower > 1) this.showComboPopup(`+${amount}💧`, c.x, c.y);
                    } else {
                        // Collision with Power-up
                        const p = Object.values(POWER_UPS).find(pu => pu.id === c.type);
                        if (p) {
                            this.player.applyPowerUp(p.id, p.duration);
                            this.soundManager.playMilestone(); // Powerup sound
                            this.showComboPopup(`${p.name}!`, c.x, c.y);

                            // First time popup
                            if (!this.seenPowerUps.includes(p.id)) {
                                this.showPowerUpPopup(p);
                                this.seenPowerUps.push(p.id);
                                localStorage.setItem("seenPowerUps", JSON.stringify(this.seenPowerUps));
                            }
                        }
                    }
                }
            });

            this.updatePowerUpTimers();

            // Death / Shield Rescue Logic
            if (this.player.y > this.camera.y + this.height + 100) {
                if (this.player.activePowerUps.shield) {
                    // RESCUE!
                    delete this.player.activePowerUps.shield;
                    this.player.vy = -22; // Big boost up
                    this.player.vx = 0;
                    this.soundManager.playBounce(); // Rescue sound
                    this.showComboPopup("¡ESCUDO EXPLOTADO!", this.player.x, this.player.y);

                    // Visual effects
                    for (let i = 0; i < 40; i++) {
                        this.particles.spawn(this.player.x + this.player.width / 2, this.player.y, "#33ccff", 15);
                    }
                } else {
                    // GAME OVER
                    this.resetGame();
                }
            }

            // Milestones
            for (const m of this.milestones) {
                if (height >= m && !this.milestonesReached.includes(m)) {
                    this.milestonesReached.push(m);
                    const reward = Math.floor(m * 0.2);
                    this.collectedCount += reward;
                    let wallet = parseInt(localStorage.getItem("walletDrops") || "0");
                    wallet += reward;
                    localStorage.setItem("walletDrops", wallet);
                    this.showMilestoneNotification(m, reward);
                    this.updateScoreUI();
                }
            }

            // Highscore
            if (height > this.highScore) {
                this.highScore = height;
                localStorage.setItem(`highScore_${this.difficulty}`, this.highScore);
                this.updateHighScoreUI();
            }

            // Victory condition
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
        const emoji = document.getElementById("pu-popup-emoji");
        const name = document.getElementById("pu-popup-name");
        const desc = document.getElementById("pu-popup-desc");
        const bclose = document.getElementById("pu-popup-close");

        emoji.innerText = p.emoji;
        name.innerText = p.name;
        desc.innerText = p.description;

        popup.style.display = "flex";
        this.menu.active = true; // Pause game logic
        const pauseStartTime = performance.now();

        const close = () => {
            const pauseDuration = performance.now() - pauseStartTime;

            // Offset all active powerups end times so they don't expire during pause
            for (const id in this.player.activePowerUps) {
                this.player.activePowerUps[id] += pauseDuration;
            }

            popup.style.display = "none";
            this.menu.active = false;
        };
        const handleClose = (e) => {
            e.preventDefault();
            e.stopPropagation();
            close();
        };
        bclose.onclick = handleClose;
        bclose.ontouchstart = handleClose;
    }

    updatePowerUpTimers() {
        const container = document.getElementById("active-powerups");
        if (!container) return;

        const now = performance.now();
        const active = this.player.activePowerUps;
        const CIRCUMFERENCE = 157.08; // 2 * PI * 25

        // Clear finished ones from UI
        const existing = Array.from(container.children);

        for (const [id, endTime] of Object.entries(active)) {
            const timeLeft = endTime - now;
            const p = Object.values(POWER_UPS).find(pu => pu.id === id);
            if (!p) continue;

            let item = document.getElementById(`timer-${id}`);
            if (!item) {
                item = document.createElement("div");
                item.id = `timer-${id}`;
                item.className = "pu-timer-item";
                item.innerHTML = `
                    <svg class="pu-timer-circle-svg">
                        <circle class="pu-timer-circle-bg" cx="27" cy="27" r="25"></circle>
                        <circle class="pu-timer-circle-fill" cx="27" cy="27" r="25" 
                            style="stroke-dasharray: ${CIRCUMFERENCE}; stroke-dashoffset: 0;"></circle>
                    </svg>
                    <div class="pu-timer-icon">${p.emoji}</div>
                `;
                container.appendChild(item);
            }

            const fill = item.querySelector(".pu-timer-circle-fill");
            const percent = Math.max(0, timeLeft / p.duration);
            const offset = CIRCUMFERENCE * (1 - percent);
            fill.style.strokeDashoffset = offset;
            fill.style.stroke = p.color;
        }

        // Clean up UI items for inactive powerups
        existing.forEach(item => {
            const id = item.id.replace("timer-", "");
            if (!active[id]) item.remove();
        });
    }

    draw() {
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);
        this.background.draw(this.ctx);

        this.ctx.save();
        this.ctx.translate(0, -this.camera.y);

        this.world.draw(this.ctx);
        this.player.draw(this.ctx);

        // Trajectory preview
        if (this.difficulty === "assisted" && this.input.isCharging && !this.player.jumpCancelled) {
            let dir = 0, dur = 0;
            if (this.input.keys.ArrowLeft.pressed) { dir = -1; dur = this.input.getCharge("ArrowLeft"); }
            else if (this.input.keys.ArrowRight.pressed) { dir = 1; dur = this.input.getCharge("ArrowRight"); }
            else if (this.input.keys.ArrowUp.pressed) { dir = 0; dur = this.input.getCharge("ArrowUp"); }
            this.trajectoryPreview.draw(this.ctx, this.player, dir, dur);
        }

        this.particles.draw(this.ctx);

        // Floating texts
        for (const ft of this.floatingTexts) {
            this.ctx.save();
            this.ctx.globalAlpha = ft.life;
            this.ctx.fillStyle = ft.color;
            this.ctx.font = `bold ${20 * ft.scale}px Arial`;
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.restore();
        }

        this.ctx.restore();

        // Bullet Time Effects
        if (this.player.bulletTime) {
            this.drawBulletTimeEffect();
        }

        if (this.gameStarted && Math.abs(this.world.wind) > 0.1) {
            this.drawWindIndicator();
        }

        this.ctx.restore(); // Restore scaling
    }

    drawWindIndicator() {
        const wind = this.world.wind;
        const x = this.width - 60;
        const y = 120;
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        this.ctx.font = "bold 16px monospace";
        this.ctx.textAlign = "center";
        const txt = wind > 0 ? "💨 >>>" : "<<< 💨";
        this.ctx.globalAlpha = 0.3 + Math.abs(wind) * 0.7;
        this.ctx.fillText(txt, 0, 0);
        this.ctx.restore();
    }

    drawBulletTimeEffect() {
        // Reduced effect for performance
    }
}
