// Controlador Principal de la Aplicación de Exploración de Chult
import { MARKER_TYPES, getMarkerType } from "./icons.js";
import {
  getMarkers,
  saveMarker,
  deleteMarker,
  subscribeMarkers,
  getPartyPosition,
  savePartyPosition,
  subscribeParty,
  getRoute,
  saveRoute,
  clearRoute,
  subscribeRoute,
  exportBackup,
  importBackup
} from "./storage.js";
import { MapViewer } from "./map-viewer.js";

document.addEventListener("DOMContentLoaded", () => {
  // Estado local de la interfaz
  let currentFilterCategory = "all";
  let hideResolved = false;
  let searchQuery = "";
  let activeAddIcon = "camp";
  let pendingDeleteId = null;

  // Elementos DOM Principales
  const viewportEl = document.getElementById("map-viewport");
  const mapContainerEl = document.getElementById("map-container");
  const mapImageEl = document.getElementById("map-image");
  const markersLayerEl = document.getElementById("markers-layer");
  const partyLayerEl = document.getElementById("party-layer");
  const routeSvgEl = document.getElementById("route-svg");
  const measureSvgEl = document.getElementById("measure-svg");
  const routeBadgeEl = document.getElementById("route-badge");
  const measureBadgeEl = document.getElementById("measure-badge");

  // Barra de estado y modo
  const modeStatusPill = document.getElementById("mode-status-pill");
  const modeText = document.getElementById("mode-text");
  const btnAddPin = document.getElementById("btn-add-pin");
  const btnMeasure = document.getElementById("btn-measure");
  const btnLocateParty = document.getElementById("btn-locate-party");
  const quickIconBar = document.getElementById("quick-icon-bar");
  const quickIconList = document.getElementById("quick-icon-list");
  const btnCancelAddMode = document.getElementById("btn-cancel-add-mode");

  // Barra de Camino / Regla
  const routeControlBar = document.getElementById("route-control-bar");
  const routeBarStats = document.getElementById("route-bar-stats");
  const btnUndoRouteStep = document.getElementById("btn-undo-route-step");
  const btnFinishRoute = document.getElementById("btn-finish-route");
  const btnClearRoute = document.getElementById("btn-clear-route");
  const btnCloseRouteMode = document.getElementById("btn-close-route-mode");

  // Barra lateral
  const sidebarDrawer = document.getElementById("sidebar-drawer");
  const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
  const btnCloseSidebar = document.getElementById("btn-close-sidebar");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");
  const sidebarCounter = document.getElementById("sidebar-counter");
  const totalMarkersCount = document.getElementById("total-markers-count");
  const inputSearch = document.getElementById("input-search-markers");
  const btnClearSearch = document.getElementById("btn-clear-search");
  const filterPillsContainer = document.getElementById("filter-pills-container");
  const checkboxHideResolved = document.getElementById("checkbox-hide-resolved");
  const sidebarMarkersList = document.getElementById("sidebar-markers-list");

  // Modal de Marcador
  const markerModal = document.getElementById("marker-modal");
  const modalTitle = document.getElementById("modal-title");
  const markerForm = document.getElementById("marker-form");
  const markerFormId = document.getElementById("marker-form-id");
  const markerFormX = document.getElementById("marker-form-x");
  const markerFormY = document.getElementById("marker-form-y");
  const modalCategoryPicker = document.getElementById("modal-category-picker");
  const inputTitle = document.getElementById("marker-title");
  const inputDay = document.getElementById("marker-day");
  const checkboxResolved = document.getElementById("marker-resolved");
  const inputNotes = document.getElementById("marker-notes");
  const btnDeleteMarker = document.getElementById("btn-delete-marker");
  const btnCancelMarker = document.getElementById("btn-cancel-marker");
  const btnModalClose = document.getElementById("btn-modal-close");

  // Modal del Grupo
  const partyModal = document.getElementById("party-modal");
  const btnPartyClose = document.getElementById("btn-party-close");
  const btnMovePartyMode = document.getElementById("btn-move-party-mode");
  const inputPartyNotes = document.getElementById("party-notes");
  const btnSavePartyNotes = document.getElementById("btn-save-party-notes");

  // Modal de Confirmación
  const confirmModal = document.getElementById("confirm-modal");
  const btnConfirmCancel = document.getElementById("btn-confirm-cancel");
  const btnConfirmDelete = document.getElementById("btn-confirm-delete");

  // Modal de Backup
  const backupModal = document.getElementById("backup-modal");
  const btnOpenBackup = document.getElementById("btn-open-backup");
  const btnBackupClose = document.getElementById("btn-backup-close");
  const btnBackupOk = document.getElementById("btn-backup-ok");
  const btnExportBackup = document.getElementById("btn-export-backup");
  const btnTriggerImport = document.getElementById("btn-trigger-import");
  const inputImportFile = document.getElementById("input-import-file");

  // Controles flotantes de zoom
  const btnZoomIn = document.getElementById("btn-zoom-in");
  const btnZoomOut = document.getElementById("btn-zoom-out");
  const btnZoomReset = document.getElementById("btn-zoom-reset");
  const btnFullscreen = document.getElementById("btn-fullscreen");

  // Inicializar Visor de Mapa
  const mapViewer = new MapViewer({
    viewportEl,
    mapContainerEl,
    mapImageEl,
    markersLayerEl,
    partyLayerEl,
    routeSvgEl,
    measureSvgEl,
    routeBadgeEl,
    measureBadgeEl,
    onMarkerClick: (marker) => {
      openEditMarkerModal(marker);
    },
    onMapClick: (percentX, percentY, iconType) => {
      openCreateMarkerModal(percentX, percentY, iconType);
    },
    onPartyClick: (partyPos) => {
      openPartyModal(partyPos);
    },
    onMovePartyClick: (percentX, percentY) => {
      const pxX = (percentX / 100) * 2816;
      const pxY = (percentY / 100) * 2048;
      const snap = mapViewer.snapToHexCenter(pxX, pxY);
      if (snap) {
        savePartyPosition({
          x: snap.percentX,
          y: snap.percentY,
          hexId: snap.hexId
        });
      } else {
        savePartyPosition({ x: percentX, y: percentY });
      }
      setExploreMode();
    },
    onRouteUpdate: (routeData) => {
      updateRouteBarUI(routeData);
    },
    onRouteFinish: (routeData) => {
      saveRoute(routeData);
      updateRouteBarUI(routeData);
      setExploreMode();
    }
  });

  // Renderizar selectores de categorías iniciales
  renderQuickIconBar();
  renderModalCategoryPicker();
  renderFilterPills();

  // Suscribirse a marcadores reactivos
  subscribeMarkers((markers) => {
    updateUIWithMarkers(markers);
  });

  // Suscribirse a la posición del grupo de aventureros
  subscribeParty((partyPos) => {
    mapViewer.renderPartyToken(partyPos, (pos) => openPartyModal(pos));
  });

  // Suscribirse a la ruta / camino guardado
  subscribeRoute((savedRoute) => {
    mapViewer.setSavedRoute(savedRoute);
    updateRouteBarUI(savedRoute);
  });

  function updateRouteBarUI(routeData) {
    if (!routeBarStats) return;
    if (!routeData || !routeData.points || routeData.points.length === 0) {
      routeBarStats.innerHTML = `
        <span class="route-stats-hexes"><strong>0</strong> hex</span>
        <span class="route-stats-sep">•</span>
        <span class="route-stats-miles"><strong>0</strong> millas</span>
        <span class="route-stats-steps">(0 etapas)</span>
      `;
    } else {
      routeBarStats.innerHTML = `
        <span class="route-stats-hexes"><strong>${routeData.totalHexes}</strong> hex</span>
        <span class="route-stats-sep">•</span>
        <span class="route-stats-miles"><strong>${routeData.totalMiles}</strong> millas</span>
        <span class="route-stats-steps">(${routeData.points.length} etapas)</span>
      `;
    }
  }

  // ==========================================================================
  // Manejo de Modos: Explorar, Añadir Pin, Medir, Mover Grupo
  // ==========================================================================
  btnAddPin.addEventListener("click", () => {
    if (mapViewer.mode === "add_pin") {
      setExploreMode();
    } else {
      setAddPinMode(activeAddIcon);
    }
  });

  btnMeasure.addEventListener("click", () => {
    if (mapViewer.mode === "measure") {
      setExploreMode();
    } else {
      setMeasureMode();
    }
  });

  btnCancelAddMode.addEventListener("click", () => {
    setExploreMode();
  });

  function setExploreMode() {
    mapViewer.setMode("explore");
    quickIconBar.classList.add("hidden");
    routeControlBar.classList.add("hidden");
    modeStatusPill.className = "status-pill mode-explore";
    modeText.textContent = "Modo: Explorar";

    btnAddPin.classList.remove("btn-secondary");
    btnAddPin.classList.add("btn-primary");
    btnAddPin.innerHTML = '<span class="btn-icon">📍</span><span class="btn-label">+ Añadir Pin</span>';

    btnMeasure.classList.remove("btn-primary");
    btnMeasure.classList.add("btn-secondary");
    btnMeasure.innerHTML = '<span class="btn-icon">📏</span><span class="btn-label">Camino</span>';
  }

  function setAddPinMode(iconType) {
    activeAddIcon = iconType;
    mapViewer.setMode("add_pin", iconType);
    quickIconBar.classList.remove("hidden");
    routeControlBar.classList.add("hidden");
    modeStatusPill.className = "status-pill mode-adding";
    const info = getMarkerType(iconType);
    modeText.textContent = `Colocando: ${info.emoji} ${info.label}`;

    btnAddPin.classList.remove("btn-primary");
    btnAddPin.classList.add("btn-secondary");
    btnAddPin.innerHTML = '<span class="btn-icon">✕</span><span class="btn-label">Cancelar</span>';

    btnMeasure.classList.remove("btn-primary");
    btnMeasure.classList.add("btn-secondary");

    document.querySelectorAll(".icon-chip-btn").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.type === iconType);
    });
  }

  function setMeasureMode() {
    mapViewer.setMode("measure");
    quickIconBar.classList.add("hidden");
    routeControlBar.classList.remove("hidden");
    modeStatusPill.className = "status-pill mode-adding";
    modeText.textContent = "Modo: Trazar Camino (Doble clic fija)";

    btnMeasure.classList.remove("btn-secondary");
    btnMeasure.classList.add("btn-primary");
    btnMeasure.innerHTML = '<span class="btn-icon">✕</span><span class="btn-label">Cerrar Camino</span>';

    btnAddPin.classList.remove("btn-secondary");
    btnAddPin.classList.add("btn-primary");
    btnAddPin.innerHTML = '<span class="btn-icon">📍</span><span class="btn-label">+ Añadir Pin</span>';
  }

  // Botones de acción de la barra de camino
  btnUndoRouteStep.addEventListener("click", () => {
    mapViewer.undoRouteStep();
  });

  btnFinishRoute.addEventListener("click", () => {
    mapViewer.finishRoute();
  });

  btnClearRoute.addEventListener("click", () => {
    clearRoute();
    mapViewer.clearRoute();
  });

  btnCloseRouteMode.addEventListener("click", () => {
    setExploreMode();
  });

  // Atajos de teclado para trazar el camino
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (mapViewer.mode === "measure") {
      if (e.key === "Backspace" || (e.key === "z" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        mapViewer.undoRouteStep();
      } else if (e.key === "Enter") {
        e.preventDefault();
        mapViewer.finishRoute();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setExploreMode();
      }
    }
  });

  function setMovePartyMode() {
    mapViewer.setMode("move_party");
    quickIconBar.classList.add("hidden");
    modeStatusPill.className = "status-pill mode-adding";
    modeText.textContent = "📍 Toca el mapa para reubicar al Grupo";
  }

  function renderQuickIconBar() {
    quickIconList.innerHTML = "";
    Object.values(MARKER_TYPES).forEach((type) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `icon-chip-btn ${type.id === activeAddIcon ? "active" : ""}`;
      btn.dataset.type = type.id;
      btn.style.setProperty("--chip-bg", type.bgColor);
      btn.style.setProperty("--chip-border", type.borderColor);
      btn.innerHTML = `<span>${type.emoji}</span><span>${type.label}</span>`;
      btn.addEventListener("click", () => {
        setAddPinMode(type.id);
      });
      quickIconList.appendChild(btn);
    });
  }

  function renderModalCategoryPicker() {
    modalCategoryPicker.innerHTML = "";
    Object.values(MARKER_TYPES).forEach((type) => {
      const card = document.createElement("div");
      card.className = "category-select-card";
      card.dataset.type = type.id;
      card.style.setProperty("--opt-bg", type.bgColor);
      card.style.setProperty("--opt-border", type.borderColor);
      card.innerHTML = `
        <span class="category-card-emoji">${type.emoji}</span>
        <span class="category-card-label">${type.label}</span>
      `;
      card.addEventListener("click", () => {
        document.querySelectorAll(".category-select-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
      });
      modalCategoryPicker.appendChild(card);
    });
  }

  // ==========================================================================
  // Barra Lateral (Bitácora & Filtros)
  // ==========================================================================
  btnToggleSidebar.addEventListener("click", () => {
    sidebarDrawer.classList.toggle("closed");
    const isOpen = !sidebarDrawer.classList.contains("closed");
    if (window.innerWidth <= 768) {
      sidebarBackdrop.classList.toggle("hidden", !isOpen);
    }
  });

  btnCloseSidebar.addEventListener("click", () => {
    sidebarDrawer.classList.add("closed");
    sidebarBackdrop.classList.add("hidden");
  });

  sidebarBackdrop.addEventListener("click", () => {
    sidebarDrawer.classList.add("closed");
    sidebarBackdrop.classList.add("hidden");
  });

  inputSearch.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    btnClearSearch.classList.toggle("hidden", searchQuery.length === 0);
    renderSidebarList();
  });

  btnClearSearch.addEventListener("click", () => {
    inputSearch.value = "";
    searchQuery = "";
    btnClearSearch.classList.add("hidden");
    renderSidebarList();
  });

  checkboxHideResolved.addEventListener("change", (e) => {
    hideResolved = e.target.checked;
    mapViewer.renderMarkers(getMarkers(), currentFilterCategory, hideResolved);
    renderSidebarList();
  });

  function renderFilterPills() {
    filterPillsContainer.innerHTML = "";
    const markers = getMarkers();

    const allPill = document.createElement("button");
    allPill.className = `filter-pill ${currentFilterCategory === "all" ? "active" : ""}`;
    allPill.innerHTML = `<span>Todos</span> <span class="badge-count">${markers.length}</span>`;
    allPill.addEventListener("click", () => {
      currentFilterCategory = "all";
      renderFilterPills();
      mapViewer.renderMarkers(getMarkers(), currentFilterCategory, hideResolved);
      renderSidebarList();
    });
    filterPillsContainer.appendChild(allPill);

    Object.values(MARKER_TYPES).forEach((type) => {
      const count = markers.filter(m => m.icon === type.id).length;
      const pill = document.createElement("button");
      pill.className = `filter-pill ${currentFilterCategory === type.id ? "active" : ""}`;
      pill.style.setProperty("--pill-bg", type.bgColor);
      pill.style.setProperty("--pill-border", type.borderColor);
      pill.innerHTML = `<span>${type.emoji}</span> <span>${type.label}</span> <span class="badge-count">${count}</span>`;
      pill.addEventListener("click", () => {
        currentFilterCategory = type.id;
        renderFilterPills();
        mapViewer.renderMarkers(getMarkers(), currentFilterCategory, hideResolved);
        renderSidebarList();
      });
      filterPillsContainer.appendChild(pill);
    });
  }

  function updateUIWithMarkers(markers) {
    sidebarCounter.textContent = markers.length;
    totalMarkersCount.textContent = `${markers.length} descubrimientos`;
    renderFilterPills();
    mapViewer.renderMarkers(markers, currentFilterCategory, hideResolved);
    renderSidebarList();
  }

  function renderSidebarList() {
    const markers = getMarkers();
    sidebarMarkersList.innerHTML = "";

    const filtered = markers.filter((m) => {
      if (currentFilterCategory !== "all" && m.icon !== currentFilterCategory) {
        return false;
      }
      if (hideResolved && m.resolved) {
        return false;
      }
      if (searchQuery) {
        const titleMatch = (m.title || "").toLowerCase().includes(searchQuery);
        const notesMatch = (m.notes || "").toLowerCase().includes(searchQuery);
        const dayMatch = (m.day || "").toLowerCase().includes(searchQuery);
        if (!titleMatch && !notesMatch && !dayMatch) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      sidebarMarkersList.innerHTML = `
        <div class="empty-state-notice">
          No hay marcadores que coincidan con la búsqueda o filtro.
        </div>
      `;
      return;
    }

    filtered.forEach((m) => {
      const typeInfo = getMarkerType(m.icon);
      const card = document.createElement("div");
      card.className = `sidebar-marker-card ${m.resolved ? "resolved" : ""}`;
      card.style.setProperty("--card-border", typeInfo.borderColor);

      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-group">
            <span class="card-emoji">${typeInfo.emoji}</span>
            <span class="card-title">${escapeHtml(m.title || "Marcador")}</span>
          </div>
          <div class="card-meta-row">
            ${m.day ? `<span class="card-badge-day">${escapeHtml(m.day)}</span>` : ""}
            <span class="card-status-pill ${m.resolved ? "resolved" : ""}">${m.resolved ? "Resuelto" : "Activo"}</span>
          </div>
        </div>
        ${m.notes ? `<p class="card-notes-preview">${escapeHtml(m.notes)}</p>` : ""}
      `;

      card.addEventListener("click", () => {
        mapViewer.focusOnMarker(m.x, m.y, 1.4);
        if (window.innerWidth <= 768) {
          sidebarDrawer.classList.add("closed");
          sidebarBackdrop.classList.add("hidden");
        }
        openEditMarkerModal(m);
      });

      sidebarMarkersList.appendChild(card);
    });
  }

  // ==========================================================================
  // Modal de Marcador (Crear y Editar)
  // ==========================================================================
  function openCreateMarkerModal(percentX, percentY, iconType) {
    modalTitle.textContent = "Nuevo Marcador";
    markerFormId.value = "";
    markerFormX.value = percentX;
    markerFormY.value = percentY;
    inputTitle.value = "";
    inputDay.value = "";
    inputNotes.value = "";
    checkboxResolved.checked = false;
    btnDeleteMarker.classList.add("hidden");

    selectModalCategory(iconType);
    markerModal.classList.remove("hidden");
    inputTitle.focus();
  }

  function openEditMarkerModal(marker) {
    modalTitle.textContent = "Editar Marcador";
    markerFormId.value = marker.id;
    markerFormX.value = marker.x;
    markerFormY.value = marker.y;
    inputTitle.value = marker.title || "";
    inputDay.value = marker.day || "";
    inputNotes.value = marker.notes || "";
    checkboxResolved.checked = !!marker.resolved;
    btnDeleteMarker.classList.remove("hidden");

    selectModalCategory(marker.icon);
    markerModal.classList.remove("hidden");
  }

  function selectModalCategory(typeId) {
    document.querySelectorAll(".category-select-card").forEach((card) => {
      card.classList.toggle("active", card.dataset.type === typeId);
    });
  }

  function getSelectedModalCategory() {
    const active = document.querySelector(".category-select-card.active");
    return active ? active.dataset.type : "camp";
  }

  function closeMarkerModal() {
    markerModal.classList.add("hidden");
  }

  btnCancelMarker.addEventListener("click", closeMarkerModal);
  btnModalClose.addEventListener("click", closeMarkerModal);

  markerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = inputTitle.value.trim();
    if (!title) return;

    const markerData = {
      id: markerFormId.value || undefined,
      x: parseFloat(markerFormX.value),
      y: parseFloat(markerFormY.value),
      icon: getSelectedModalCategory(),
      title: title,
      day: inputDay.value.trim(),
      notes: inputNotes.value.trim(),
      resolved: checkboxResolved.checked
    };

    saveMarker(markerData);
    closeMarkerModal();
    setExploreMode();
  });

  // Eliminación con confirmación
  btnDeleteMarker.addEventListener("click", () => {
    pendingDeleteId = markerFormId.value;
    confirmModal.classList.remove("hidden");
  });

  btnConfirmCancel.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
    pendingDeleteId = null;
  });

  btnConfirmDelete.addEventListener("click", () => {
    if (pendingDeleteId) {
      deleteMarker(pendingDeleteId);
      pendingDeleteId = null;
      confirmModal.classList.add("hidden");
      closeMarkerModal();
    }
  });

  // ==========================================================================
  // Posición del Grupo de Aventureros
  // ==========================================================================
  btnLocateParty.addEventListener("click", () => {
    const party = getPartyPosition();
    mapViewer.focusOnMarker(party.x, party.y, 1.4);
    openPartyModal(party);
  });

  function openPartyModal(partyPos) {
    const pxX = (partyPos.x / 100) * 2816;
    const pxY = (partyPos.y / 100) * 2048;
    const snap = mapViewer.snapToHexCenter(pxX, pxY);
    const hexBadgeEl = document.getElementById("party-modal-hex-pill");
    if (hexBadgeEl) {
      hexBadgeEl.textContent = snap ? `Hexágono #${snap.hexId}` : "Chult";
    }
    inputPartyNotes.value = partyPos.note || "";
    partyModal.classList.remove("hidden");
  }

  btnPartyClose.addEventListener("click", () => {
    partyModal.classList.add("hidden");
  });

  btnSavePartyNotes.addEventListener("click", () => {
    savePartyPosition({ note: inputPartyNotes.value.trim() });
    partyModal.classList.add("hidden");
  });

  btnMovePartyMode.addEventListener("click", () => {
    partyModal.classList.add("hidden");
    setMovePartyMode();
  });

  // ==========================================================================
  // Modal de Copia de Seguridad
  // ==========================================================================
  btnOpenBackup.addEventListener("click", () => {
    backupModal.classList.remove("hidden");
  });

  btnBackupClose.addEventListener("click", () => {
    backupModal.classList.add("hidden");
  });

  btnBackupOk.addEventListener("click", () => {
    backupModal.classList.add("hidden");
  });

  btnExportBackup.addEventListener("click", () => {
    exportBackup();
  });

  btnTriggerImport.addEventListener("click", () => {
    inputImportFile.click();
  });

  inputImportFile.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const count = await importBackup(file);
      alert(`¡Copia restaurada con éxito! Se cargaron ${count} marcadores.`);
      backupModal.classList.add("hidden");
    } catch (err) {
      alert("Error al importar el archivo: " + err.message);
    }
    inputImportFile.value = "";
  });

  // ==========================================================================
  // Controles de Zoom Flotantes
  // ==========================================================================
  btnZoomIn.addEventListener("click", () => mapViewer.zoomIn());
  btnZoomOut.addEventListener("click", () => mapViewer.zoomOut());
  btnZoomReset.addEventListener("click", () => mapViewer.centerView());

  btnFullscreen.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });
});

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
