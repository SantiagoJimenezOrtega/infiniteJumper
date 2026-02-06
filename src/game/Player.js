import { PHYSICS, PLAYER_CONFIG, SHOP_ANIMALS } from './Constants.js';

export class Player {
    constructor(game) {
        this.game = game;
        this.width = PLAYER_CONFIG.SIZE;
        this.height = PLAYER_CONFIG.SIZE;
        this.x = game.width / 2 - this.width / 2;
        this.y = game.height - 300;
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
        this.jumpCount = 0;
        this.facing = 1; // 1: right, -1: left
        this.comboCount = 0;
        this.lastLandTime = 0;
        this.hasLanded = false;

        // Animation
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.animationSpeed = 0.1;

        // Power-ups state
        this.activePowerUps = {}; // { id: endTime }
    }

    applyPowerUp(id, duration) {
        const now = performance.now();
        this.activePowerUps[id] = now + duration;

        // Immediate effects if any
        if (id === "shield") {
            this.game.soundManager.playCollect(); // Temporary sound
        }
    }

    update(dt) {
        const input = this.game.input;
        const now = performance.now();

        // Direction facing
        if (input.keys.ArrowLeft.pressed) this.facing = -1;
        if (input.keys.ArrowRight.pressed) this.facing = 1;

        // Power-up cleanup and effects
        for (const id in this.activePowerUps) {
            if (now > this.activePowerUps[id]) {
                delete this.activePowerUps[id];
            }
        }

        // Bullet time (already exists from pink platforms)
        if (this.bulletTime && now > this.bulletTimeEnd) {
            this.bulletTime = false;
        }

        // Time Power-up also triggers bullet time
        if (this.activePowerUps.time) {
            this.bulletTime = true;
            this.bulletTimeEnd = Math.max(this.bulletTimeEnd, this.activePowerUps.time);
        }

        if (this.grounded) {
            // Friction
            if (this.currentSurface === "ice") {
                this.vx *= 0.88;
            } else {
                this.vx *= PHYSICS.FRICTION;
            }

            // Jump handling
            if (input.keys.ArrowDown.pressed) {
                this.jumpCancelled = true;
            }

            if (input.keys.ArrowUp.justReleased) {
                if (!this.jumpCancelled) this.targetJump(0, input.keys.ArrowUp.duration);
                this.jumpCancelled = false;
                input.keys.ArrowUp.justReleased = false;
            } else if (input.keys.ArrowLeft.justReleased) {
                if (!this.jumpCancelled) this.targetJump(-1, input.keys.ArrowLeft.duration);
                this.jumpCancelled = false;
                input.keys.ArrowLeft.justReleased = false;
            } else if (input.keys.ArrowRight.justReleased) {
                if (!this.jumpCancelled) this.targetJump(1, input.keys.ArrowRight.duration);
                this.jumpCancelled = false;
                input.keys.ArrowRight.justReleased = false;
            }
        } else {
            // Air physics
            this.vx *= PHYSICS.AIR_RESISTANCE;

            // Air control (only if not in bullet time)
            if (!this.bulletTime) {
                if (input.keys.ArrowLeft.pressed) this.vx -= 0.2;
                else if (input.keys.ArrowRight.pressed) this.vx += 0.2;
            } else {
                // Bullet time jump redirect (Mid-air dash)
                if (input.keys.ArrowUp.justReleased) {
                    this.targetJump(0, input.keys.ArrowUp.duration);
                    this.bulletTime = false;
                    input.keys.ArrowUp.justReleased = false;
                } else if (input.keys.ArrowLeft.justReleased) {
                    this.targetJump(-1, input.keys.ArrowLeft.duration);
                    this.bulletTime = false;
                    input.keys.ArrowLeft.justReleased = false;
                } else if (input.keys.ArrowRight.justReleased) {
                    this.targetJump(1, input.keys.ArrowRight.duration);
                    this.bulletTime = false;
                    input.keys.ArrowRight.justReleased = false;
                }
            }
        }

        // Apply wind
        const windForce = this.game.world.wind * this.game.world.windStrength;
        if (this.grounded) {
            this.vx += (this.currentSurface === "ice" ? windForce * 0.8 : windForce * 0.1);
        } else {
            this.vx += windForce * 0.4;
        }

        // Gravity
        let g = PHYSICS.GRAVITY * this.stats.gravity;
        if (this.activePowerUps.boots) g *= 0.5;

        // Jetpack effect
        if (this.activePowerUps.jetpack) {
            this.vy = -12;
            if (Math.random() < 0.3) {
                this.game.particles.spawn(this.x + this.width / 2, this.y + this.height, "#ffffff", 2);
            }
        } else {
            this.vy += g;
        }

        if (this.vy > PHYSICS.TERMINAL_VELOCITY) {
            this.vy = PHYSICS.TERMINAL_VELOCITY;
        }

        // Magnet effect
        if (this.activePowerUps.magnet) {
            this.game.world.collectibles.forEach(c => {
                if (c.active) {
                    const dx = this.x + this.width / 2 - c.x;
                    const dy = this.y + this.height / 2 - c.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 300) {
                        c.x += dx / 15;
                        c.y += dy / 15;
                    }
                }
            });
        }

