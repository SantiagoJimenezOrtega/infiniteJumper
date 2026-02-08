import { BIOMES, WORLD_CONFIG, POWER_UPS } from './Constants.js';
import { Collectible } from './Collectible.js';

export class World {
    constructor(game) {
        this.game = game;
        this.platforms = [];
        this.collectibles = [];
        this.highestPoint = this.game.height - 50;

        this.wind = 0;
        this.windTimer = 0;

        this.nextCheckpointHeight = 200;
        this.lastPowerUpY = this.game.height;
        this.pbY = this.game.height;

        this.lastReachedCheckpoint = null;

        // Ground platform (Initial Checkpoint)
        const ground = {
            x: 0,
            y: this.game.height - 20,
            width: this.game.width,
            height: 35,
            type: "gold",
            isCheckpoint: true,
            id: 'start',
            active: true
        };
        this.platforms.push(ground);
        this.lastReachedCheckpoint = ground;

        this.generatePlatforms();
    }

    getNextCheckpointInterval(height) {
        if (height < 1000) return 300;
        if (height < 2000) return 500;
        if (height < 5000) return 1000;
        return 2000;
    }

    generatePlatforms() {
        let iterations = 0;
        const maxIterations = 100;

        while (this.highestPoint > this.game.camera.y - this.game.height * 2 && iterations < maxIterations) {
            iterations++;
            const currentHeightMeters = Math.max(0, Math.floor((this.game.height - this.highestPoint) / 10));
            const progression = Math.min(1, currentHeightMeters / 10000);

            if (currentHeightMeters >= this.nextCheckpointHeight) {
                const gap = 160;
                const y = this.highestPoint - gap;

                let pWidth;
                if (currentHeightMeters <= 200) {
                    pWidth = this.game.width;
                } else {
                    const widthProgression = Math.min(1, (currentHeightMeters - 200) / 4800);
                    pWidth = this.game.width - (widthProgression * (this.game.width - 120));
                }

                const x = (this.game.width - pWidth) / 2;
                const id = `cp_${Math.floor(y)}_${iterations}`;

                this.platforms.push({
                    x, y,
                    width: pWidth,
                    height: 35,
                    type: "gold",
                    isCheckpoint: true,
                    id: id,
                    active: true
                });

                const interval = this.getNextCheckpointInterval(currentHeightMeters);
                this.nextCheckpointHeight = Math.floor(currentHeightMeters / interval + 1) * interval;

                this.highestPoint = y;
                continue;
            }

            const gap = WORLD_CONFIG.SPAWN_GAP_MIN + Math.random() * (WORLD_CONFIG.SPAWN_GAP_MAX - WORLD_CONFIG.SPAWN_GAP_MIN + (progression * 60));
            const y = this.highestPoint - gap;

            const pWidth = Math.max(45, 110 - (progression * 60)) + Math.random() * 40;
            const x = Math.random() * (this.game.width - pWidth);

            const isPink = Math.random() < 0.12;

            this.platforms.push({
                x, y, width: pWidth, height: 20,
                type: isPink ? "pink" : "brown",
                active: true
            });

            // POWER-UPS SPAWNING
            const distSinceLastPU = Math.abs(this.lastPowerUpY - y) / 10;
            if (distSinceLastPU > 150) {
                const spawnChance = 0.15 + (progression * 0.1);
                if (Math.random() < spawnChance || distSinceLastPU > 400) {
                    const availableTypes = Object.keys(POWER_UPS);
                    const randomKey = availableTypes[Math.floor(Math.random() * availableTypes.length)];
                    const pu = POWER_UPS[randomKey];
                    this.collectibles.push(new Collectible(x + pWidth / 2 - 15, y - 50, pu.id));
                    this.lastPowerUpY = y;
                }
            } else if (Math.random() < 0.75) {
                this.collectibles.push(new Collectible(x + pWidth / 2 - 15, y - 40, "water"));
            }

            this.highestPoint = y;
        }
    }

    update() {
        let topY = this.game.height;
        for (const p of this.platforms) { if (p.y < topY) topY = p.y; }

        if (topY > this.game.camera.y - this.game.height * 2) {
            this.highestPoint = topY;
            this.generatePlatforms();
        }

        this.collectibles.forEach(c => c.update(1 / 60));

        this.platforms = this.platforms.filter(p => p.isCheckpoint || p.y < this.game.camera.y + this.game.height + 600);
        this.collectibles = this.collectibles.filter(c => c.active && c.y < this.game.camera.y + this.game.height + 200);
    }

    updateReachedCheckpoint(platform) {
        if (this.lastReachedCheckpoint && this.lastReachedCheckpoint.id === platform.id) return;

        this.lastReachedCheckpoint = platform;
        this.game.showManualRegenButton(true);

        const currentY = platform.y;
        if (!this.pbY || currentY < this.pbY - 100) {
            this.pbY = currentY;
            this.game.showComboPopup("CHECKPOINT!", platform.x, platform.y);
            this.game.soundManager.playMilestone();
        }
    }

    regenerate() {
        this.platforms = this.platforms.filter(p => p.isCheckpoint && p.y >= this.lastReachedCheckpoint.y);
        this.collectibles = [];
        this.highestPoint = this.lastReachedCheckpoint.y;

        const currentHeightMeters = Math.max(0, Math.floor((this.game.height - this.highestPoint) / 10));
        const interval = this.getNextCheckpointInterval(currentHeightMeters);
        this.nextCheckpointHeight = Math.floor(currentHeightMeters / interval + 1) * interval;

        this.generatePlatforms();

        for (let i = 0; i < 40; i++) {
            this.game.particles.spawn(this.lastReachedCheckpoint.x + this.lastReachedCheckpoint.width / 2, this.lastReachedCheckpoint.y, "#ffd700", 10);
        }
    }

    draw(ctx) {
        for (const p of this.platforms) {
            if (!p.active) continue;

            if (p.type === "gold") {
                ctx.fillStyle = "#ffd700";
            } else if (p.type === "pink") {
                ctx.fillStyle = "#ff00cc";
            } else {
                ctx.fillStyle = "#8b4513";
            }

            ctx.fillRect(p.x, p.y, p.width, p.height);

            if (p.type === "gold") {
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 3;
                ctx.strokeRect(p.x, p.y, p.width, p.height);
            }
        }
        this.collectibles.forEach(c => { if (c.active) c.draw(ctx); });
    }
}
