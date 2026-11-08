# CHISPA ∞ · Reglas Permanentes del Proyecto

Este documento define los estándares arquitectónicos, técnicos y estéticos no negociables para el desarrollo de **CHISPA ∞**.

## 1. Stack Tecnológico
- **Bundler y Lenguaje:** Vite + TypeScript en modo estricto (`strict: true`).
- **UI:** DOM nativo + Variables CSS reactivas (sin frameworks pesados). Preact solo si una vista compleja lo justifica estrictamente.
- **Renderizado Gráfico:** PixiJS v8 (soporte WebGL y WebGPU), con shaders personalizados en GLSL.
- **Aritmética Económica:** `break_infinity.js` (`Decimal`) para todos los valores económicos y de recursos. Nunca usar `number` nativo para saldo o costes acumulativos.
- **Audio:** WebAudio API sintetizado íntegramente por código (osciladores, nodos de ganancia, filtros, ruido procedural).
- **Tipografía:** Autohospedada mediante paquetes `@fontsource` (Unbounded y Sora).
- **Testing y QA:** Vitest para pruebas unitarias de lógica y Playwright para flujos E2E y capturas visuales.
- **PWA & Deploy:** `vite-plugin-pwa`, offline-first, GitHub Actions CI/CD hacia GitHub Pages.

## 2. Principio Fundamental: Cero Assets Externos
- **Gráficos:** Queda estrictamente prohibido importar imágenes, PNGs, JPGs, SVGs externos o sprites descargados. Todo elemento visual proviene de shaders GLSL, geometrías vectoriales procedurales generadas en canvas/Pixi Graphics, y partículas matemáticas instanciadas.
- **Audio:** Queda estrictamente prohibido cargar archivos `.mp3`, `.ogg`, `.wav` o pistas de audio pregrabadas. Todos los efectos y música ambiental generativa se sintetizan en tiempo real con WebAudio.
- **Fuentes:** Únicamente cargadas vía dependencias npm `@fontsource/*`.

## 3. Arquitectura y Separación Estricta
El código debe organizarse en capas desacopladas:
```
src/
  core/    # Simulación pura (sin DOM ni Pixi): estado inmutable/accionable, economía, prestige, offline, RNG determinista
  data/    # Definiciones estáticas de balance: generadores (1-16), mejoras, logros, eras (16), noticias ticker
  render/  # Escena PixiJS: cielo, órbitas, núcleo, partículas, post-proceso, cámara
  ui/      # Capa visual DOM: HUD, panel de cristal, pestañas, tooltips, modales, toasts, controles de compra
  audio/   # Motor de síntesis WebAudio: SFX pentatónicos/dinámicos, pads generativos por era, compresor maestro
  save/    # Persistencia: serialización versionada, migraciones de esquema, backup rotativo, export/import con checksum
  i18n/    # Textos en español neutro, estructura modular lista para localización en inglés
scripts/
  simulate.ts # Bot de simulación económica que valida los tiempos de las metas de ritmo
tests/
  unit/    # Vitest: economía, multiplicadores, hitos, offline, prestige, fórmulas numéricas
  e2e/     # Playwright: flujos interactivos, compras, transiciones cinemáticas, capturas
```

- **Paso de simulación fijo:** `core` avanza a 20 Hz con acumulador de tiempo delta. El render interpola visualmente.
- **Cálculo offline:** Fórmula cerrada o bloques de integración temporal, nunca un bucle ingenuo de millones de ticks.
- **Flujo unidireccional:** El render y la UI observan y leen el estado de `core`. Las interacciones envían comandos o mutaciones controladas al `core`.

## 4. Presupuesto de Rendimiento y Calidad
- **Tasa de refresco objetivo:** 60 fps estables (≥ 55 fps promedio en calidad Alta en dispositivos medios).
- **DPR:** Clampeado a un máximo de 2.0.
- **Gestión de memoria:** Pooling de partículas y objetos efímeros; cero allocations (nada de `new Object()`, arrays temporales o recreación de closures) en el bucle principal de render (`ticker`).
- **Ciclo de vida:** Pausa completa de render y audio al ocultar la pestaña (`document.visibilityState === 'hidden'`).
- **Niveles de calidad:**
  - *Alta:* Bloom completo, lente gravitacional, aberración cromática, grano sutil, hasta 3.000 partículas.
  - *Media:* Bloom esencial, hasta 1.200 partículas, escala 0.75.
  - *Baja:* Sin post-proceso pesado, hasta 400 partículas, escala 0.5.
  - *Auto:* Baja de nivel si los fps caen de 50 durante 2 s; sube de nivel si superan 58 durante 10 s.
- **Accesibilidad:** Soporte `prefers-reduced-motion` (desactiva aberración, shakes y flashes), contraste WCAG AA (≥ 4.5:1), controles 100% accesibles por teclado y áreas táctiles mínimas de 44 px.

## 5. Idioma y Tono
- Interfaz, diálogos, descripciones y noticias en **español neutro**.
- Tono: cálido, curioso, asombro cósmico, humor seco y amable (sin referencias burlonas o jerga cliché).
- Código, nombres de variables, tipos, comentarios y mensajes de commit en **inglés**.
