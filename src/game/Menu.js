import { SHOP_ANIMALS } from './Constants.js';

export class Menu {
    constructor(game) {
        this.game = game;
        this.active = true;

        this.screens = {
            main: document.getElementById("main-menu"),
            difficulty: document.getElementById("difficulty-menu"),
            shop: document.getElementById("shop-menu"),
            victory: document.getElementById("victory-screen")
        };

        this.buttons = {
            continue: document.getElementById("btn-continue"),
            newGame: document.getElementById("btn-new-game"),
            shop: document.getElementById("btn-shop"),
            diffAssisted: document.getElementById("btn-diff-assisted"),
            diffExtreme: document.getElementById("btn-diff-extreme"),
            diffBack: document.getElementById("btn-diff-back"),
            shopBack: document.getElementById("btn-shop-back"),
            victoryContinue: document.getElementById("btn-victory-continue")
        };

        this.shopGrid = document.getElementById("shop-grid");
        this.shopWallet = document.getElementById("shop-wallet-amount");
        this.shopDetails = document.getElementById("shop-details");

        this.wallet = parseInt(localStorage.getItem("walletDrops") || "0");
        this.unlockedAnimals = JSON.parse(localStorage.getItem("unlockedAnimals") || '["frog"]');
        this.equippedAnimal = localStorage.getItem("equippedAnimal") || "frog";
        this.selectedAnimalId = this.equippedAnimal;

        this.checkSave();
        this.bindEvents();
        this.showScreen("main");
    }

    checkSave() {
        this.savedDifficulty = null;
        if (localStorage.getItem("gameState_extreme")) this.savedDifficulty = "extreme";
        else if (localStorage.getItem("gameState_assisted")) this.savedDifficulty = "assisted";

        if (this.savedDifficulty) {
            this.buttons.continue.style.display = "block";
            this.buttons.continue.innerText = `CONTINUAR (${this.savedDifficulty.toUpperCase()})`;
        } else {
            this.buttons.continue.style.display = "none";
        }
    }

    bindEvents() {
        const addClick = (btn, action) => {
            if (!btn) return;
            btn.addEventListener("click", action);
            btn.addEventListener("touchstart", e => { e.preventDefault(); action(e); }, { passive: false });
        };

        addClick(this.buttons.continue, () => {
            this.hideAll();
            this.game.continueGame(this.savedDifficulty);
        });

        addClick(this.buttons.newGame, () => {
            this.showScreen("difficulty");
        });

        addClick(this.buttons.shop, () => {
            this.selectedAnimalId = this.equippedAnimal;
            this.updateShopUI();
            this.showScreen("shop");
        });

        addClick(this.buttons.diffAssisted, () => this.startGame("assisted"));
        addClick(this.buttons.diffExtreme, () => this.startGame("extreme"));
        addClick(this.buttons.diffBack, () => this.showScreen("main"));
        addClick(this.buttons.shopBack, () => this.showScreen("main"));

        addClick(this.buttons.victoryContinue, () => {
            this.screens.victory.style.display = "none";
            this.showScreen("main");
            this.game.resetGame();
        });
    }

    startGame(diff) {
        this.hideAll();
        this.game.startNewGame(diff);
    }

    showScreen(name) {
        Object.values(this.screens).forEach(s => s.style.display = "none");
        if (this.screens[name]) {
            this.screens[name].style.display = "flex";
            this.active = true;
        }
        if (name === "main") this.checkSave();
    }

    hideAll() {
        Object.values(this.screens).forEach(s => s.style.display = "none");
        this.active = false;
    }

    showVictory() {
        this.screens.victory.style.display = "flex";
        this.active = true;
    }

    updateShopUI() {
        this.wallet = parseInt(localStorage.getItem("walletDrops") || "0");
        this.shopWallet.innerText = this.wallet;
        this.shopGrid.innerHTML = "";

        SHOP_ANIMALS.forEach(animal => {
            const unlocked = this.unlockedAnimals.includes(animal.id);
            const equipped = this.equippedAnimal === animal.id;
            const selected = this.selectedAnimalId === animal.id;

            const item = document.createElement("div");
            item.className = `shop-item ${equipped ? 'equipped' : ''} ${selected ? 'selected' : ''}`;
            item.innerHTML = `
                <div class="animal-emoji">${animal.emoji}</div>
                ${equipped ? '<div class="equipped-badge">E</div>' : ''}
            `;

            const handleSelect = () => {
                this.selectedAnimalId = animal.id;
                this.updateShopUI();
            };
            item.addEventListener("click", handleSelect);
            item.addEventListener("touchstart", e => { e.preventDefault(); handleSelect(); }, { passive: false });

            this.shopGrid.appendChild(item);
        });

        this.updateDetailsPanel();
    }

    updateDetailsPanel() {
        const animal = SHOP_ANIMALS.find(a => a.id === this.selectedAnimalId);
        if (!animal) return;

        const unlocked = this.unlockedAnimals.includes(animal.id);
        const equipped = this.equippedAnimal === animal.id;
        const canAfford = this.wallet >= animal.price;
        const d = animal.stats.display;

        this.shopDetails.innerHTML = `
            <div class="details-card">
                <div class="details-emoji">${animal.emoji}</div>
                <h3 class="details-name">${animal.name}</h3>
                <p class="details-desc">${animal.description}</p>
                
                <div class="details-stats">
                    <div class="stat-row">
                        <span class="stat-label">FUERZA</span>
                        <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${d.force}%"></div></div>
                        <span class="stat-value">${d.force}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">PESO</span>
                        <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${d.weight}%"></div></div>
                        <span class="stat-value">${d.weight}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">AGILIDAD</span>
                        <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${d.agility}%"></div></div>
                        <span class="stat-value">${d.agility}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">CARGA</span>
                        <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${d.speed}%"></div></div>
                        <span class="stat-value">${d.speed}</span>
                    </div>
                </div>

                <div class="details-actions">
                    <button id="btn-buy-equip" class="menu-btn ${unlocked ? 'secondary' : canAfford ? 'primary' : 'danger'}">
                        ${unlocked ? (equipped ? "EQUIPADO" : "EQUIPAR") : `COMPRAR 💧 ${animal.price}`}
                    </button>
                </div>
            </div>
        `;

        const btn = document.getElementById("btn-buy-equip");
        if (btn) {
            btn.addEventListener("click", () => this.handleActionClick(animal));
            btn.addEventListener("touchstart", e => { e.preventDefault(); this.handleActionClick(animal); }, { passive: false });
        }
    }

    handleActionClick(animal) {
        if (this.unlockedAnimals.includes(animal.id)) {
            this.equippedAnimal = animal.id;
            localStorage.setItem("equippedAnimal", this.equippedAnimal);
            this.updateShopUI();
        } else if (this.wallet >= animal.price) {
            this.wallet -= animal.price;
            this.unlockedAnimals.push(animal.id);
            this.equippedAnimal = animal.id;
            localStorage.setItem("walletDrops", this.wallet);
            localStorage.setItem("unlockedAnimals", JSON.stringify(this.unlockedAnimals));
            localStorage.setItem("equippedAnimal", this.equippedAnimal);
            this.game.soundManager.playCollect();
            this.updateShopUI();
        }
    }
}
