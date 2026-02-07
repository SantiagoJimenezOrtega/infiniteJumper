import { BIOMES } from './Constants.js';

export class Background {
    constructor(game) {
        this.game = game;
        this.particles = [];
        const count = 30; // Reduced from 60
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        return {
            x: Math.random() * this.game.width,
            y: Math.random() * this.game.height,
            size: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            alpha: Math.random() * 0.5 + 0.1,
            phase: Math.random() * Math.PI * 2
        };
    }

    update(dt) {
        this.particles.forEach(p => {
            p.phase += 0.02 * dt;
            p.y += (p.speedY + Math.sin(p.phase) * 0.2) * dt;
            p.x += (p.speedX + Math.cos(p.phase) * 0.2) * dt;

            if (p.y > this.game.height) p.y = 0;
            if (p.y < 0) p.y = this.game.height;
            if (p.x > this.game.width) p.x = 0;
            if (p.x < 0) p.x = this.game.width;
        });
    }

    draw(ctx) {
        const heightMeters = Math.max(0, Math.floor((this.game.height - this.game.player.y - this.game.player.height) / 10));

        // Find current and next biome for transition
        let currentBiome = BIOMES[0];
        let nextBiome = BIOMES[0];
        let transition = 0;

        for (let i = 0; i < BIOMES.length; i++) {
            if (heightMeters >= BIOMES[i].height) {
                currentBiome = BIOMES[i];
                if (i < BIOMES.length - 1) {
                    nextBiome = BIOMES[i + 1];
                    const range = nextBiome.height - currentBiome.height;
                    transition = (heightMeters - currentBiome.height) / range;
                    transition = Math.min(Math.max(transition, 0), 1);
                } else {
                    nextBiome = currentBiome;
                    transition = 0;
                }
            }
        }

        const topColor = this.lerpColor(currentBiome.colorTop, nextBiome.colorTop, transition);
        const bottomColor = this.lerpColor(currentBiome.colorBottom, nextBiome.colorBottom, transition);

        const gradient = ctx.createLinearGradient(0, 0, 0, this.game.height);
        gradient.addColorStop(0, topColor);
        gradient.addColorStop(1, bottomColor);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.game.width, this.game.height);

        // Ambience particles
        this.particles.forEach(p => {
            const alpha = p.alpha * (0.6 + Math.sin(p.phase) * 0.4);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        });
    }

    lerpColor(a, b, t) {
        const ah = parseInt(a.replace(/#/g, ''), 16),
            ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
            bh = parseInt(b.replace(/#/g, ''), 16),
            br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
            rr = ar + t * (br - ar),
            rg = ag + t * (bg - ag),
            rb = ab + t * (bb - ab);
        return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + (rb | 0)).toString(16).slice(1);
    }
}
