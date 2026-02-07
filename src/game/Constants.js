export const PHYSICS = {
    GRAVITY: 0.6,
    FRICTION: 0.8,
    AIR_RESISTANCE: 0.99,
    TERMINAL_VELOCITY: 20
};

export const PLAYER_CONFIG = {
    SIZE: 30,
    MAX_CHARGE: 1000,
    MIN_JUMP_POWER: 8,
    JUMP_Y_RATIO: 0.8
};

export const WORLD_CONFIG = {
    PLATFORM_HEIGHT: 20,
    PLATFORM_WIDTH_MIN: 60,
    PLATFORM_WIDTH_MAX: 150,
    SPAWN_GAP_MIN: 80,
    SPAWN_GAP_MAX: 180
};

export const BIOMES = [
    { height: 0, name: "Forest", colorTop: "#87CEEB", colorBottom: "#90EE90" },
    { height: 3000, name: "Sky", colorTop: "#1E90FF", colorBottom: "#87CEEB" },
    { height: 6500, name: "Space", colorTop: "#000000", colorBottom: "#4B0082" }
];

export const SHOP_ANIMALS = [
    {
        id: "frog",
        name: "Rana",
        emoji: "🐸",
        price: 0,
        color: "#44ff44",
        stats: {
            jumpForce: 18.5,
            jumpAngleX: 0.6,
            gravity: 1.0,
            chargeSpeed: 1.0,
            display: { force: 60, weight: 50, speed: 50, agility: 40 }
        },
        description: "EQUILIBRADO: Ideal para empezar. Saltos precisos y control estable."
    },
    {
        id: "rabbit",
        name: "Conejo",
        emoji: "🐇",
        price: 500,
        color: "#ffffff",
        stats: {
            jumpForce: 17.0,
            jumpAngleX: 0.9,
            gravity: 0.9,
            chargeSpeed: 1.5,
            display: { force: 50, weight: 40, speed: 80, agility: 70 }
        },
        description: "AGILIDAD: Carga más rápido y tiene mejor alcance horizontal."
    },
    {
        id: "kangaroo",
        name: "Canguro",
        emoji: "🦘",
        price: 2000,
        color: "#D2691E",
        stats: {
            jumpForce: 23.0,
            jumpAngleX: 0.7,
            gravity: 1.3,
            chargeSpeed: 0.8,
            display: { force: 90, weight: 80, speed: 30, agility: 50 }
        },
        description: "POTENCIA: Salto vertical masivo pero cae con mucha fuerza."
    }
];

export const POWER_UPS = {
    MAGNET: {
        id: "magnet",
        name: "Imán de Gotas",
        emoji: "🧲",
        duration: 10000,
        color: "#ff3333",
        description: "¡Atrae todas las gotas de agua cercanas automáticamente!"
    },
    JETPACK: {
        id: "jetpack",
        name: "Jetpack de Vapor",
        emoji: "💨",
        duration: 3000,
        color: "#ffffff",
        description: "Impulso vertical masivo. ¡Vuela sobre los obstáculos!"
    },
    BOOTS: {
        id: "boots",
        name: "Botas Gravitatorias",
        emoji: "👟",
        duration: 12000,
        color: "#ffcc00",
        description: "Reduce la gravedad a la mitad. ¡Saltos más largos y seguros!"
    },
    MULTI: {
        id: "multi",
        name: "Multiplicador x2",
        emoji: "💎",
        duration: 20000,
        color: "#00ffcc",
        description: "¡Todas las gotas recolectadas valen el doble por tiempo limitado!"
    }
};
