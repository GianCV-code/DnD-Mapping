// Administrador de almacenamiento local con preparación para Firebase
const STORAGE_KEY = "chult_campaign_markers_v1";
const PARTY_KEY = "chult_campaign_party_v1";
const ROUTE_KEY = "chult_campaign_route_v1";

let listeners = [];
let markersCache = null;

let partyListeners = [];
let partyCache = null;

let routeListeners = [];
let routeCache = null;

// --- Marcadores ---
export function getMarkers() {
  if (markersCache !== null) {
    return markersCache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    markersCache = raw ? JSON.parse(raw) : getInitialSeedMarkers();
  } catch (err) {
    console.error("Error leyendo localStorage:", err);
    markersCache = [];
  }
  return markersCache;
}

export function subscribeMarkers(callback) {
  listeners.push(callback);
  callback(getMarkers());
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

function notifyListeners() {
  const data = getMarkers();
  listeners.forEach(cb => {
    try {
      cb(data);
    } catch (e) {
      console.error("Error en listener de marcadores:", e);
    }
  });
}

export function saveMarker(markerData) {
  const markers = getMarkers();
  const now = Date.now();

  if (!markerData.id) {
    const newMarker = {
      ...markerData,
      id: "mk_" + now + "_" + Math.random().toString(36).substring(2, 7),
      createdAt: now,
      updatedAt: now
    };
    markers.push(newMarker);
  } else {
    const index = markers.findIndex(m => m.id === markerData.id);
    if (index !== -1) {
      markers[index] = {
        ...markers[index],
        ...markerData,
        updatedAt: now
      };
    } else {
      markers.push({ ...markerData, updatedAt: now });
    }
  }

  persistMarkers(markers);
  notifyListeners();
  return markerData;
}

export function deleteMarker(markerId) {
  let markers = getMarkers();
  markers = markers.filter(m => m.id !== markerId);
  persistMarkers(markers);
  notifyListeners();
}

function persistMarkers(markers) {
  markersCache = markers;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(markers));
  } catch (err) {
    console.error("Error guardando en localStorage:", err);
  }
}

// --- Posición del Grupo de Aventureros ---
export function getPartyPosition() {
  if (partyCache !== null) return partyCache;
  try {
    const raw = localStorage.getItem(PARTY_KEY);
    partyCache = raw ? JSON.parse(raw) : {
      x: 95.8,
      y: 12.2,
      note: "Campamento base en Puerto Nyanzaru antes de adentrarse en la selva.",
      updatedAt: Date.now()
    };
  } catch (err) {
    partyCache = { x: 95.8, y: 12.2, note: "", updatedAt: Date.now() };
  }
  return partyCache;
}

export function subscribeParty(callback) {
  partyListeners.push(callback);
  callback(getPartyPosition());
  return () => {
    partyListeners = partyListeners.filter(cb => cb !== callback);
  };
}

export function savePartyPosition(posData) {
  const current = getPartyPosition();
  partyCache = {
    ...current,
    ...posData,
    updatedAt: Date.now()
  };
  try {
    localStorage.setItem(PARTY_KEY, JSON.stringify(partyCache));
  } catch (err) {
    console.error("Error guardando posición del grupo:", err);
  }
  partyListeners.forEach(cb => {
    try { cb(partyCache); } catch (e) { console.error(e); }
  });
  return partyCache;
}

// --- Ruta / Camino de Expedición ---
export function getRoute() {
  if (routeCache !== null) return routeCache;
  try {
    const raw = localStorage.getItem(ROUTE_KEY);
    routeCache = raw ? JSON.parse(raw) : null;
  } catch (err) {
    routeCache = null;
  }
  return routeCache;
}

export function subscribeRoute(callback) {
  routeListeners.push(callback);
  callback(getRoute());
  return () => {
    routeListeners = routeListeners.filter(cb => cb !== callback);
  };
}

export function saveRoute(routeData) {
  routeCache = routeData;
  try {
    if (routeData) {
      localStorage.setItem(ROUTE_KEY, JSON.stringify(routeData));
    } else {
      localStorage.removeItem(ROUTE_KEY);
    }
  } catch (err) {
    console.error("Error guardando ruta:", err);
  }
  routeListeners.forEach(cb => {
    try { cb(routeCache); } catch (e) { console.error(e); }
  });
  return routeCache;
}

export function clearRoute() {
  return saveRoute(null);
}

// --- Copia de Seguridad ---
export function exportBackup() {
  const backupObject = {
    version: 3,
    date: new Date().toISOString(),
    markers: getMarkers(),
    party: getPartyPosition(),
    route: getRoute()
  };
  const data = JSON.stringify(backupObject, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chult_campana_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          // Versión previa simple (solo array de marcadores)
          persistMarkers(imported);
          notifyListeners();
          resolve(imported.length);
        } else if (imported && Array.isArray(imported.markers)) {
          // Versión 2 o 3 con grupo, ruta y marcadores
          persistMarkers(imported.markers);
          notifyListeners();
          if (imported.party) {
            savePartyPosition(imported.party);
          }
          if (imported.route !== undefined) {
            saveRoute(imported.route);
          }
          resolve(imported.markers.length);
        } else {
          reject(new Error("El archivo no tiene el formato de campaña esperado."));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// Marcadores iniciales de ejemplo para que la app no inicie vacía en Port Nyanzaru
function getInitialSeedMarkers() {
  return [
    {
      id: "mk_port_nyanzaru",
      icon: "settlement",
      title: "Puerto Nyanzaru",
      notes: "La gran ciudad amurallada de Chult. Gobernada por los 7 Príncipes Mercantes. Punto de partida de nuestra expedición.",
      day: "Día 1",
      resolved: false,
      x: 96.5,
      y: 11.8,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: "mk_bay_chult",
      icon: "water",
      title: "Bahía de Chult",
      notes: "Aguas profundas custodiadas por canoas de guerra y el dios dragón Aremag.",
      day: "Día 1",
      resolved: true,
      x: 84.2,
      y: 4.8,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: "mk_eastern_mountains",
      icon: "mountain",
      title: "Montañas Orientales",
      notes: "Picos rocosos que descienden hacia la costa. Nidos de pterafolk y gargantas estrechas.",
      day: "Día 2",
      resolved: false,
      x: 96.8,
      y: 25.5,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: "mk_dense_jungle",
      icon: "forest",
      title: "Selva Virgen de Chult",
      notes: "Densa vegetación con doseles impenetrables. El calor y la humedad exigen constante provisión de agua limpia.",
      day: "Día 3",
      resolved: false,
      x: 78.5,
      y: 28.0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];
}
