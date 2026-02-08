import { PHYSICS, PLAYER_CONFIG, SHOP_ANIMALS } from './Constants.js';

export class Player {
    constructor(game) {
        this.game = game;
        this.width = PLAYER_CONFIG.SIZE;
        this.height = PLAYER_CONFIG.SIZE;
        this.x = game.width / 2 - this.width / 2;
        this.y = (game.height || 640) - 300;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;

        const equipped = localStorage.getItem("equippedAnimal") || "frog";
        const animal = SHOP_ANIMALS.find(a => a.id === equipped) || SHOP_ANIMALS[0];

        this.color = animal.color;
        this.emoji = animal.emoji;
        this.stats = animal.stats;

        this.currentSurface = "normal";
        this.bulletTime = false;
        this.bulletTimeEnd = 0;
        this.jumpCancelled = false;
        this.facing = 1; // 1: right, -1: left
        this.comboCount = 0;
        this.lastLandTime = 0;
        this.hasLanded = false;

        this.animationFrame = 0;
        this.animationTimer = 0;
        this.animationSpeed = 0.1;
        this.activePowerUps = {};
    }

    applyPowerUp(id, duration) {
        const now = performance.now();
        this.activePowerUps[id] = now + duration;
    }

    update(dt) {
        const input = this.game.input;
        const now = performance.now();

        if (input.keys.ArrowLeft.pressed) this.facing = -1;
        if (input.keys.ArrowRight.pressed) this.facing = 1;

        // Power-ups
        for (const id in this.activePowerUps) {
            if (now > this.activePowerUps[id]) delete this.activePowerUps[id];
        }

        if (this.bulletTime && now > this.bulletTimeEnd) this.bulletTime = false;

        if (this.grounded) {
            this.vx *= (this.currentSurface === "ice" ? 0.95 : PHYSICS.FRICTION);
            if (input.keys.ArrowDown.pressed) this.jumpCancelled = true;

            if (input.keys.ArrowUp.justReleased) {
                if (!this.jumpCancelled) this.handleJump(0, input.keys.ArrowUp.duration);
                this.jumpCancelled = false;
            } else if (input.keys.ArrowLeft.justReleased) {
                if (!this.jumpCancelled) this.handleJump(-1, input.keys.ArrowLeft.duration);
                this.jumpCancelled = false;
            } else if (input.keys.ArrowRight.justReleased) {
                if (!this.jumpCancelled) this.handleJump(1, input.keys.ArrowRight.duration);
                this.jumpCancelled = false;
            }
        } else {
            this.vx *= PHYSICS.AIR_RESISTANCE;
            if (!this.bulletTime) {
                if (input.keys.ArrowLeft.pressed) this.vx -= 0.2 * dt;
                else if (input.keys.ArrowRight.pressed) this.vx += 0.2 * dt;
            } else {
                if (input.keys.ArrowUp.justReleased) { this.handleJump(0, input.keys.ArrowUp.duration); this.bulletTime = false; }
                else if (input.keys.ArrowLeft.justReleased) { this.handleJump(-1, input.keys.ArrowLeft.duration); this.bulletTime = false; }
                else if (input.keys.ArrowRight.justReleased) { this.handleJump(1, input.keys.ArrowRight.duration); this.bulletTime = false; }
            }
        }

        let g = PHYSICS.GRAVITY * this.stats.gravity;
        if (this.activePowerUps.jetpack) {
            this.vy = -8;
            if (Math.random() < 0.2) this.game.particles.spawn(this.x + this.width / 2, this.y + this.height, "#33ccff", 1);
        } else {
            this.vy += g * dt;
        }

        if (this.vy > PHYSICS.TERMINAL_VELOCITY) this.vy = PHYSICS.TERMINAL_VELOCITY;

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (this.x < 0) { this.x = 0; this.vx *= -0.5; }
        if (this.x + this.width > this.game.width) { this.x = this.game.width - this.width; this.vx *= -0.5; }

        this.grounded = false;
        this.checkPlatformCollisions(dt);
    }

