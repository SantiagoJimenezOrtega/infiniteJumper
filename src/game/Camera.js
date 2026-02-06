export class Camera {
    constructor(game) {
        this.game = game;
        this.y = 0;
    }

    update() {
        const targetY = this.game.player.y - this.game.height / 2;
        this.y += (targetY - this.y) * 0.1;

        // Prevent showing below ground
        if (this.y > 0) this.y = 0;
    }
}
