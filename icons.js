// Definición de las categorías de marcadores para la campaña de Chult
// Estilo: Sello Sepia con Acento Botánico (Hexagonal con lado superior plano - 1/3 de hexágono)

export const PARTY_TOKEN_DATA = {
  id: "party",
  label: "Grupo de Aventureros",
  color: "#a31833", // Carmesí aventurero
  bgColor: "#fbf5e8",
  borderColor: "#472c19",
  svg: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 2l5 5-2 2-5-5V2h2z"/>
    <path d="M19 2l-5 5 2 2 5-5V2h-2z"/>
    <path d="M7 7l10 10M17 7L7 17"/>
    <path d="M4 22l4-4-2-2-4 4v2h2z"/>
    <path d="M20 22l-4-4 2-2 4 4v2h-2z"/>
  </svg>`
};

export const MARKER_TYPES = {
  // --- Terreno y Biomas ---
  forest: {
    id: "forest",
    label: "Bosque / Selva",
    color: "#2d5a27", // Verde musgo botánico
    bgColor: "#fbf5e8",
    borderColor: "#472c19",
    description: "Bosque denso, selva cerrada o vegetación frondosa de Chult",
    svg: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L5 10h4l-3 6h4v4h4v-4h4l-3-6h4L12 2z"/>
    </svg>`
  },
  river: {
    id: "river",
    label: "Río",
    color: "#1d6a8a", // Azul río añejo
    bgColor: "#fbf5e8",
    borderColor: "#472c19",
    description: "Ríos navegables (Soshenstar, Tiryki), rápidos, meandros o cascadas",
    svg: `<svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M3 7c4-3 7 3 11 0s5 3 7 0"/>
      <path d="M3 12c4-3 7 3 11 0s5 3 7 0"/>
      <path d="M3 17c4-3 7 3 11 0s5 3 7 0"/>
    </svg>`
  },
  plains: {
    id: "plains",
    label: "Pradera",
    color: "#5f7028", // Verde oliva sabana
    bgColor: "#fbf5e8",
    borderColor: "#472c19",
    description: "Praderas abiertas, pastizales, sabana o claros llanos",
    svg: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 21V11c0-3 3-5 6-7v17"/>
      <path d="M12 4c2 2 3 4 3 6-2 1-3 0-3-6z"/>
      <path d="M6 13c-2 2-3 4-3 6 2 1 3 0 3-6z"/>
      <path d="M12 11c2 2 3 4 3 6-2 1-3 0-3-6z"/>
    </svg>`
  },
  mountain: {
    id: "mountain",
    label: "Montaña",
    color: "#525964", // Gris roca mineral
    bgColor: "#fbf5e8",
    borderColor: "#472c19",
    description: "Cordilleras, picos escarpados o pasos montañosos",
    svg: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 20L10 5l5 9 2-3 5 9H2z"/>
      <path d="M10 5l2 9"/>
    </svg>`
  },
  hill: {
    id: "hill",
    label: "Colina",
    color: "#93561a", // Ocre arcilla / tierra
    bgColor: "#fbf5e8",
    borderColor: "#472c19",
    description: "Colinas onduladas, mesetas o terrenos elevados",
    svg: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M2 19c4-6 9-7 14-3 2 1 4 2 6 3"/>
      <path d="M10 14c3-4 6-5 10-1"/>
      <path d="M2 19h20"/>
    </svg>`
  },
  swamp: {
    id: "swamp",
    label: "Pantano",
    color: "#1b5e58", // Verde turquesa ciénaga
    bgColor: "#fbf5e8",
    borderColor: "#472c19",
    description: "Ciénagas, marismas pantanosas y aguas estancadas",
    svg: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 20V8c0-1.5 2-1.5 2 0v12"/>
      <path d="M14 20V5c0-1.5 2-1.5 2 0v15"/>
      <path d="M3 16c3-1 6 1 9 0s6-1 9 0"/>
      <path d="M3 20h18"/>
    </svg>`
  },

  // --- Puntos de Interés y Expedición ---
  camp: {
    id: "camp",
    label: "Campamento",
    color: "#286629", // Verde refugio seguro
    bgColor: "#fbf5e8",
    borderColor: "#472c19",
    description: "Lugar seguro, refugio, campamento base o descanso",
    svg: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 21L12 4l9 17H3z"/>
      <path d="M12 4v17"/>
      <path d="M9 21l3-7 3 7"/>
    </svg>`
  },
  ruins: {
    id: "ruins",
    label: "Ruinas / Templo",
    color: "#673385", // Púrpura antiguo
    bgColor: "#fbf5e8",
    borderColor: "#472c19",
    description: "Estructuras antiguas, templos caídos de Mezro u Omu, catacumbas",
    svg: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 21h18"/>
      <path d="M4 8h16"/>
      <path d="M12 2l9 6H3l9-6z"/>
      <path d="M6 8v13M10 8v13M14 8v13M18 8v7"/>
    </svg>`
  },
  danger: {
    id: "danger",
    label: "Peligro / Combate",
    color: "#8f1d1d", // Rojo óxido / peligro letal
    bgColor: "#fbf5e8",
    borderColor: "#472c19",
    description: "Dinosaurios, hordas no-muertas, emboscadas o zonas letales",
    svg: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a7 7 0 0 0-7 7c0 3 1.5 5 3 6v4h8v-4c1.5-1 3-3 3-6a7 7 0 0 0-7-7z"/>
      <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
      <circle cx="15" cy="9" r="1.5" fill="currentColor"/>
      <path d="M10 16v3M14 16v3"/>
    </svg>`
  },
  treasure: {
    id: "treasure",
    label: "Tesoro / Botín",
    color: "#9e700a", // Oro viejo
    bgColor: "#fbf5e8",
    borderColor: "#472c19",
    description: "Recursos valiosos, reliquias, alijos o cofres descubiertos",
    svg: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 8h18v12H3z"/>
      <path d="M3 12h18"/>
      <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
      <path d="M5 4h14l2 4H3l2-4z"/>
    </svg>`
  },
  settlement: {
    id: "settlement",
    label: "Asentamiento",
    color: "#1d4782", // Azul colonial heráldico
    bgColor: "#fbf5e8",
    borderColor: "#472c19",
    description: "Aldeas, campamentos de guías, tribus o puestos comerciales",
    svg: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 21V6l2-2h10l2 2v15"/>
      <path d="M5 6h14"/>
      <path d="M8 3v3M12 3v3M16 3v3"/>
      <path d="M9 21v-5a3 3 0 0 1 6 0v5"/>
      <circle cx="12" cy="10" r="1" fill="currentColor"/>
    </svg>`
  },
  water: {
    id: "water",
    label: "Agua / Costa",
    color: "#0f6c7a", // Cian marino profundo
    bgColor: "#fbf5e8",
    borderColor: "#472c19",
    description: "Bahías, costas marítimas, lagos o manantiales de agua limpia",
    svg: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <circle cx="12" cy="5" r="2.5"/>
      <path d="M12 7.5V20"/>
      <path d="M8 10h8"/>
      <path d="M5 14c0 4 3 6 7 6s7-2 7-6"/>
    </svg>`
  },
  mystery: {
    id: "mystery",
    label: "Misterio / Pista",
    color: "#ad4b0f", // Naranja terracota
    bgColor: "#fbf5e8",
    borderColor: "#472c19",
    description: "Enigmas sin resolver, advertencias o pistas de la Maldición de la Muerte",
    svg: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/>
      <circle cx="12" cy="12" r="3"/>
      <circle cx="12" cy="12" r="1" fill="currentColor"/>
    </svg>`
  },
  note: {
    id: "note",
    label: "Nota Libre",
    color: "#58524d", // Carbón vegetal sepia
    bgColor: "#fbf5e8",
    borderColor: "#472c19",
    description: "Anotaciones generales del grupo o diario de viaje",
    svg: `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/>
      <path d="M14 2v5h5"/>
      <path d="M8 12h8M8 16h5"/>
    </svg>`
  }
};

export function getMarkerType(typeId) {
  if (typeId === "party") {
    return PARTY_TOKEN_DATA;
  }
  return MARKER_TYPES[typeId] || MARKER_TYPES.note;
}

// Renderiza el glifo SVG con el color botánico correspondiente
export function renderMarkerIconSvg(typeId, size = 18) {
  const type = getMarkerType(typeId);
  return `
    <span class="botanical-svg-wrap" style="color: ${type.color}; width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center;">
      ${type.svg}
    </span>
  `;
}