    handleJump(direction, duration) {
        const charge = Math.min(duration * this.stats.chargeSpeed, PLAYER_CONFIG.MAX_CHARGE) / PLAYER_CONFIG.MAX_CHARGE;
        const power = PLAYER_CONFIG.MIN_JUMP_POWER + (this.stats.jumpForce - PLAYER_CONFIG.MIN_JUMP_POWER) * Math.pow(charge, 0.8);

        if (direction !== 0) {
            this.vx = direction * power * this.stats.jumpAngleX;
            this.vy = -power * PLAYER_CONFIG.JUMP_Y_RATIO;
            this.facing = direction;
        } else {
            this.vx = 0;
            this.vy = -power * 1.2;
        }

        this.grounded = false;
        this.hasLanded = false;
        this.game.particles.spawn(this.x + this.width / 2, this.y + this.height, "#ffffff", 10);
        this.game.soundManager.playJump();
    }

    checkPlatformCollisions() {
        if (this.vy < 0) return;
        for (const p of this.game.world.platforms) {
            if (!p.active) continue;
            if (this.x < p.x + p.width && this.x + this.width > p.x &&
                this.y + this.height > p.y - 5 && this.y + this.height < p.y + p.height + 10) {
                this.y = p.y - this.height;
                this.vy = 0;
                this.grounded = true;
                if (p.isCheckpoint) this.game.world.updateReachedCheckpoint(p);
                this.currentSurface = (p.type === "blue") ? "ice" : "normal";
                if (p.type === "pink") {
                    this.vy = -15; this.grounded = false; this.bulletTime = true;
                    this.bulletTimeEnd = performance.now() + 4000;
                    this.game.soundManager.playBounce();
                }
                return;
            }
        }
    }

    draw(ctx) {
        const input = this.game.input;
        if (input.isCharging && this.grounded && !this.jumpCancelled) {
            const chargeInput = input.keys.ArrowLeft.pressed ? "ArrowLeft" : input.keys.ArrowRight.pressed ? "ArrowRight" : "ArrowUp";
            const ratio = Math.min(input.getCharge(chargeInput) * this.stats.chargeSpeed, PLAYER_CONFIG.MAX_CHARGE) / PLAYER_CONFIG.MAX_CHARGE;
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(this.x + this.width / 2 - 30, this.y - 20, 60, 6);
            ctx.fillStyle = (ratio >= 1) ? "#ff4444" : "#00ffcc";
            ctx.fillRect(this.x + this.width / 2 - 30, this.y - 20, 60 * ratio, 6);
        }

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        if (this.facing === -1) ctx.scale(-1, 1);

        this.drawSprite(ctx);
        ctx.restore();
    }

    drawSprite(ctx) {
        const size = this.width;
        if (this.emoji === "🐸") this.drawFrog(ctx, size);
        else if (this.emoji === "🐰") this.drawRabbit(ctx, size);
        else if (this.emoji === " squirrel") this.drawSquirrel(ctx, size);
        else {
            ctx.font = `${size * 1.2}px serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(this.emoji, 0, 0);
        }
    }

    drawFrog(ctx, size) {
        ctx.fillStyle = "#4CAF50";
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.45, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(-size * 0.18, -size * 0.15, size * 0.14, 0, Math.PI * 2);
        ctx.arc(size * 0.18, -size * 0.15, size * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(-size * 0.18, -size * 0.15, size * 0.07, 0, Math.PI * 2);
        ctx.arc(size * 0.18, -size * 0.15, size * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#2E7D32";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, size * 0.1, size * 0.2, 0.2, Math.PI - 0.2);
        ctx.stroke();
    }

    drawRabbit(ctx, size) {
        ctx.fillStyle = "#FFB6C1";
        ctx.beginPath();
        ctx.ellipse(-size * 0.15, -size * 0.45, size * 0.08, size * 0.25, -0.2, 0, Math.PI * 2);
        ctx.ellipse(size * 0.15, -size * 0.45, size * 0.08, size * 0.25, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.4, size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(-size * 0.12, -size * 0.1, size * 0.05, 0, Math.PI * 2);
        ctx.arc(size * 0.12, -size * 0.1, size * 0.05, 0, Math.PI * 2);
        ctx.fill();
    }
}
