import { t } from "../../src/shared/i18n.js";
// Contenido del FAQ (texto editable sin tocar la lógica de pantallas).
export const faqSections = [
  {
    title: t("¿De qué va el juego?"),
    body: [
      t("Pokémon Dream es un roguelike táctico de cartas con combate por turnos. Elegís un inicial, capturás hasta 6 Pokémon y armás un mazo de 40 a 45 cartas."),
      t("En cada turno cada Pokémon actúa una vez: cargás energía, elegís una técnica y un objetivo. Para ganar tenés que superar los 8 gimnasios, el Alto Mando y al campeón. Si todo tu equipo cae, la corrida termina.")
    ]
  },
  {
    title: t("Modos de aventura"),
    body: [
      t("REGIÓN: recorrés una región con sus 8 líderes en orden, el Alto Mando y el campeón de esa Liga."),
      t("POKÉ WORLD: gimnasios de las 5 regiones mezclados, Liga Mundial y encuentros cruzados.")
    ]
  },
  {
    title: t("Reglas rápidas"),
    body: [
      t("Las técnicas LIBRE no gastan energía ni las cartas cargadas. Las demás se pagan con cartas de energía; las que sobran refuerzan el ataque."),
      t("Los Pokémon de la fila frontal protegen a los de atrás de los ataques cuerpo a cuerpo (CC)."),
      t("Cada ruta tiene un Centro Pokémon, a partir del 3.º o 4.º evento, que cura y revive a todo el equipo.")
    ]
  },
  {
    title: t("Nivel de poder (Nv.)"),
    body: [
      t("El nivel resume los PS máximos y las cuatro estadísticas de combate. Se calcula igual para tus Pokémon y para los rivales, así que sirve para comparar de un vistazo."),
      t("En el mapa cada destino muestra el nivel aproximado de sus rivales contra el de tu equipo: verde = más débil, amarillo = parejo, naranja = más fuerte, rojo = mucho más fuerte.")
    ]
  },
  {
    title: t("Comodín"),
    body: [
      t("Una carta Comodín paga por sí sola cualquier técnica y además refuerza x2 si la usás para potenciar. Solo se gasta como pago si la energía normal no alcanza. Máximo 5 por mazo.")
    ]
  },
  {
    title: t("Objetos equipables"),
    body: [
      t("Hay 29 objetos únicos: cada uno existe una vez por partida y lo lleva un solo Pokémon. Se consiguen al ganar gimnasios y combates importantes, y en las tiendas."),
      t("Se equipan fuera de combate, desde el botón OBJETO de cada Pokémon en el panel de equipo. Los más fuertes aparecen con más medallas.")
    ]
  },
  {
    title: t("Piezas de estrella y tutor"),
    body: [
      t("Tras cada victoria (menos en zonas salvajes) ganás de 1 a 10 Piezas de estrella; los jefes dan más."),
      t("En los campamentos, el tutor cambia una técnica de un Pokémon por otra que pueda aprender. Cuesta de 1 a 5 piezas por cambio, sin límite de cambios, y no gasta tu acción del campamento. Las técnicas enseñadas se conservan al evolucionar.")
    ]
  },
  {
    title: t("Llamadas y campanita"),
    body: [
      t("Los personajes te hablan en una ventanita de llamada que se corta sola. Si no la atendés (OK), queda sin leer: la campanita muestra cuántas te perdiste y guarda el registro.")
    ]
  },
  {
    title: t("¿Quién lo hace?"),
    body: [
      t("Soy Hector, de Argentina. Soy diseñador gráfico con posgrado en UI/UX y trabajo como programador en automatización industrial (TIA Portal, Node-RED)."),
      t("Desarrollo videojuegos por hobby y esto es un proyecto indie: me gusta probar herramientas y técnicas nuevas mientras lo construyo.")
    ]
  },
  {
    title: t("¿Es un juego oficial?"),
    body: [
      t("No. Es un fan game privado y sin fines de lucro. Pokémon y todo su universo pertenecen a Nintendo, Game Freak y The Pokémon Company; este proyecto no está afiliado a ellos."),
      t("Los sprites de Pokémon (Gen 5 de Black/White) se cargan desde un repositorio externo; el resto del arte y los efectos son propios.")
    ]
  },
  {
    title: t("¿Se guarda mi partida?"),
    body: [
      t("Sí, automáticamente en este navegador. Si borrás los datos del sitio o cambiás de dispositivo, la partida no se transfiere."),
      t("Si el juego muestra un cartel rojo de error, tocá BORRAR GUARDADO Y RECARGAR.")
    ]
  }
];