        // Move
        this.x += this.vx;
        this.y += this.vy;

        // Wall bounce
        if (this.x < 0) {
            this.x = 0;
            this.vx *= -0.5;
        }
        if (this.x + this.width > this.game.width) {
            this.x = this.game.width - this.width;
            this.vx *= -0.5;
        }

        this.grounded = false;
        this.checkPlatformCollisions();
    }

    targetJump(direction, duration) {
        this.jump(direction, duration);
    }

    jump(direction, duration) {
        const now = performance.now();
        if (this.lastJumpTime && now - this.lastJumpTime < 250) return;
        this.lastJumpTime = now;
        this.jumpCount++;

        // Calculate power based on charge
        let charge = Math.min(duration * this.stats.chargeSpeed, PLAYER_CONFIG.MAX_CHARGE) / PLAYER_CONFIG.MAX_CHARGE;
        charge = Math.pow(charge, 0.8); // Non-linear charge

        const minPower = PLAYER_CONFIG.MIN_JUMP_POWER;
        const maxPower = this.stats.jumpForce;
        const power = minPower + (maxPower - minPower) * charge;

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

        for (const platform of this.game.world.platforms) {
            if (!platform.active) continue;

            if (this.x < platform.x + platform.width &&
                this.x + this.width > platform.x &&
                this.y + this.height > platform.y - 5 &&
                this.y + this.height < platform.y + platform.height + this.vy + 10) {

                if (this.vy > 0) {
                    this.y = platform.y - this.height;

                    // Combo/Land logic
                    if (!this.hasLanded) {
                        const now = performance.now();
                        if (now - this.lastLandTime < 1500) {
                            this.comboCount++;
                            if (this.comboCount > 1) {
                                this.game.showComboPopup(this.comboCount, this.x, this.y);
                            }
                        } else {
                            this.comboCount = 1;
                        }
                        this.lastLandTime = now;
                        this.hasLanded = true;
                    }

                    this.grounded = true;
                }

                // Platform effects
                this.game.particles.spawn(this.x + this.width / 2, this.y + this.height, "#ffffff", 1);

                if (platform.type === "blue") {
                    this.currentSurface = "ice";
                } else if (platform.type === "pink") {
                    this.vy = -15; // Bounce
                    this.grounded = false;
                    this.bulletTime = true;
                    this.bulletTimeEnd = performance.now() + 3000;
                    this.game.particles.spawn(this.x + this.width / 2, this.y + this.height, "#ff00cc", 20);
                    this.game.soundManager.playBounce();
                } else if (platform.type === "red") {
                    this.currentSurface = "normal";
                    if (platform.timer === 0 && !this.activePowerUps.shield) {
                        platform.timer = performance.now() + 2000;
                        this.game.soundManager.playExplosion();
                    } else if (this.activePowerUps.shield) {
                        // Shield visual feedback on red platform
                        this.game.particles.spawn(this.x + this.width / 2, this.y + this.height, "#33ccff", 3);
                    }
                } else if (platform.type === "brown") {
                    this.currentSurface = "normal";
                }
                return;
            }
        }
    }

    draw(ctx) {
        const input = this.game.input;
        let chargeDuration = 0;
        let isCharging = false;

        if (input.keys.ArrowLeft.pressed) {
            chargeDuration = input.getCharge("ArrowLeft");
            isCharging = true;
        } else if (input.keys.ArrowRight.pressed) {
            chargeDuration = input.getCharge("ArrowRight");
            isCharging = true;
        } else if (input.keys.ArrowUp.pressed) {
            chargeDuration = input.getCharge("ArrowUp");
            isCharging = true;
        }

        // Draw charge bar
        if (isCharging && this.grounded && !this.jumpCancelled) {
            const barX = this.x + this.width / 2 - 30;
            const barY = this.y - 20;
            const currentCharge = Math.min(chargeDuration * this.stats.chargeSpeed, PLAYER_CONFIG.MAX_CHARGE);
            const ratio = currentCharge / PLAYER_CONFIG.MAX_CHARGE;

            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(barX, barY, 60, 8);

            const isFull = currentCharge >= PLAYER_CONFIG.MAX_CHARGE;
            ctx.fillStyle = isFull ? "#ff0000" : "#00ffcc";

            if (isFull) {
                const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
                ctx.globalAlpha = pulse;
                ctx.shadowBlur = 15;
                ctx.shadowColor = "#ff0000";
            }

            ctx.fillRect(barX, barY, 60 * ratio, 8);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, 60, 8);
        }

        // Bullet time indicator
        if (this.bulletTime) {
            const timeLeft = (this.bulletTimeEnd - performance.now()) / 1000;
            const pulse = Math.sin(Date.now() / 100) * 0.5 + 0.5;
            ctx.shadowBlur = 20 + pulse * 10;
            ctx.shadowColor = "#ff00cc";

            ctx.save();
            ctx.font = "bold 14px Inter, sans-serif";
            ctx.fillStyle = "#ff00cc";
            ctx.textAlign = "center";
            ctx.shadowBlur = 10;
            ctx.fillText(`⚡ ${timeLeft.toFixed(1)}s`, this.x + this.width / 2, this.y - 30);
            ctx.restore();
        }

        // Animation logic
        this.animationTimer += 0.1;
        if (this.animationTimer >= this.animationSpeed) {
            this.animationFrame = (this.animationFrame + 1) % 4;
            this.animationTimer = 0;
        }

        const size = this.width;
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // Power-up Visuals: SHIELD
        if (this.activePowerUps.shield) {
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(51, 204, 255, 0.6)";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = "rgba(51, 204, 255, 0.1)";
            ctx.fill();

            // Pulse effect
            const pulse = Math.sin(Date.now() / 200) * 0.1 + 0.9;
            ctx.strokeStyle = `rgba(51, 204, 255, ${0.2 * pulse})`;
            ctx.lineWidth = 10 * pulse;
            ctx.stroke();
        }

        // Power-up Visuals: JETPACK
        if (this.activePowerUps.jetpack) {
            const fireH = 20 + Math.random() * 20;
            const grad = ctx.createLinearGradient(0, size / 2, 0, size / 2 + fireH);
            grad.addColorStop(0, "#ffffff");
            grad.addColorStop(0.5, "#33ccff");
            grad.addColorStop(1, "transparent");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-size / 4, size / 2);
            ctx.lineTo(size / 4, size / 2);
            ctx.lineTo(0, size / 2 + fireH);
            ctx.fill();
        }

        if (this.facing === -1) ctx.scale(-1, 1);
        this.drawSprite(ctx);
        ctx.restore();
        ctx.shadowBlur = 0;
    }

    drawSprite(ctx) {
        const size = this.width;
        const jumping = !this.grounded;

        switch (this.emoji) {
            case "🐸": this.drawFrog(ctx, size, jumping); break;
            case "🐰": this.drawRabbit(ctx, size, jumping); break;
            case "🐿️": this.drawSquirrel(ctx, size, jumping); break;
            case "🦘": this.drawKangaroo(ctx, size, jumping); break;
            case "🐱": this.drawCat(ctx, size, jumping); break;
            case "🦅": this.drawEagle(ctx, size, jumping); break;
            default:
                ctx.font = `${size * 1.2}px serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#ffffff";
                ctx.fillText(this.emoji, 0, 5);
        }
    }

    drawFrog(ctx, size, jumping) {
        ctx.fillStyle = "#4CAF50";
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.4, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(-size * 0.15, -size * 0.15, size * 0.12, 0, Math.PI * 2);
        ctx.arc(size * 0.15, -size * 0.15, size * 0.12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(-size * 0.15, -size * 0.15, size * 0.06, 0, Math.PI * 2);
        ctx.arc(size * 0.15, -size * 0.15, size * 0.06, 0, Math.PI * 2);
        ctx.fill();

        if (jumping) {
            ctx.strokeStyle = "#4CAF50";
            ctx.lineWidth = size * 0.1;
            ctx.beginPath();
            ctx.moveTo(-size * 0.2, size * 0.2);
            ctx.lineTo(-size * 0.3, size * 0.5);
            ctx.moveTo(size * 0.2, size * 0.2);
            ctx.lineTo(size * 0.3, size * 0.5);
            ctx.stroke();
        }
    }

    drawRabbit(ctx, size, jumping) {
        // Ears
        ctx.fillStyle = "#FFB6C1";
        ctx.beginPath();
        ctx.ellipse(-size * 0.15, -size * 0.4, size * 0.08, size * 0.25, -0.3, 0, Math.PI * 2);
        ctx.ellipse(size * 0.15, -size * 0.4, size * 0.08, size * 0.25, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.35, size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(-size * 0.12, -size * 0.05, size * 0.05, 0, Math.PI * 2);
        ctx.arc(size * 0.12, -size * 0.05, size * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Nose
        ctx.fillStyle = "#FFB6C1";
        ctx.beginPath();
        ctx.arc(0, size * 0.05, size * 0.04, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSquirrel(ctx, size, jumping) {
        ctx.fillStyle = "#D2691E";
        // Tail
        ctx.beginPath();
        ctx.arc(-size * 0.3, size * 0.1, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = "#CD853F";
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.3, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(0, -size * 0.2, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(-size * 0.08, -size * 0.22, size * 0.04, 0, Math.PI * 2);
        ctx.arc(size * 0.08, -size * 0.22, size * 0.04, 0, Math.PI * 2);
        ctx.fill();
    }

    drawKangaroo(ctx, size, jumping) {
        const bounceOffset = jumping ? -size * 0.1 : 0;
        ctx.fillStyle = "#D2691E";
        // Body
        ctx.beginPath();
        ctx.ellipse(0, bounceOffset, size * 0.35, size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.3 + bounceOffset, size * 0.25, size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.beginPath();
        ctx.ellipse(-size * 0.12, -size * 0.45 + bounceOffset, size * 0.08, size * 0.15, -0.2, 0, Math.PI * 2);
        ctx.ellipse(size * 0.12, -size * 0.45 + bounceOffset, size * 0.08, size * 0.15, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(-size * 0.08, -size * 0.3 + bounceOffset, size * 0.04, 0, Math.PI * 2);
        ctx.arc(size * 0.08, -size * 0.3 + bounceOffset, size * 0.04, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        if (!jumping) {
            ctx.strokeStyle = "#D2691E";
            ctx.lineWidth = size * 0.12;
            ctx.beginPath();
            ctx.moveTo(size * 0.2, size * 0.3);
            ctx.quadraticCurveTo(size * 0.5, size * 0.4, size * 0.4, size * 0.6);
            ctx.stroke();
        }
    }

    drawCat(ctx, size, jumping) {
        ctx.fillStyle = "#FF8C00";
        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.35, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(0, -size * 0.15, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.beginPath();
        ctx.moveTo(-size * 0.2, -size * 0.3);
        ctx.lineTo(-size * 0.25, -size * 0.45);
        ctx.lineTo(-size * 0.1, -size * 0.35);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size * 0.2, -size * 0.3);
        ctx.lineTo(size * 0.25, -size * 0.45);
        ctx.lineTo(size * 0.1, -size * 0.35);
        ctx.fill();
        // Eyes
        ctx.fillStyle = "#00FF00";
        ctx.beginPath();
        ctx.arc(-size * 0.1, -size * 0.18, size * 0.06, 0, Math.PI * 2);
        ctx.arc(size * 0.1, -size * 0.18, size * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.ellipse(-size * 0.1, -size * 0.18, size * 0.02, size * 0.04, 0, 0, Math.PI * 2);
        ctx.ellipse(size * 0.1, -size * 0.18, size * 0.02, size * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawEagle(ctx, size, jumping) {
        const wingAngle = jumping ? Math.sin(this.animationFrame * Math.PI) * 0.3 : 0;
        ctx.fillStyle = "#8B4513";
        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.25, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(0, -size * 0.25, size * 0.18, 0, Math.PI * 2);
        ctx.fill();
        // Beak
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.moveTo(size * 0.1, -size * 0.2);
        ctx.lineTo(size * 0.25, -size * 0.2);
        ctx.lineTo(size * 0.1, -size * 0.15);
        ctx.fill();
        // Eyes
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(-size * 0.06, -size * 0.27, size * 0.04, 0, Math.PI * 2);
        ctx.arc(size * 0.06, -size * 0.27, size * 0.04, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.fillStyle = "#8B4513";
        ctx.save();
        ctx.rotate(wingAngle);
        ctx.beginPath();
        ctx.ellipse(-size * 0.3, 0, size * 0.15, size * 0.4, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.rotate(-wingAngle);
        ctx.beginPath();
        ctx.ellipse(size * 0.3, 0, size * 0.15, size * 0.4, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
