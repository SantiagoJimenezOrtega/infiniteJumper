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
        description: "DIFICULTAD: BAJA. Equilibrada e ideal para empezar."
    },
    {
        id: "flea",
        name: "Pulga",
        emoji: "🐜",
        price: 200,
        color: "#cc6600",
        stats: {
            jumpForce: 25,
            jumpAngleX: 0.25,
            gravity: 0.5,
            chargeSpeed: 3.5,
            display: { force: 95, weight: 10, speed: 100, agility: 20 }
        },
        description: "DIFICULTAD: ALTA. Explosión pura, control muy errático."
    },
    {
        id: "goat",
        name: "Cabra",
        emoji: "🐐",
        price: 800,
        color: "#aaaaaa",
        stats: {
            jumpForce: 20,
            jumpAngleX: 0.65,
            gravity: 1.8,
            chargeSpeed: 0.9,
            display: { force: 70, weight: 95, speed: 30, agility: 50 }
        },
        description: "DIFICULTAD: MEDIA. Cae pesado para aterrizajes quirúrgicos."
    },
    {
        id: "rabbit",
        name: "Conejo",
        emoji: "🐇",
        price: 1500,
        color: "#ffffff",
        stats: {
            jumpForce: 16.5,
            jumpAngleX: 0.95,
            gravity: 1.1,
            chargeSpeed: 1.6,
            display: { force: 45, weight: 60, speed: 85, agility: 70 }
        },
        description: "DIFICULTAD: MEDIA. Agilidad horizontal pura."
    },
    {
        id: "grasshopper",
        name: "Saltamontes",
        emoji: "🦗",
        price: 3500,
        color: "#00cc00",
        stats: {
            jumpForce: 23,
            jumpAngleX: 1.2,
            gravity: 0.7,
            chargeSpeed: 1.3,
            display: { force: 80, weight: 25, speed: 70, agility: 60 }
        },
        description: "VENTAJA: Gran alcance. Facilita los saltos largos."
    },
    {
        id: "squirrel",
        name: "Ardilla",
        emoji: "🐿️",
        price: 7000,
        color: "#CD853F",
        stats: {
            jumpForce: 16,
            jumpAngleX: 0.8,
            gravity: 0.35,
            chargeSpeed: 2.0,
            display: { force: 30, weight: 15, speed: 90, agility: 80 }
        },
        description: "VENTAJA: Planeo. Casi no le afecta la gravedad."
    },
    {
        id: "cat",
        name: "Gato",
        emoji: "🐱",
        price: 10000,
        color: "#FF8C00",
        stats: {
            jumpForce: 21,
            jumpAngleX: 0.75,
            gravity: 0.9,
            chargeSpeed: 1.2,
            display: { force: 65, weight: 40, speed: 60, agility: 95 }
        },
        description: "VENTAJA: Control total. La maniobrabilidad definitiva."
    },
    {
        id: "kangaroo",
        name: "Canguro",
        emoji: "🦘",
        price: 15000,
        color: "#D2691E",
        stats: {
            jumpForce: 28,
            jumpAngleX: 0.85,
            gravity: 1.4,
            chargeSpeed: 0.8,
            display: { force: 100, weight: 80, speed: 20, agility: 40 }
        },
        description: "VENTAJA: Super Potencia. El más fuerte del juego."
    },
    {
        id: "eagle",
        name: "Águila",
        emoji: "🦅",
        price: 25000,
        color: "#8B4513",
        stats: {
            jumpForce: 15,
            jumpAngleX: 0.5,
            gravity: 0.15,
            chargeSpeed: 2.8,
            display: { force: 20, weight: 5, speed: 95, agility: 100 }
        },
        description: "GOD MODE. Vuelo casi infinito en el cielo."
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
    SHIELD: {
        id: "shield",
        name: "Escudo Burbuja",
        emoji: "🫧",
        duration: 15000,
        color: "#33ccff",
        description: "Te protege de un impacto o caída mortal. ¡Segunda oportunidad!"
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
    TIME: {
        id: "time",
        name: "Reloj Vital",
        emoji: "⏳",
        duration: 8000,
        color: "#9933ff",
        description: "Ralentiza el tiempo. Precisión quirúrgica para tus saltos."
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
