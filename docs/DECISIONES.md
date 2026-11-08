# Registro de Decisiones de Diseño y Arquitectura (ADR)

Este documento registra todas las decisiones arquitectónicas, de diseño y de balance tomadas durante el desarrollo de **CHISPA ∞**, indicando contexto, decisión, justificación y alternativas descartadas.

---

## ADR 001 · Estructura Base y Stack Tecnológico
- **Fecha:** Fase 0 (Inicio)
- **Estado:** Aprobado
- **Decisión:** 
  - Usar Vite + TypeScript estricto con `break_infinity.js` para números exponenciales sin límite en 1e308.
  - Usar PixiJS v8 para la capa de renderizado 2D/WebGL con shaders GLSL personalizados, manteniendo una capa DOM limpia y ultraligera para la UI (diseño en cristal, variables CSS).
  - WebAudio API pura para síntesis de audio procedural en tiempo real (música generativa y SFX).
  - `@fontsource/unbounded` y `@fontsource/sora` para tipografía local sin peticiones externas.
- **Motivo:** Máximo rendimiento (60 fps estables), cero dependencias de assets externos (imágenes/audio), desacoplamiento completo entre lógica económica y vista.
- **Alternativas descartadas:**
  - *React/Vue/Svelte:* Introducen sobrecarga de renderizado virtual DOM innecesario para un juego incremental donde los números se actualizan a 20-60 Hz y PixiJS maneja la animación gráfica.
  - *Archivos de sonido/sprites externos:* Violan el principio central del proyecto («cero assets externos») y complican el modo offline/PWA.

---

## ADR 002 · Simulación Desacoplada y Fórmulas Numéricas Cerradas
- **Fecha:** Fase 1 (Cierre)
- **Estado:** Aprobado
- **Decisión:**
  - La economía y la lógica de simulación residen en `src/core/` sin referencias a DOM ni a PixiJS.
  - El coste geométrico en lote de $N$ generadores se computa mediante la suma analítica cerrada de la progresión geométrica: $S = B \cdot r^{\text{owned}} \cdot \frac{r^N - 1}{r - 1}$, permitiendo compras instantáneas de hasta $10^{300}$ unidades en $O(1)$.
  - El cálculo offline es de tiempo cerrado ($O(1)$) multiplicando el tiempo transcurrido (topado en 8 h / 24 h con mejora) por la producción por segundo y la eficiencia, sin bucles de simulación acumulativos.
- **Motivo:** Garantizar determinismo, rendimiento absoluto sin bloqueos en el hilo principal y testeabilidad 100% aislada.

---

## ADR 003 · Escena Gráfica de 5 Capas en PixiJS v8 y Shaders GLSL
- **Fecha:** Fase 2 (Cierre)
- **Estado:** Aprobado
- **Decisión:**
  - Implementar el cielo (`SkyLayer`) y el núcleo «Chispa» (`SparkCore`) como `Mesh` de PixiJS v8 con shaders GLSL 300 ES propios (ruido fractal FBM de 4 octavas para nebulosas y función de corona + rayos rotatorios + anillo de Resonancia para el núcleo).
  - Dividir las órbitas 3D (`OrbitsLayer`) en dos contenedores (`backContainer` para $\sin\theta < 0$ y `frontContainer` para $\sin\theta \ge 0$) alrededor del núcleo, dibujando los 16 arquetipos orbitales en dos instancias `Graphics` reutilizadas cada fotograma.
  - Implementar un filtro unificado de post-proceso (`PostProcessController`) que combina Bloom suave, Lente Gravitacional relativista alrededor de la posición en pantalla del agujero negro, Aberración Cromática en hitos y Viñeta.
- **Motivo:** Mantener menos de 15 draw calls por fotograma y 0 asignaciones de memoria en el bucle caliente.

---

