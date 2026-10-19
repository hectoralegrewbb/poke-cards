# Pokécards Dungeon — revisión de producto y diseño v0.2

## Visión

**Propuesta:** un roguelike de estrategia táctica accesible en el que construís un equipo de seis Pokémon y un mazo común de energía/utilidades. No es un TCG tradicional: las criaturas eligen las técnicas y las cartas gestionan el combustible táctico. La decisión central de cada turno es **quién actúa, con qué técnica, contra quién y cuántas cartas invertir**.

**Objetivo verificable:** alcanzar el campeonato tras **8 gimnasios, 4 miembros del Alto Mando y 1 campeón**. Una corrida se pierde cuando no quedan miembros activos. Progresión secundaria: capturar, evolucionar, mejorar mazo y administrar oro/consumibles.

**Jugador destinatario:** fan del combate estratégico por turnos, con sesiones fragmentadas y aprendizaje incremental. El juego se juega con ratón, teclado básico o toques; arrastrar cartas es opcional. Es un proyecto fan para uso privado.

## Auditoría de la base recibida

| Área | Estado original | Riesgo | Acción v0.2 |
| --- | --- | --- | --- |
| Identidad visual | Paleta Sweetie 16, UI pixel, sonidos y efectos existentes | Bueno, pero faltaban personajes | GIF Black/White Gen 5 (front/back) con fallback PNG/local |
| Onboarding | La portada explicaba apenas una frase; el flujo de cartas estaba oculto | Alto | Objetivo en 3 pasos y guía contextual en combate |
| Navegación | Caminos sin comunicar riesgo ni recompensa | Medio | Tarjetas con consecuencia, progreso, modalidad |
| Dificultad | Una escala fija con salto a cuatro enemigos en el primer gimnasio | Alto | Explorador, Entrenador y Veterano; mismas reglas |
| Continuidad | Recargar borraba la corrida completa | Crítico para partida larga | Guardado automático local con RNG reproducible |
| Accesibilidad | Clic/arrastrar, sin suficiente foco visual o teclado en tiles/cartas | Medio | Foco visible; Enter/Espacio en sprites y cartas |
| Contenido | 62 especies, 55 técnicas, 8 cartas, ocho gimnasios + liga | Variedad de equipo mayor que de mazo | No ampliar contenido antes de validar el sistema |
| Pruebas | Cobertura de reglas en Node; sin pruebas del DOM | Medio | Tests adicionales de sprites, dificultad y serialización; QA visual recomendado |

## Bucle principal

**Mapa (elección de riesgo)** → **encuentro/servicio** → **combate táctico** → **recompensa/captura** → **reajuste de party y mazo** → **jefe de gimnasio** → siguiente etapa. Tras 8 medallas comienza una cadena de combates de Liga. No todas las elecciones son combate: los servicios aportan recuperación y gestión de recursos.

### Progresión deseable de habilidades

- **Gimnasios 1–2, descubrimiento:** capturar y entender técnicas LIBRE / coste 1; celebrar primeras capturas y evoluciones. Evitar una pared de dificultad por jugar con 1–2 aliados.
- **Gimnasios 3–4, dominio:** enseñar refuerzos de daño, escudo, utilidad, filas frontal/posterior e intenciones enemigas.
- **Gimnasios 5–6, especialización:** hacer que la composición de tipos y las pasivas cambien decisiones; fomentar sustituciones y ajustar el mazo.
- **Gimnasios 7–8, preparación:** administrar recursos para la Liga, con mayor densidad de enemigos y decisiones de oportunidad.
- **Liga, examen final:** gestión de consumibles, selección de objetivos, cobertura de tipos y orden de ataques durante encuentros seguidos.

Estos son objetivos de diseño, no tutoriales scripted todavía. La guía contextual actual reduce la fricción de entrada sin alterar el motor.

## Balance: hipótesis y reglas de evaluación

Los presets v0.2 multiplican **solo los PS y estadísticas enemigas**, y modifican recursos iniciales; la curva preexistente por etapa permanece intacta. Esto evita agregar subsistemas hasta disponer de telemetría de pruebas. Los cambios son reversibles y deterministas por semilla.

**Necesitamos medir antes de retocar las ocho etapas:**

| Métrica | Interpretación | Meta tentativa para tests de jugadores humanos |
| --- | --- | --- |
| Finalización del primer gimnasio | Calidad del onboarding | 75–90 % en Explorador |
| Medallas promedio por corrida | Localiza paredes de dificultad | Comparar por preset, no mezclar |
| Supervivencia antes de medalla 3 | Disponibilidad de capturas/curas | Investigar derrotas tempranas sistemáticas |
| Porcentaje de turnos con carta gastada | Dominio del sistema de energía | Debe crecer de las etapas iniciales a medias |
| Frecuencia de escudo y utilidades | Comprensión del juego táctico | Si casi es cero, falta formación o valor táctico |
| Duración real de corrida y abandono | Identifica fatiga antes del final | Estimar con playtests antes de fijar objetivo |
| Errores de interacción / clics fallidos | Fricción de UI | Prioridad si supera los errores estratégicos |

