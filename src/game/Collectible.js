import { POWER_UPS } from './Constants.js';

export class Collectible {
    constructor(x, y, type = "water") {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.active = true;
        this.type = type; // "water" or powerup id
        this.floatOffset = Math.random() * Math.PI * 2;
    }

    update(dt) {
        this.floatOffset += dt * 0.1;
    }

    draw(ctx) {
        if (!this.active) return;

        const bounce = Math.sin(this.floatOffset) * 8;
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2 + bounce;

        ctx.save();

        if (this.type === "water") {
            ctx.fillStyle = "#4CC9F0";
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#4CC9F0";

            // Draw drop shape
            ctx.beginPath();
            ctx.arc(centerX, centerY + 8, 10, 0, Math.PI, false);
            ctx.lineTo(centerX, centerY - 15);
            ctx.closePath();
            ctx.fill();

            // Highlight
            ctx.fillStyle = "#ffffff";
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(centerX - 4, centerY + 4, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // It's a power-up
            const p = Object.values(POWER_UPS).find(pu => pu.id === this.type);
            if (p) {
                // Glow ring
                ctx.beginPath();
                ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 3;
                ctx.shadowBlur = 15;
                ctx.shadowColor = p.color;
                ctx.stroke();

                // Symbol (Emoji)
                ctx.font = "24px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.shadowBlur = 5;
                ctx.fillText(p.emoji, centerX, centerY);
            }
        }

        ctx.restore();
    }
}
