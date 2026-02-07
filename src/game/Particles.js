export class Particles {
    constructor(game) {
        this.game = game;
        this.particles = [];
    }

    spawn(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1,
                color,
                type: "normal"
            });
        }
    }

    spawnLeaf() {
        this.particles.push({
            x: Math.random() * this.game.width,
            y: this.game.camera.y - 10,
            vx: (Math.random() - 0.5) * 2 + (this.game.world.wind * 5),
            vy: Math.random() * 2 + 1,
            life: 2,
            type: "leaf",
            color: Math.random() > 0.5 ? "#228B22" : "#DAA520",
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.1
        });
    }

    spawnCloud() {
        this.particles.push({
            x: this.game.world.wind > 0 ? -50 : this.game.width + 50,
            y: this.game.camera.y + Math.random() * this.game.height,
            vx: (this.game.world.wind || 0.5) * 2,
            vy: 0,
            life: 4,
            type: "cloud",
            color: "#ffffff",
            size: Math.random() * 20 + 10
        });
    }

    spawnStar() {
        this.particles.push({
            x: Math.random() * this.game.width,
            y: this.game.camera.y + Math.random() * this.game.height,
            vx: 0, vy: 0,
            life: 1.5,
            type: "star",
            color: "#ffffaa",
            size: Math.random() * 2 + 1
        });
    }

    update() {
        // Wind particles
        if (Math.abs(this.game.world.wind) > 0.2 && Math.random() < 0.3) {
            this.particles.push({
                x: Math.random() * this.game.width,
                y: this.game.camera.y + Math.random() * this.game.height,
                vx: this.game.world.wind * 15,
                vy: (Math.random() - 0.5) * 2,
                life: 1,
                type: "wind",
                color: "#ffffff"
            });
        }

        // Biome specific particles
        const height = Math.max(0, Math.floor((this.game.height - this.game.player.y - this.game.player.height) / 10));
        if (height < 500) {
            if (Math.random() < 0.05) this.spawnLeaf();
        } else if (height < 1500) {
            if (Math.random() < 0.01) this.spawnCloud();
        } else {
            if (Math.random() < 0.1) this.spawnStar();
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (p.type === "leaf") {
                p.x += p.vx; p.y += p.vy;
                p.rotation += p.rotSpeed;
                p.life -= 0.01;
            } else if (p.type === "cloud") {
                p.x += p.vx;
                p.life -= 0.005;
            } else if (p.type === "star") {
                p.life -= 0.02;
            } else {
                p.x += p.vx; p.y += p.vy;
                p.life -= 0.03;
            }
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.life;

            if (p.type === "wind") {
                ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 3, p.y);
                ctx.stroke();
            } else if (p.type === "leaf") {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.fillRect(-3, -3, 6, 6);
            } else if (p.type === "cloud") {
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
            } else if (p.type === "star") {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            } else {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, 4, 4);
            }
            ctx.restore();
        }
    }
}
