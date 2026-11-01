# Visor Interactivo de Mapa de Chult (D&D 5e - Tomb of Annihilation)

Herramienta web interactiva para exploración y navegación hexagonal en la península de Chult.

## Características

- 🗺️ **Mapa Hexagonal de Alta Resolución**: Chult con numeración y coordenadas hexagonales exactas.
- 📐 **Herramienta de Camino / Ruta de Expedición**:
  - Trazo interactivo con snap magnético al centro de cada hexágono.
  - Medición en tiempo real (1 hex = 3 millas).
  - Contador de distancia total y etapas.
  - Finalización con doble clic, tecla Enter o botón de barra flotante.
  - Persistencia de la ruta en almacenamiento local.
- ⚔️ **Token del Grupo de Aventureros**:
  - Registro y reubicación de la posición actual del grupo.
  - Snap automático al hexágono correspondiente y notas de campamento.
- 📍 **Marcadores y Bitácora de Exploración**:
  - Marcadores temáticos (Campamento, Ruinas, Combate, Puesto comercial, Naufragio, Peligro, Cueva, Bosque, Montaña, Colina, Pantano).
  - Registro de día del juego, notas y estado (resuelto/pendiente).
  - Filtros rápidos por categoría y barra lateral deslizable.
- 💾 **Almacenamiento y Respaldos**:
  - Guardado automático en `localStorage`.
  - Exportación e importación de copias de seguridad en formato JSON.
  - Preparado para sincronización en tiempo real con Firebase Firestore.

## Ejecución Local

Para levantar el servidor local de desarrollo:

Con Node.js:
```bash
node serve.js
```

O con Python:
```bash
python serve.py
```

Luego abre en tu navegador: `http://localhost:8000`
