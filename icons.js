// Definición de las 12 categorías de marcadores para la campaña de Chult
export const MARKER_TYPES = {
  // --- Terreno y Biomas ---
  forest: {
    id: "forest",
    label: "Bosque",
    emoji: "🌲",
    color: "#16a34a", // Verde bosque
    bgColor: "rgba(22, 163, 74, 0.25)",
    borderColor: "#4ade80",
    description: "Bosque denso, selva cerrada o vegetación frondosa"
  },
  river: {
    id: "river",
    label: "Río",
    emoji: "🌊",
    color: "#0284c7", // Azul río navegable
    bgColor: "rgba(2, 132, 199, 0.25)",
    borderColor: "#38bdf8",
    description: "Ríos navegables, afluentes, rápidos, meandros o cascadas"
  },
  plains: {
    id: "plains",
    label: "Pradera",
    emoji: "🌾",
    color: "#84cc16", // Verde pradera / sabana
    bgColor: "rgba(132, 204, 22, 0.25)",
    borderColor: "#a3e635",
    description: "Praderas abiertas, pastizales, sabana o claros llanos"
  },
  mountain: {
    id: "mountain",
    label: "Montaña",
    emoji: "⛰️",
    color: "#94a3b8", // Gris roca
    bgColor: "rgba(148, 163, 184, 0.25)",
    borderColor: "#cbd5e1",
    description: "Cordilleras, picos escarpados o pasos montañosos"
  },
  hill: {
    id: "hill",
    label: "Colina",
    emoji: "🌄",
    color: "#d97706", // Ámbar tierra
    bgColor: "rgba(217, 119, 6, 0.25)",
    borderColor: "#f59e0b",
    description: "Colinas onduladas, mesetas o terrenos elevados"
  },
  swamp: {
    id: "swamp",
    label: "Pantano",
    emoji: "🐊",
    color: "#0d9488", // Verde azulado ciénaga
    bgColor: "rgba(13, 148, 136, 0.25)",
    borderColor: "#2dd4bf",
    description: "Ciénagas, marismas pantanosas y aguas estancadas"
  },

  // --- Puntos de Interés y Expedición ---
  camp: {
    id: "camp",
    label: "Campamento",
    emoji: "⛺",
    color: "#22c55e", // Verde esmeralda
    bgColor: "rgba(34, 197, 94, 0.25)",
    borderColor: "#4ade80",
    description: "Lugar seguro, refugio o base de descanso"
  },
  ruins: {
    id: "ruins",
    label: "Ruinas / Mazmorra",
    emoji: "🏛️",
    color: "#a855f7", // Púrpura místico
    bgColor: "rgba(168, 85, 247, 0.25)",
    borderColor: "#c084fc",
    description: "Estructura antigua, templos, tumbas o subterráneos"
  },
  danger: {
    id: "danger",
    label: "Peligro / Combate",
    emoji: "💀",
    color: "#ef4444", // Rojo carmesí
    bgColor: "rgba(239, 68, 68, 0.25)",
    borderColor: "#f87171",
    description: "Bestias, monstruos, emboscadas o zonas letales"
  },
  treasure: {
    id: "treasure",
    label: "Tesoro / Botín",
    emoji: "💎",
    color: "#eab308", // Oro brillante
    bgColor: "rgba(234, 179, 8, 0.25)",
    borderColor: "#facc15",
    description: "Recursos valiosos, reliquias o tesoros descubiertos"
  },
  settlement: {
    id: "settlement",
    label: "Asentamiento / Aliado",
    emoji: "🏰",
    color: "#3b82f6", // Azul heráldico
    bgColor: "rgba(59, 130, 246, 0.25)",
    borderColor: "#60a5fa",
    description: "Aldeas, campamentos de guías, tribus o puestos comerciales"
  },
  water: {
    id: "water",
    label: "Agua / Costa",
    emoji: "💧",
    color: "#06b6d4", // Cian agua
    bgColor: "rgba(6, 182, 212, 0.25)",
    borderColor: "#22d3ee",
    description: "Bahías, costas marítimas, lagos o manantiales"
  },
  mystery: {
    id: "mystery",
    label: "Misterio / Pista",
    emoji: "❓",
    color: "#f97316", // Naranja misterio
    bgColor: "rgba(249, 115, 22, 0.25)",
    borderColor: "#fb923c",
    description: "Enigmas sin resolver, advertencias o pistas de la maldición"
  },
  note: {
    id: "note",
    label: "Nota Libre",
    emoji: "📝",
    color: "#cbd5e1", // Pergamino claro
    bgColor: "rgba(203, 213, 225, 0.25)",
    borderColor: "#f1f5f9",
    description: "Anotaciones generales del grupo o diario de viaje"
  }
};

export function getMarkerType(typeId) {
  return MARKER_TYPES[typeId] || MARKER_TYPES.note;
}
