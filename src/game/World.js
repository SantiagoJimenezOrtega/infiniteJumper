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
        this.windStrength = 0.05;
        this.lastPowerUpY = this.highestPoint;
        this.nextCheckpointHeight = 200;
        this.firstCheckpointNotified = false;

        // TRACKING
        this.lastReachedCheckpoint = {
            x: 0,
            y: this.game.height - 20,
            width: this.game.width,
            id: 'start'
        };

        // Ground platform (Full width)
        this.platforms.push({
            x: 0,
            y: this.game.height - 20,
            width: this.game.width,
            height: 25,
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

                let pWidth;
                if (currentHeightMeters <= 200) {
                    pWidth = this.game.width;
                } else {
                    const widthProgression = Math.min(1, (currentHeightMeters - 200) / 4800);
                    pWidth = this.game.width - (widthProgression * (this.game.width - 120));
                }

                const x = (this.game.width - pWidth) / 2;

                this.platforms.push({
                    x, y,
                    width: pWidth,
                    height: 30,
                    type: "gold",
                    isCheckpoint: true,
                    id: 'cp_' + Math.floor(y),
                    active: true,
                    timer: 0,
                    respawnTimer: 0
                });

                const interval = this.getNextCheckpointInterval(currentHeightMeters);
                this.nextCheckpointHeight = (Math.floor(currentHeightMeters / interval) + 1) * interval;
                this.highestPoint = y;
                continue;
            }

            const gapMin = WORLD_CONFIG.SPAWN_GAP_MIN + (progression * 40);
            const gapMax = WORLD_CONFIG.SPAWN_GAP_MAX + (progression * 60);
            const gap = gapMin + Math.random() * (gapMax - gapMin);
            const y = this.highestPoint - gap;

            const widthMin = Math.max(40, WORLD_CONFIG.PLATFORM_WIDTH_MIN - (progression * 20));
            const widthMax = Math.max(60, WORLD_CONFIG.PLATFORM_WIDTH_MAX - (progression * 50));
            const pWidth = widthMin + Math.random() * (widthMax - widthMin);
            const x = Math.random() * (this.game.width - pWidth);

            let type = "brown";
            const hazardChance = 0.05 + (progression * 0.25);
            const rand = Math.random();

            if (rand < hazardChance) {
                const typeRand = Math.random();
                if (progression > 0.6 && typeRand > 0.6) type = "red";
                else if (progression > 0.3 && typeRand > 0.5) type = "blue";
                else type = "pink";
            }

            this.platforms.push({
                x, y,
                width: pWidth,
                height: WORLD_CONFIG.PLATFORM_HEIGHT,
                type,
                active: true,
                timer: 0,
                respawnTimer: 0
            });

            const randColl = Math.random();
            if (randColl < 0.9) {
                const dropX = x + pWidth / 2 - 20;
                const dropY = y - 50;
                this.collectibles.push(new Collectible(dropX, dropY, "water"));
            }

            this.highestPoint = y;
        }
    }

    update() {
        let topY = this.game.height;
        for (const p of this.platforms) {
            if (p.y < topY) topY = p.y;
        }
        if (topY > this.game.camera.y - this.game.height * 2) {
            this.highestPoint = topY;
            this.generatePlatforms();
        }
        this.collectibles.forEach(c => c.update(1 / 60));
        this.platforms = this.platforms.filter(p => p.isCheckpoint || p.y < this.game.camera.y + this.game.height + 600);
        this.collectibles = this.collectibles.filter(c => c.active && c.y < this.game.camera.y + this.game.height);
    }

    updateReachedCheckpoint(platform) {
        // PREVENT REPEATED TRIGGERING
        if (platform.id === this.lastReachedCheckpoint.id) return;

        // DETECT FALLING BACK
        if (platform.y > this.lastReachedCheckpoint.y) {
            this.lastReachedCheckpoint = {
                x: platform.x,
                y: platform.y,
                width: platform.width,
                id: platform.id
            };
            this.game.triggerRegenerationSequence();
            return;
        }

        // NEW RECORD
        if (platform.y < this.lastReachedCheckpoint.y) {
            this.lastReachedCheckpoint = {
                x: platform.x,
                y: platform.y,
                width: platform.width,
                id: platform.id
            };
            this.game.soundManager.playMilestone();

            if (!this.firstCheckpointNotified) {
                this.game.modalMessage("¡CHECKPOINT ALCANZADO!\n\nSi caes y vuelves a tocar una plataforma dorada, regeneraremos el camino automáticamente.");
                this.firstCheckpointNotified = true;
            } else {
                this.game.showComboPopup("CHECKPOINT!", platform.x, platform.y);
            }

            for (let i = 0; i < 30; i++) {
                this.game.particles.spawn(platform.x + platform.width / 2, platform.y, "#ffd700", 5);
            }
        }
    }

    regenerate() {
        this.platforms = this.platforms.filter(p => p.isCheckpoint);
        this.highestPoint = this.lastReachedCheckpoint.y;
        const currentHeightMeters = Math.max(0, Math.floor((this.game.height - this.highestPoint) / 10));
        const interval = this.getNextCheckpointInterval(currentHeightMeters);
        this.nextCheckpointHeight = (Math.floor(currentHeightMeters / interval) + 1) * interval;
        this.generatePlatforms();
    }

    draw(ctx) {
        for (const p of this.platforms) {
            if (!p.active) continue;
            const depth = Math.max(0, Math.floor((this.game.height - p.y) / 10));
            let biome = BIOMES[0];
            for (let i = BIOMES.length - 1; i >= 0; i--) {
                if (depth >= BIOMES[i].height) { biome = BIOMES[i]; break; }
            }
            if (p.type === "brown") {
                if (biome.name === "Sky") ctx.fillStyle = "#f0f8ff";
                else if (biome.name === "Space") ctx.fillStyle = "#2f4f4f";
                else ctx.fillStyle = "#8b4513";
            } else if (p.type === "gold") {
                ctx.fillStyle = "#ffd700";
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#ffd700";
            } else {
                ctx.fillStyle = p.type === "pink" ? "#ff00cc" : p.type === "blue" ? "#00ffff" : "#ff4444";
            }
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.strokeStyle = p.type === "gold" ? "#ffffff" : "rgba(255,255,255,0.5)";
            ctx.lineWidth = p.type === "gold" ? 3 : 2;
            ctx.strokeRect(p.x, p.y, p.width, p.height);
            ctx.shadowBlur = 0;
        }
        this.collectibles.forEach(c => { if (c.active) c.draw(ctx); });
    }
}
