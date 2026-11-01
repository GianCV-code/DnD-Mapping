// Administrador de almacenamiento con sincronización en tiempo real vía Firebase Cloud Firestore
// y respaldo offline automático en localStorage

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const STORAGE_KEY = "chult_campaign_markers_v1";
const PARTY_KEY = "chult_campaign_party_v1";
const ROUTE_KEY = "chult_campaign_route_v1";

// Configuración de Firebase para el proyecto existente: dnd-logros-campana-2026
const firebaseConfig = {
  projectId: "dnd-logros-campana-2026",
  appId: "1:325350183699:web:ae13d228b43f30fe7a00e6",
  storageBucket: "dnd-logros-campana-2026.firebasestorage.app",
  apiKey: "AIzaSyCw9XVgRGuRQryjOiVv3c-kJGMSRgFGr2E",
  authDomain: "dnd-logros-campana-2026.firebaseapp.com",
  messagingSenderId: "325350183699",
  measurementId: "G-83PZWF1WPM"
};

let listeners = [];
let markersCache = null;

let partyListeners = [];
let partyCache = null;

let routeListeners = [];
let routeCache = null;

let syncStatus = "connecting"; // 'online' | 'offline' | 'syncing'
let syncListeners = [];

let isRemoteUpdate = false;
let db = null;
let campaignDocRef = null;
let syncDebounceTimer = null;

// Inicialización de Firebase
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  campaignDocRef = doc(db, "chult_campaign", "main_state");

  // Escucha en tiempo real (WebSockets / Long-Polling nativo de Firestore)
  onSnapshot(campaignDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      isRemoteUpdate = true;

      // 1. Sincronizar Marcadores
      if (Array.isArray(data.markers)) {
        markersCache = data.markers;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.markers));
        } catch (e) {}
        notifyListeners();
      }

      // 2. Sincronizar Grupo
      if (data.party) {
        partyCache = data.party;
        try {
          localStorage.setItem(PARTY_KEY, JSON.stringify(data.party));
        } catch (e) {}
        notifyPartyListeners();
      }

      // 3. Sincronizar Ruta
      if (data.route !== undefined) {
        routeCache = data.route;
        try {
          if (data.route) {
            localStorage.setItem(ROUTE_KEY, JSON.stringify(data.route));
          } else {
            localStorage.removeItem(ROUTE_KEY);
          }
        } catch (e) {}
        notifyRouteListeners();
      }

      isRemoteUpdate = false;
      updateSyncStatus("online");
    } else {
      // El documento en la nube aún no existe; subimos el estado inicial
      pushStateToCloud();
      updateSyncStatus("online");
    }
  }, (error) => {
    console.warn("Aviso Firebase Firestore (usando respaldo local):", error.message);
    updateSyncStatus("offline");
  });
} catch (err) {
  console.warn("Aviso inicialización Firebase (usando respaldo local):", err);
  updateSyncStatus("offline");
}

// Envío diferido a Firestore (Debounce) para optimizar escrituras
function pushStateToCloud() {
  if (!db || !campaignDocRef || isRemoteUpdate) return;
  updateSyncStatus("syncing");

  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  syncDebounceTimer = setTimeout(async () => {
    try {
      const payload = {
        markers: getMarkers(),
        party: getPartyPosition(),
        route: getRoute(),
        updatedAt: Date.now()
      };
      await setDoc(campaignDocRef, payload, { merge: true });
      updateSyncStatus("online");
    } catch (err) {
      console.warn("Error guardando en Firestore:", err);
      updateSyncStatus("offline");
    }
  }, 300);
}

// Notificador de Estado de Sincronización
export function subscribeSyncStatus(callback) {
  syncListeners.push(callback);
  callback(syncStatus);
  return () => {
    syncListeners = syncListeners.filter(cb => cb !== callback);
  };
}

function updateSyncStatus(status) {
  if (syncStatus === status) return;
  syncStatus = status;
  syncListeners.forEach(cb => {
    try { cb(syncStatus); } catch (e) { console.error(e); }
  });
}

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
    markersCache = getInitialSeedMarkers();
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
  pushStateToCloud();
  return markerData;
}

export function deleteMarker(markerId) {
  let markers = getMarkers();
  markers = markers.filter(m => m.id !== markerId);
  persistMarkers(markers);
  notifyListeners();
  pushStateToCloud();
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

function notifyPartyListeners() {
  const data = getPartyPosition();
  partyListeners.forEach(cb => {
    try { cb(data); } catch (e) { console.error(e); }
  });
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
  notifyPartyListeners();
  pushStateToCloud();
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

function notifyRouteListeners() {
  const data = getRoute();
  routeListeners.forEach(cb => {
    try { cb(data); } catch (e) { console.error(e); }
  });
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
  notifyRouteListeners();
  pushStateToCloud();
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
          persistMarkers(imported);
          notifyListeners();
          pushStateToCloud();
          resolve(imported.length);
        } else if (imported && Array.isArray(imported.markers)) {
          persistMarkers(imported.markers);
          notifyListeners();
          if (imported.party) {
            savePartyPosition(imported.party);
          }
          if (imported.route !== undefined) {
            saveRoute(imported.route);
          }
          pushStateToCloud();
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

// Marcadores iniciales de ejemplo para Chult
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