## ADR 004 · Síntesis WebAudio Pentatónica y Guardado con Checksum FNV-1a
- **Fecha:** Fases 7 y 8 (Cierre)
- **Estado:** Aprobado
- **Decisión:**
  - El motor `AudioEngine.ts` sintetiza todos los efectos en tiempo real usando la escala pentatónica mayor acoplada al combo de Resonancia y genera acordes ambientales cuyos fundamentales evolucionan según la era activa, protegidos por un `DynamicsCompressorNode` y un límite estricto de 16 voces simultáneas.
  - El `SaveManager.ts` mantiene doble ranura en `localStorage` (`primary` y `backup` rotativo) y exporta cadenas con cabecera `CHISPA2:<checksum-fnv1a>:<base64>` para impedir corrupción o importaciones truncadas.

---

## ADR 005 · Fase G1 (v1.1): HUD Compacto en 2 Líneas, Cola de Logros, Escalado de Clic y Panel F3
- **Fecha:** Fase G1 (`v1.1.0`)
- **Estado:** Aprobado
- **Decisión:**
  - Envolver `.tabs-nav` en `.tabs-nav-wrapper` con sombras de borde dinámicas (`.has-scroll-left` / `.has-scroll-right`) y `scroll-behavior: smooth`, eliminando cualquier corte de texto en pestañas.
  - Hacer que el HUD móvil inicie en modo compacto de 2 líneas (`.hud-collapsed`: línea 1 con energía y tasa de producción; línea 2 con siguiente objetivo y barra de progreso) para que el núcleo ocupe `>= 25 %` del ancho en pantallas de `390×844`.
  - Sustituir el descarte inmediato de notificaciones por una cola FIFO (`toastQueue`) con máximo 2 avisos simultáneos (1 en móvil).
  - Añadir mejoras de clic (`echo_4` a `echo_6`) con porcentaje creciente del SPS (`+5 %`, `+10 %`, `+20 %`) y multiplicador compuesto por era (`1.15^eraIndex`), más panel de diagnóstico `F3` en tiempo real.

---

## ADR 006 · Fase G2 (v1.1): Pipeline de Luz HDR, Dual Kawase 5 Niveles, ACES y Dithering 1 LSB
- **Fecha:** Fase G2 (`v1.1.0`)
- **Estado:** Aprobado
- **Decisión:**
  - Implementar extracción de altas luces HDR con umbral suave (*soft knee*) y pirámide *Dual Kawase* de 5 niveles en calidad Alta (3 en Media, 0 en Baja), quemando los picos de luminancia hacia blanco cálido antes de aplicar la curva fílmica ACES de Narkowicz.
  - Incorporar exposición automática suave con constante de inercia de `1.0 s`, destellos de lente anamórficos horizontales en calidad Alta, corrección de color por era (sombras, luces y contraste interpolados durante `3.0 s`) y *dithering* de ruido de gradiente intercalado (IGN) de 1 LSB (`±0.5/255`) para eliminar bandas en el cielo oscuro.

---

## ADR 007 · Fase G3 (v1.1): Núcleo «Chispa» Multicapa con FBM Domain Warping, God Rays y 5 Variantes
- **Fecha:** Fase G3 (`v1.1.0`)
- **Estado:** Aprobado
- **Decisión:**
  - Sustituir el disco blanco uniforme del núcleo por una proyección hemisférica 3D con oscurecimiento de limbo físico de Eddington ($I(\mu) = \mu^{0.68}$) y granulación convectiva mediante *FBM* de 4 octavas con *domain warping*.
  - Añadir un bucle de *raymarching* radial de 28 muestras para los rayos volumétricos (*god rays*) reactivos al clic (`uKick`) y al combo de Resonancia, 5 variantes morfológicas interpoladas por era (Plasma, Estrella con manchas, Púlsar bipolar, Agujero negro luminoso con anillo de fotones y Singularidad cuántica) y el anillo de Resonancia integrado en el propio shader HDR.

---