**Precaución:** `npm run simulateRun` usa un bot codicioso que prioriza decisiones de forma fija, no representa a jugadores humanos. Sus tasas de victoria sirven para detectar regresiones, no para afirmar la dificultad percibida. Mantener seeds reproducibles por escenario de prueba.

### Medición exploratoria v0.2 (bot, no jugadores reales)

Se corrieron 150 seeds por modalidad. El bot utiliza ataques y una política de navegación/curación simple: subestima el valor estratégico de escudos y cartas de utilidad.

| Modalidad | Media de medallas | Cae antes de la 1.ª | Campeón |
| --- | ---: | ---: | ---: |
| Explorador | 4,54 | 24 % | 0/150 |
| Entrenador | 2,74 | 40 % | 0/150 |
| Veterano | 1,45 | 55 % | 0/150 |

Esto evidencia una curva muy exigente para el bot, sobre todo en el acceso a la Liga. Antes de rebajar ciegamente todas las escalas, revisar junto a testers humanos: **(1)** número de aliados en el primer gimnasio, **(2)** valor efectivo de curaciones y escudos y **(3)** estado de la party al llegar a la Liga. Una victoria final del bot no es una meta de diseño por sí sola.

## Alcance propuesto

**Vertical slice v0.2 (incluido):** 62 especies, 55 técnicas, 8 cartas; mapa con rutas, captura, equipo, caja, evolución, 8 gimnasios y Liga; sprites Gen 5 vía URL, descargador opcional offline; tres modos, guardado local, onboarding y acciones por teclado.

**v0.3, prioridad P0:** pruebas visuales E2E en navegador (desktop y móvil), protección contra abandono accidental de partida, confirmación al reemplazar guardado, métricas locales anónimas opcionales, depuración de problemas de guardado en cada estado, y QA del flujo del primer gimnasio. Es más importante que sumar decenas de especies.

**v0.4, prioridad P1:** tutorial interactivo con desafío pequeño, glosario de reglas/tipos, mejoras de accesibilidad táctil y contraste, resumen poscombate más claro, indicadores de objetivos dentro de la Liga, afinación de bot para simulaciones diferenciadas por estilo.

**v0.5, prioridad P2:** nuevos eventos aleatorios, más cartas sin sobrecargar roles, más variedades de jefes, animaciones específicas de ataques, logros locales y perfiles de desafíos.

**Fuera del alcance hasta validar el núcleo:** multijugador, cuentas/backend, intercambio, gacha, meta-progresión compleja y lanzamiento comercial con propiedad intelectual de Pokémon. El riesgo es expandir contenido sobre un sistema que aún necesita pruebas de comprensión y balance.

## Decisiones UI

1. La **animación de reposo** la aporta el GIF original, sin sumar un segundo bucle CSS invasivo. Solo hay microefectos de ataque/impacto y estados de foco; se respetan preferencias de movimiento reducido.
2. Se conserva **arrastrar y soltar** para usuarios expertos, pero **clics y teclado** son vías equivalentes en las acciones centrales. En touch la mano de cartas se desplaza horizontalmente.
3. Las tarjetas del mapa muestran **riesgo y beneficio**, no una elección supuestamente óptima. La dificultad siempre es visible en la portada y mapa.
4. La guía de combate se puede plegar para devolver espacio al campo. La selección inicial evita una pantalla sin acciones evidentes.
5. Los sprites se cargan remotamente por defecto y desde el pack local cuando se descarga offline; no se distribuyen imágenes sujetas a copyright.

## Riesgos técnicos pendientes

- **Dependencia online:** si no hay conexión ni pack local habrá marcadores de sustitución; para un release cerrado, usar el descargador solo con la autorización correspondiente.
- **Guardado local:** no sincroniza entre dispositivos; borrar los datos del navegador borra la partida. No hay migración entre formatos de guardado. Validar snapshot luego de cada actualización de motor.
- **Escalado de sprites:** algunas especies tienen GIF con tamaños distintos; hay que validar encuadre visual uno por uno en resolución móvil y escritorio.
- **Usabilidad táctil y teclado:** Enter/Espacio en tiles y cartas se agregó, pero la interacción drag & drop puede requerir ajustes extra para lectores de pantalla. Faltan pruebas con personas usuarias.
- **Propiedad intelectual:** fan game privado no significa libre distribución de assets/nombres. Un lanzamiento público/comercial necesita asesoramiento legal y recursos propios/licenciados.
