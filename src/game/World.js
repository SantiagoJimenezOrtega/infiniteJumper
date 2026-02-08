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

        // Always track where we can respawn
        this.lastReachedCheckpoint = {
            x: 0,
            y: this.game.height - 20,
            width: this.game.width,
            id: 'start'
        };

        // Create starting floor
        this.platforms.push({
            x: 0,
            y: this.game.height - 20,
            width: this.game.width,
            height: 30,
            type: "gold",
            isCheckpoint: true,
            id: 'start',
            active: true
        });

        this.generatePlatforms();
    }

    getNextCheckpointInterval(height) {
        if (height < 1000) return 200;
        if (height < 2000) return 250;
        if (height < 3000) return 500;
        if (height < 5000) return 1000;
        if (height < 10000) return 2500;
        return 5000;
    }

    generatePlatforms() {
        while (this.highestPoint > this.game.camera.y - this.game.height * 2) {
            const currentHeightMeters = Math.max(0, Math.floor((this.game.height - this.highestPoint) / 10));
            const progression = Math.min(1, currentHeightMeters / 10000);

            if (currentHeightMeters >= this.nextCheckpointHeight) {
                const gap = 150;
                const y = this.highestPoint - gap;
                let pWidth = (currentHeightMeters <= 200) ? this.game.width : Math.max(120, this.game.width * (1 - progression));
                const x = (this.game.width - pWidth) / 2;

                this.platforms.push({
                    x, y, width: pWidth, height: 35,
                    type: "gold", isCheckpoint: true,
                    id: 'cp_' + Math.floor(y), active: true
                });

                const interval = this.getNextCheckpointInterval(currentHeightMeters);
                this.nextCheckpointHeight = (Math.floor(currentHeightMeters / interval) + 1) * interval;
                this.highestPoint = y;
                continue;
            }

            const gap = WORLD_CONFIG.SPAWN_GAP_MIN + Math.random() * (WORLD_CONFIG.SPAWN_GAP_MAX - WORLD_CONFIG.SPAWN_GAP_MIN);
            const y = this.highestPoint - gap;
            const pWidth = 60 + Math.random() * 60;
            const x = Math.random() * (this.game.width - pWidth);

            this.platforms.push({
                x, y, width: pWidth, height: 20,
                type: Math.random() < 0.1 ? "pink" : "brown",
                active: true
            });

            if (Math.random() < 0.6) {
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
        this.collectibles = this.collectibles.filter(c => c.active && c.y < this.game.camera.y + this.game.height);
    }

    updateReachedCheckpoint(platform) {
        // Update the last checkpoint we are standing on
        this.lastReachedCheckpoint = platform;

        // ACTIVATE MANUAL REGEN BUTTON
        this.game.showManualRegenButton(true);

        // Notify if it's a new personal best (visual only)
        const currentY = platform.y;
        if (!this.pbY || currentY < this.pbY) {
            this.pbY = currentY;
            this.game.showComboPopup("CHECKPOINT!", platform.x, platform.y);
            this.game.soundManager.playMilestone();
        }
    }

    regenerate() {
        // CRITICAL REGIONS: CLEAR AND REBUILD
        this.platforms = this.platforms.filter(p => p.isCheckpoint);
        this.highestPoint = this.lastReachedCheckpoint.y;

        const currentHeightMeters = Math.max(0, Math.floor((this.game.height - this.highestPoint) / 10));
        const interval = this.getNextCheckpointInterval(currentHeightMeters);
        this.nextCheckpointHeight = (Math.floor(currentHeightMeters / interval) + 1) * interval;

        this.generatePlatforms();

        // Feedback
        for (let i = 0; i < 40; i++) {
            this.game.particles.spawn(this.lastReachedCheckpoint.x + this.lastReachedCheckpoint.width / 2, this.lastReachedCheckpoint.y, "#ffd700", 10);
        }
    }

    draw(ctx) {
        for (const p of this.platforms) {
            if (!p.active) continue;
            ctx.fillStyle = (p.type === "gold") ? "#ffd700" : (p.type === "pink") ? "#ff00cc" : "#8b4513";
            ctx.fillRect(p.x, p.y, p.width, p.height);
            if (p.type === "gold") {
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 3;
                ctx.strokeRect(p.x, p.y, p.width, p.height);
            }
        }
        this.collectibles.forEach(c => { if (c.active) c.draw(ctx); });
    }
}
