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
        this.nextPowerUpThreshold = 250 + Math.random() * 50; // Distance to next spawn check in meters

        // Ground platform
        this.platforms.push({
            x: 0,
            y: this.game.height - 20,
            width: this.game.width,
            height: 20,
            type: "brown",
            active: true
        });

        this.generatePlatforms();
    }

    generatePlatforms() {
        while (this.highestPoint > this.game.camera.y - this.game.height) {
            const gap = WORLD_CONFIG.SPAWN_GAP_MIN + Math.random() * (WORLD_CONFIG.SPAWN_GAP_MAX - WORLD_CONFIG.SPAWN_GAP_MIN);
            const y = this.highestPoint - gap;

            const pWidth = WORLD_CONFIG.PLATFORM_WIDTH_MIN + Math.random() * (WORLD_CONFIG.PLATFORM_WIDTH_MAX - WORLD_CONFIG.PLATFORM_WIDTH_MIN);
            const x = Math.random() * (this.game.width - pWidth);

            let type = "brown";
            const rand = Math.random();
            if (rand > 0.92) type = "pink"; // Bouncy
            else if (rand > 0.8) type = "blue"; // Ice
            else if (rand > 0.7) type = "red";  // Fragile

            this.platforms.push({
                x, y,
                width: pWidth,
                height: WORLD_CONFIG.PLATFORM_HEIGHT,
                type,
                active: true,
                timer: 0,
                respawnTimer: 0
            });

            // Add collectible drops or power-ups
            const randColl = Math.random();
            if (randColl < 0.9) { // 90% chance of a collectible
                const dropX = x + pWidth / 2 - 20;
                const dropY = y - 50;

                // height is (game.height - y) / 10
                // We want to check every ~250-300m
                const distanceSinceLastPU = Math.abs(this.lastPowerUpY - y) / 10;

                if (distanceSinceLastPU >= this.nextPowerUpThreshold) {
                    this.lastPowerUpY = y;
                    this.nextPowerUpThreshold = 250 + Math.random() * 50;

                    // 50% chance for a powerup
                    const player = this.game.player;
                    const activePUs = (player && player.activePowerUps) ? player.activePowerUps : {};

                    if (Math.random() < 0.5 && !activePUs['jetpack']) {
                        // Filter out currently active powerups
                        const availableTypes = Object.keys(POWER_UPS).filter(key => !activePUs[POWER_UPS[key].id]);

                        if (availableTypes.length > 0) {
                            const randomKey = availableTypes[Math.floor(Math.random() * availableTypes.length)];
                            this.collectibles.push(new Collectible(dropX, dropY, POWER_UPS[randomKey].id));
                        } else {
                            this.collectibles.push(new Collectible(dropX, dropY, "water"));
                        }
                    } else {
                        this.collectibles.push(new Collectible(dropX, dropY, "water"));
                    }
                } else {
                    this.collectibles.push(new Collectible(dropX, dropY, "water"));

                    // Bonus double drops (only for water)
                    if (Math.random() < 0.2) {
                        this.collectibles.push(new Collectible(dropX + (Math.random() > 0.5 ? 25 : -25), dropY - 20, "water"));
                    }
                }
            }

            this.highestPoint = y;
        }
    }

    update() {
        const heightMeters = Math.max(0, Math.floor((this.game.height - this.game.player.y - this.game.player.height) / 10));

        // Dynamic wind in Sky biome
        const zone = heightMeters % 500;
        if (heightMeters >= 300 && heightMeters < 450) {
            this.windTimer += 0.02;
            this.wind = Math.sin(this.windTimer);
        } else {
            this.wind *= 0.95;
        }

        if (this.game.camera.y < this.highestPoint + this.game.height * 2) {
            this.generatePlatforms();
        }

        // Handle fragile platforms (red)
        const now = performance.now();
        for (const p of this.platforms) {
            if (p.type === "red") {
                if (p.active) {
                    if (p.timer > 0 && now > p.timer) {
                        p.active = false;
                        p.respawnTimer = now + 1000;
                        p.timer = 0;
                    }
                } else {
                    if (now > p.respawnTimer) {
                        p.active = true;
                        p.timer = 0;
                    }
                }
            }
        }

        this.collectibles.forEach(c => c.update(1 / 60));

        // Remove old collectibles
        this.collectibles = this.collectibles.filter(c => c.active && c.y < this.game.camera.y + this.game.height);
    }

    draw(ctx) {
        for (const p of this.platforms) {
            if (!p.active) continue;

            // Determine color based on biome
            const depth = Math.max(0, Math.floor((this.game.height - p.y) / 10));
            let biome = BIOMES[0];
            for (let i = BIOMES.length - 1; i >= 0; i--) {
                if (depth >= BIOMES[i].height) {
                    biome = BIOMES[i];
                    break;
                }
            }

            if (p.type === "brown") {
                if (biome.name === "Sky") ctx.fillStyle = "#f0f8ff";
                else if (biome.name === "Space") ctx.fillStyle = "#2f4f4f";
                else ctx.fillStyle = "#8b4513";
            } else if (p.type === "pink") {
                ctx.fillStyle = "#ff00cc";
            } else if (p.type === "blue") {
                ctx.fillStyle = "#00ffff";
            } else if (p.type === "red") {
                ctx.fillStyle = "#ff4444";
                if (p.timer > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
                    ctx.fillStyle = "#ffaaaa";
                }
            }

            ctx.fillRect(p.x, p.y, p.width, p.height);

            // Highlight border
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x, p.y, p.width, p.height);
        }

        this.collectibles.forEach(c => {
            if (c.active) c.draw(ctx);
        });
    }
}