## ADR 008 · Fase G4 (v1.1): Los 16 Cuerpos Orbitales con Shaders Propios e Instanciación GPU
- **Fecha:** Fase G4 (`v1.1.0`)
- **Estado:** Aprobado
- **Decisión:**
  - Reemplazar el dibujo 2D básico de los cuerpos orbitales por dos mallas dinámicas por lotes (`backBodiesMesh` y `frontBodiesMesh`, 1 draw call cada una) con shader GLSL dedicado para las 16 técnicas obligatorias: #1 Átomo con 3 electrones y estela de cinta de 32 segmentos, #2 Nube FBM con domain warping, #3 Protoestrella con chorros bipolares, #4 Estrella enana con granulación y erupciones, #5 Púlsar con god rays sincronizados, #6 Nebulosa 5 octavas con absorción de polvo, #7 Agujero negro con Doppler y lente de Einstein, #8 Galaxia espiral logarítmica, #9 Cúmulo galáctico, #10 Telaraña cósmica, #11 Cuásar relativista, #12 Brana con desplazamiento en el vertex shader, #13 Cuerda cósmica estacionaria, #14 Burbuja con película delgada y Fresnel, #15 Mente cósmica neuronal y #16 Chispa original recursiva de 2 niveles.
  - Añadir una nube GPU instanciada (`subCloudMesh`, 1 draw call) con `3.200` estrellas galácticas en brazos logarítmicos y `260` puntos de cúmulo galáctico animados íntegramente en el *vertex shader*.

---

## ADR 009 · Fase G5 (v1.1): Sistema de 50.000 Partículas Analíticas en GPU y Cielo Profundo Multicapa
- **Fecha:** Fase G5 (`v1.1.0`)
- **Estado:** Aprobado
- **Decisión:**
  - Sustituir el bucle de actualización de partículas en CPU por un sistema de `50.000` partículas en GPU (`topology: 'point-list'` en `EffectsLayer.ts`) dividido en `44.000` partículas permanentes de polvo orbital/cósmico (cuya órbita kepleriana inclinada, turbulencia armónica y colapso en el Big Bang se evalúan de forma analítica en el *vertex shader* con `0` coste de CPU) y un *ring buffer* de `6.000` ranuras para ráfagas de clic, hitos y estelas de cometas con integración analítica de rozamiento ($x(t) = x_0 + v_0 (1 - e^{-kt})/k$).
  - Ampliar `SkyLayer.ts` a 4 capas de nebulosa con desenfoque progresivo por profundidad (de 2 a 5 octavas FBM y absorción oscura de Beer-Lambert), galaxias espirales y elípticas lejanas procedurales en el campo profundo, `270` estrellas con temperatura de color de cuerpo negro (`3.200 K` a `25.000 K`), destellos de difracción de 4/6 puntas en las más brillantes y estrellas fugaces ocasionales.

---

## ADR 010 · Fase G6 (v1.1): Cinemática de Big Bang con Cámara Lenta, Onda de Choque en Pantalla y Transiciones de Era
- **Fecha:** Fase G6 (`v1.1.0`)
- **Estado:** Aprobado
- **Decisión:**
  - Ampliar la secuencia cinemática del Big Bang a `6,0 s` con pivote de cámara centrado en el núcleo (`worldContainer.pivot`), zoom progresivo hasta `1.38×`, contracción orbital y de las `50.000` partículas hacia la singularidad, ventana de **cámara lenta (`sceneTimeScale = 0.3` durante `1,5 s`)**, sobreexposición con *god rays*, **distorsión de onda de choque en espacio de pantalla** (`triggerShockwaveDistortion`), destello HDR y renacimiento con retroceso suave de cámara.
  - Enriquecer los cambios de era (pulso de bloom + distorsión radial + transición de color de `3,0 s`) y los hitos/cometas (estela de partículas GPU, destello de lente anamórfico en cruz y sacudida suave de cámara que respeta `prefers-reduced-motion`).
