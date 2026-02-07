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
        this.nextCheckpointHeight = 1000;

        // Track the checkpoint we actually landed on
        this.lastReachedCheckpoint = {
            x: 0,
            y: this.game.height - 20,
            width: this.game.width
        };

        // Ground platform
        this.platforms.push({
            x: 0,
            y: this.game.height - 20,
            width: this.game.width,
            height: 20,
            type: "gold",
            isCheckpoint: true,
            active: true
        });

        this.generatePlatforms();
    }

    generatePlatforms() {
        // Generate platforms until we are at least 2 screen heights above the camera
        while (this.highestPoint > this.game.camera.y - this.game.height * 2) {
            // 1. Calculate height for difficulty and checkpoints
            const currentHeightMeters = Math.max(0, Math.floor((this.game.height - this.highestPoint) / 10));
            const progression = Math.min(1, currentHeightMeters / 10000);

            // 2. Check for checkpoint spawning (every 1000m)
            if (currentHeightMeters >= this.nextCheckpointHeight) {
                const gap = 150;
                const y = this.highestPoint - gap;
                const pWidth = this.game.width * 0.7;
                const x = (this.game.width - pWidth) / 2;

                this.platforms.push({
                    x, y,
                    width: pWidth,
                    height: 25,
                    type: "gold",
                    isCheckpoint: true,
                    active: true,
                    timer: 0,
                    respawnTimer: 0
                });

                this.nextCheckpointHeight = (Math.floor(currentHeightMeters / 1000) + 1) * 1000;
                this.highestPoint = y;
                continue;
            }

            // 1. Gaps increase with height
            const gapMin = WORLD_CONFIG.SPAWN_GAP_MIN + (progression * 40);
            const gapMax = WORLD_CONFIG.SPAWN_GAP_MAX + (progression * 60);
            const gap = gapMin + Math.random() * (gapMax - gapMin);
            const y = this.highestPoint - gap;

            // 2. Platforms get smaller with height
            const widthMin = Math.max(40, WORLD_CONFIG.PLATFORM_WIDTH_MIN - (progression * 20));
            const widthMax = Math.max(60, WORLD_CONFIG.PLATFORM_WIDTH_MAX - (progression * 50));
            const pWidth = widthMin + Math.random() * (widthMax - widthMin);
            const x = Math.random() * (this.game.width - pWidth);

            // 3. Hazard frequency increases with height/biomes
            let type = "brown";
            const hazardChance = 0.05 + (progression * 0.25); // Starts at 5%, goes up to 30%
            const rand = Math.random();

            if (rand < hazardChance) {
                const typeRand = Math.random();
                if (progression > 0.6 && typeRand > 0.6) type = "red"; // More fragile platforms in Space
                else if (progression > 0.3 && typeRand > 0.5) type = "blue"; // More ice in Sky/Space
                else type = "pink"; // Bouncy platforms are common hazards
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

            // Add collectible drops or power-ups
            const randColl = Math.random();
            if (randColl < 0.9) { // 90% chance of a collectible
                const dropX = x + pWidth / 2 - 20;
                const dropY = y - 50;

                // Power-up spawn logic
                const distanceSinceLastPU = Math.abs(this.lastPowerUpY - y) / 10;
                let spawnedPowerUp = false;

                // Only consider spawning PU if we are past a minimum distance (to limit max 2 per 300m)
                // and not while jetpack is active.
                const player = this.game.player;
                const activePUs = (player && player.activePowerUps) ? player.activePowerUps : {};

                if (distanceSinceLastPU >= 120 && !activePUs['jetpack']) {
                    // If we reached the 300m limit, force spawn. Otherwise, use a chance.
                    const forceSpawn = distanceSinceLastPU >= 300;
                    const chanceSpawn = Math.random() < 0.2; // 20% chance per platform after 120m

                    if (forceSpawn || chanceSpawn) {
                        const availableTypes = Object.keys(POWER_UPS).filter(key => !activePUs[POWER_UPS[key].id]);

                        if (availableTypes.length > 0) {
                            const randomKey = availableTypes[Math.floor(Math.random() * availableTypes.length)];
                            this.collectibles.push(new Collectible(dropX, dropY, POWER_UPS[randomKey].id));
                            this.lastPowerUpY = y;
                            spawnedPowerUp = true;
                        }
                    }
                }

                if (!spawnedPowerUp) {
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
        if (heightMeters >= 300 && heightMeters < 450) {
            this.windTimer += 0.02;
            this.wind = Math.sin(this.windTimer);
        } else {
            this.wind *= 0.95;
        }

        // Generate platforms as we climb
        // Detect the topmost platform currently in existence
        let topY = this.game.height;
        for (const p of this.platforms) {
            if (p.y < topY) topY = p.y;
        }

        // If the 'top' of our current world is too low, or if the view is empty, regenerate.
        // This handles cases where the player fell far and platforms below were deleted.
        if (topY > this.game.camera.y - this.game.height * 2) {
            this.highestPoint = topY;
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

        // Cleanup: Remove platforms far below camera (keep checkpoints)
        this.platforms = this.platforms.filter(p => p.isCheckpoint || p.y < this.game.camera.y + this.game.height + 600);

        // Remove old collectibles
        this.collectibles = this.collectibles.filter(c => c.active && c.y < this.game.camera.y + this.game.height);
    }

    updateReachedCheckpoint(platform) {
        if (platform.y < this.lastReachedCheckpoint.y) {
            this.lastReachedCheckpoint = {
                x: platform.x,
                y: platform.y,
                width: platform.width
            };
            this.game.soundManager.playMilestone();
            this.game.showComboPopup("CHECKPOINT!", platform.x, platform.y);

            for (let i = 0; i < 30; i++) {
                this.game.particles.spawn(platform.x + platform.width / 2, platform.y, "#ffd700", 5);
            }
        }
    }

    respawnAtCheckpoint() {
        // Clear all non-checkpoint platforms
        this.platforms = this.platforms.filter(p => p.isCheckpoint);

        // Reset world generation pointer to the checkpoint
        this.highestPoint = this.lastReachedCheckpoint.y;

        // Fix nextCheckpointHeight to be correct
        const currentHeightMeters = Math.floor((this.game.height - this.highestPoint) / 10);
        this.nextCheckpointHeight = (Math.floor(currentHeightMeters / 1000) + 1) * 1000;

        // Immediately fill the view
        this.generatePlatforms();

        for (let i = 0; i < 50; i++) {
            this.game.particles.spawn(this.lastReachedCheckpoint.x + this.lastReachedCheckpoint.width / 2, this.lastReachedCheckpoint.y, "#ffd700", 10);
        }
    }

    draw(ctx) {
        for (const p of this.platforms) {
            if (!p.active) continue;

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
            } else if (p.type === "gold") {
                ctx.fillStyle = "#ffd700";
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#ffd700";
            }

            ctx.fillRect(p.x, p.y, p.width, p.height);

            ctx.strokeStyle = p.type === "gold" ? "#ffffff" : "rgba(255,255,255,0.5)";
            ctx.lineWidth = p.type === "gold" ? 3 : 2;
            ctx.strokeRect(p.x, p.y, p.width, p.height);
            ctx.shadowBlur = 0;
        }

        this.collectibles.forEach(c => {
            if (c.active) c.draw(ctx);
        });
    }
}
