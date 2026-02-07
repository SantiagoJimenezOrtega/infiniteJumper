import { PHYSICS, PLAYER_CONFIG } from './Constants.js';

export class TrajectoryPreview {
    constructor(game) {
        this.game = game;
    }

    draw(ctx, player, direction, duration) {
        if (this.game.difficulty !== "assisted" || (!player.grounded && !player.bulletTime) || duration <= 0) return;

        const stats = player.stats;
        let charge = Math.min(duration * stats.chargeSpeed, PLAYER_CONFIG.MAX_CHARGE) / PLAYER_CONFIG.MAX_CHARGE;
        charge = Math.pow(charge, 0.8);

        const minPower = PLAYER_CONFIG.MIN_JUMP_POWER;
        const maxPower = stats.jumpForce;
        const power = minPower + (maxPower - minPower) * charge;

        let vx, vy;
        if (direction !== 0) {
            vx = direction * power * stats.jumpAngleX;
            vy = -power * PLAYER_CONFIG.JUMP_Y_RATIO;
        } else {
            vx = 0;
            vy = -power * 1.2;
        }

        let currX = player.x + player.width / 2;
        let currY = player.y + player.height / 2;
        let currVX = vx;
        let currVY = vy;

        const points = [];
        const maxSteps = 100;

        for (let i = 0; i < maxSteps; i++) {
            points.push({ x: currX, y: currY });

            currVX *= PHYSICS.AIR_RESISTANCE;
            currVY += PHYSICS.GRAVITY * stats.gravity;
            if (currVY > PHYSICS.TERMINAL_VELOCITY) currVY = PHYSICS.TERMINAL_VELOCITY;

            currX += currVX;
            currY += currVY;

            // Wall bounce simulation
            if (currX < player.width / 2) {
                currX = player.width / 2;
                currVX *= -0.5;
                points.push({ x: currX, y: currY, bounce: true });
            }
            if (currX > this.game.width - player.width / 2) {
                currX = this.game.width - player.width / 2;
                currVX *= -0.5;
                points.push({ x: currX, y: currY, bounce: true });
            }

            if (currY > this.game.height + 100) break;

            // Platform collision prediction
            if (currVY > 0) {
                let hit = false;
                const platformsNearby = this.game.world.platforms.filter(p => p.active && Math.abs(p.y - currY) < 50);
                for (const p of platformsNearby) {
                    if (currX > p.x && currX < p.x + p.width && currY > p.y - 10 && currY < p.y + p.height) {
                        points.push({ x: currX, y: currY, landing: true });
                        hit = true;
                        break;
                    }
                }
                if (hit) break;
            }
        }

        if (points.length > 1) {
            ctx.save();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
            ctx.stroke();

            // Decorative dots and indicators
            ctx.setLineDash([]);
            for (let i = 0; i < points.length; i += 8) {
                ctx.fillStyle = "#00ffcc";
                ctx.fillRect(points[i].x - 2, points[i].y - 2, 4, 4);
            }

            for (const p of points) {
                if (p.bounce) {
                    ctx.fillStyle = "#ffff00";
                    ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
                }
                if (p.landing) {
                    ctx.fillStyle = "#00ff00";
                    ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
                }
            }
            ctx.restore();
        }
    }
}
