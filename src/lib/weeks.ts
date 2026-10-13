// Fuente única de las semanas 1–42 del embarazo (Guía, PandaStory, PandaIA...).
// Solo datos y funciones puras: sin React, sin window, sin Firebase. Seguro en servidor y cliente.
//
// Criterios del contenido:
// - Las semanas se cuentan desde el primer día de la última regla (edad gestacional): en las
//   semanas 1–2 todavía no hay embarazo y en la 3–4 ocurren la concepción y la implantación.
// - Longitud: coronilla-rabadilla hasta la semana 19 y cabeza-talón desde la 20 (ver `note`).
//   Pesos y longitudes son promedios aproximados de tablas de referencia habituales, redondeados.
// - Hitos alineados con guías públicas (ACOG, CDC). No sustituyen la valoración del obstetra y
//   ningún profesional de salud ha revisado este contenido: no lo presentes como validado.
// - `forDad`: una misión concreta para el copiloto; `forMom`: para la mamá; `together`: una para hacer
//   los dos. Accionables: un verbo, una acción y su porqué, en una o dos frases. Sin emoji.

export type WeekInfo = {
  week: number;
  size: { fruta: string; geek: string };
  /** Longitud aproximada en cm (null si todavía no hay embrión medible). */
  lengthCm: number | null;
  /** Peso aproximado en gramos (null si es menor de 1 g o no hay embrión). */
  weightG: number | null;
  milestone: string;
  forMom: string;
  forDad: string;
  /** «Juntos esta semana»: lo mismo para los dos (una conversación, una decisión, un ritual). */
  together: string;
  note?: string;
};

export const WEEK_MIN = 1;
export const WEEK_MAX = 42;

/** Semana entera dentro de 1..42 (valores no numéricos → 1). */
export function clampWeek(week: number): number {
  if (typeof week !== "number" || !Number.isFinite(week)) return WEEK_MIN;
  return Math.min(WEEK_MAX, Math.max(WEEK_MIN, Math.floor(week)));
}

/** Trimestre de una semana completa: 1 (1–13), 2 (14–27), 3 (28+). */
export function trimesterOfWeek(week: number): 1 | 2 | 3 {
  const w = clampWeek(week);
  return w <= 13 ? 1 : w <= 27 ? 2 : 3;
}

const LMP_NOTE = "Las semanas del embarazo se cuentan desde el primer día de la última regla, unas dos semanas antes de la concepción: todavía no hay embarazo.";

export const WEEKS: readonly WeekInfo[] = [
  {
    week: 1,
    size: { fruta: "Aún no hay embrión", geek: "Pantalla de carga" },
    lengthCm: null,
    weightG: null,
    milestone: "Preparación: el ciclo empieza con la última regla",
    forMom: "Empieza hoy el ácido fólico (al menos 400 mcg al día) y anota la fecha de tu última regla: con ella se calcula la fecha probable de parto.",
    forDad: "Compra el ácido fólico, proponle poner un recordatorio diario y pon tú otro para reponerlo antes de que se acabe. Si fumas, busca esta semana ayuda para dejarlo: el humo también la afecta a ella.",
    together: "Hablen 15 minutos de cómo se imaginan este camino y qué les preocupa, y elijan un momento fijo a la semana para revisar juntos la Guía.",
    note: LMP_NOTE,
  },
  {
    week: 2,
    size: { fruta: "Un óvulo a punto de salir", geek: "Botón de encendido" },
    lengthCm: null,
    weightG: null,
    milestone: "Ovulación: el óvulo se libera al final de esta semana",
    forMom: "Ata el ácido fólico a algo que ya haces cada día, como lavarte los dientes, y mantén tu actividad física de siempre. Si llevas registro de tu ciclo, anota tus días fértiles.",
    forDad: "Encárgate esta semana de las cenas: verduras de hoja, legumbres y fruta. Y cuiden el ambiente en casa: sin prisas ni presión.",
    together: "Decidan qué cambiarán en casa desde ya (alcohol, tabaco, horas de sueño) y que cada uno escriba un compromiso concreto.",
    note: LMP_NOTE,
  },
  {
    week: 3,
    size: { fruta: "Semilla de vainilla", geek: "Un píxel" },
    lengthCm: null,
    weightG: null,
    milestone: "Concepción: el óvulo fecundado viaja hacia el útero",
    forMom: "Si buscan un embarazo, deja el alcohol y el tabaco desde ya y no te saltes el ácido fólico: lo que pasa estas semanas cuenta aunque todavía no lo notes.",
    forDad: "Revisen juntos el botiquín y separen los medicamentos que conviene consultar antes con su médico, como el ibuprofeno o los antigripales.",
    together: "Pónganse de acuerdo en cuándo harán la prueba de embarazo y cómo se darán la noticia, aunque sea entre ustedes dos.",
    note: "Es una bolita de células microscópica: todavía no se puede medir ni ver en una ecografía.",
  },
  {
    week: 4,
    size: { fruta: "Semilla de amapola", geek: "Punta de un bolígrafo" },
    lengthCm: 0.1,
    weightG: null,
    milestone: "Implantación: el embrión se instala en el útero",
    forMom: "Si tu regla no llega, haz una prueba de embarazo. Un sangrado muy leve puede ser normal; si es abundante o viene con dolor fuerte, llama a tu obstetra o ve a urgencias (el botón «Síntomas» te deja llamar a un toque).",
    forDad: "Si la prueba sale positiva, pide cita para su primer control prenatal (lo ideal es antes de la semana 10) y anótala en la Agenda.",
    together: "Si sale positiva, celébrenlo a su manera y decidan a quién se lo contarán primero y cuándo. No hay prisa.",
    note: "Medida aproximada: alrededor de 1 mm.",
  },
  {
    week: 5,
    size: { fruta: "Semilla de sésamo (ajonjolí)", geek: "Tornillo de laptop" },
    lengthCm: 0.2,
    weightG: null,
    milestone: "Se forman el tubo neural y un corazón primitivo",
    forMom: "Come poco y seguido y descansa cuando el cuerpo lo pida: pueden empezar el cansancio y las náuseas. Si tomas un medicamento habitual, no lo dejes por tu cuenta: anótalo para preguntarlo en tu primer control.",
    forDad: "Guarda en el equipo de salud de la app el teléfono de su obstetra o clínica: así las llamadas de «Síntomas» quedan a un toque. Y desde hoy, cargar las compras, mover muebles y limpiar con productos fuertes pasan a ser tareas tuyas.",
    together: "Vinculen sus dos teléfonos en Ajustes (la mamá comparte el código): así los dos ven la misma agenda, las mismas tareas y los avisos del otro.",
    note: "Hasta la semana 19 se mide sin las piernas, como en las ecografías.",
  },
  {
    week: 6,
    size: { fruta: "Lenteja", geek: "LED de indicador" },
    lengthCm: 0.5,
    weightG: null,
    milestone: "El latido suele empezar a verse en una ecografía transvaginal entre las semanas 6 y 7",
    forMom: "Si tienes náuseas, prueba galletas saladas antes de levantarte, comidas pequeñas y agua a sorbos. Si vomitas tanto que no retienes líquidos, llama hoy a tu obstetra o ve a urgencias.",
    forDad: "Deja galletas saladas y una botella de agua en su mesita de noche antes de dormir, y evita cocinar comidas de olor fuerte cuando ella esté en casa.",
    together: "Hagan una lista de las comidas que a ella le caen bien estos días y péguenla en el refrigerador: así cualquiera de los dos cocina sin preguntar.",
  },
  {
    week: 7,
    size: { fruta: "Arándano", geek: "Botón de un control" },
    lengthCm: 1,
    weightG: null,
    milestone: "El cerebro crece muy rápido y aparecen los esbozos de brazos y piernas",
    forMom: "Lleva una botella de agua contigo: orinar más seguido es normal, pero no dejes de hidratarte. Anota las dudas que te surjan para tu primer control.",
    forDad: "Arma con ella la lista de preguntas para el primer control (medicamentos, vitaminas, síntomas) y guárdala en la preparación de la cita.",
    together: "Repasen los antecedentes de salud de los dos y de sus familias (enfermedades, embarazos anteriores, alergias): en el primer control se los van a preguntar.",
  },
  {
    week: 8,
    size: { fruta: "Frambuesa", geek: "Dado de seis caras" },
    lengthCm: 1.6,
    weightG: 1,
    milestone: "Se forman los dedos y el embrión empieza a moverse, aunque aún no se siente",
    forMom: "Por estas semanas suele hacerse la primera ecografía. Guarda en Ajustes la fecha probable de parto que te den: es el dato más fiable para saber en qué semana estás.",
    forDad: "Pide el día libre o reorganiza tu agenda para acompañarla a la primera ecografía, y llévate las preguntas que anotaron.",
    together: "Después de la ecografía, escriban en el Diario unas líneas sobre lo que sintieron al verlo por primera vez.",
  },
  {
    week: 9,
    size: { fruta: "Cereza", geek: "Ficha de arcade" },
    lengthCm: 2.3,
    weightG: 2,
    milestone: "Se distinguen las articulaciones y empiezan a formarse los músculos",
    forMom: "Cámbiate a un sostén cómodo y sin aro si tus pechos están sensibles. Si te arde al orinar, llama hoy a tu obstetra.",
    forDad: "Si el olor no le molesta, cocina esta semana dos cenas con pescado bajo en mercurio, como salmón o sardina, bien cocido: aporta omega-3 para el cerebro del bebé.",
    together: "Hagan juntos la lista del súper con lo que conviene evitar (carnes crudas, quesos sin pasteurizar, pescados altos en mercurio) y lo que conviene sumar.",
  },
  {
    week: 10,
    size: { fruta: "Fresa", geek: "Memoria USB pequeña" },
    lengthCm: 3.1,
    weightG: 4,
    milestone: "Termina el periodo embrionario: los órganos principales ya están formados",
    forMom: "Pregúntale a tu obstetra qué pruebas de detección te ofrece en el primer trimestre. Algunas, como el análisis de ADN fetal en sangre, pueden hacerse desde esta semana.",
    forDad: "Averigua qué cubre el seguro o cuánto cuestan los controles y las ecografías, y empiecen a anotarlo en el Presupuesto.",
    together: "Hablen de qué pruebas de detección quieren hacerse y qué harían con los resultados. No hay respuesta correcta: es para llegar al control con una idea.",
  },
  {
    week: 11,
    size: { fruta: "Higo", geek: "Cubo de rompecabezas de llavero" },
    lengthCm: 4.1,
    weightG: 7,
    milestone: "Ya es un feto: se abre la ventana de la translucencia nucal (de la semana 11 a la 13 + 6 días)",
    forMom: "Ten a mano algo que te siente bien para comer entre horas y no te exijas una dieta perfecta: muchas náuseas aflojan entre la semana 12 y la 14.",
    forDad: "Si su obstetra la indicó, agenda la ecografía de translucencia nucal en la Agenda y confirma que puedes ir: la ventana es corta.",
    together: "Elijan un plan tranquilo para esta semana que no gire alrededor del embarazo: una caminata, una película o una cena en casa.",
  },
  {
    week: 12,
    size: { fruta: "Ciruela", geek: "Pila AA" },
    lengthCm: 5.4,
    weightG: 14,
    milestone: "Aparecen los primeros reflejos: abre y cierra los dedos",
    forMom: "Si las náuseas siguen fuertes, coméntalo en tu próximo control: hay opciones seguras para aliviarlas. Y si la ropa te aprieta en la cintura, pásate ya a prendas más holgadas.",
    forDad: "Averigua cuántos días de licencia por paternidad te corresponden en tu trabajo o en la ley de tu país y con cuánta anticipación debes avisar.",
    together: "Decidan cuándo y cómo darán la noticia a la familia y en sus trabajos. Que el momento lo elija ella.",
  },
  {
    week: 13,
    size: { fruta: "Limón", geek: "Figura de acción pequeña" },
    lengthCm: 7.4,
    weightG: 23,
    milestone: "Última semana del primer trimestre: empiezan a formarse las huellas dactilares",
    forMom: "Pregúntale a tu obstetra cómo serán los controles del segundo trimestre y cuándo toca la ecografía morfológica.",
    forDad: "Empiecen a hablar de qué cambios harán en casa y qué habrá que comprar. Haz una primera lista en el Presupuesto.",
    together: "Cierren el primer trimestre con algo para los dos: una foto de la barriga para el Diario o una salida que les guste.",
  },
  {
    week: 14,
    size: { fruta: "Durazno", geek: "Carta coleccionable" },
    lengthCm: 8.7,
    weightG: 43,
    milestone: "Empieza el segundo trimestre",
    forMom: "Aprovecha si recuperas energía: si tu obstetra no indica lo contrario, caminar de 20 a 30 minutos casi todos los días es un buen hábito.",
    forDad: "Propón una caminata de 20 minutos juntos tres veces esta semana y apártala en tu calendario como una cita más.",
    together: "Planeen algo especial para este trimestre, cuando suele haber más energía: una escapada corta o un día solo para ustedes.",
  },
  {
    week: 15,
    size: { fruta: "Manzana", geek: "Mouse de computadora" },
    lengthCm: 10.1,
    weightG: 70,
    milestone: "Sus huesos siguen endureciéndose y se mueve mucho, aunque todavía no se note",
    forMom: "Agenda tu limpieza dental: es segura en el embarazo y ayuda si te sangran las encías. Cuéntale al dentista que estás embarazada.",
    forDad: "Si se acerca la temporada de influenza, acompáñala a vacunarse y vacúnate tú también: la vacuna es segura en cualquier trimestre.",
    together: "Tengan una primera conversación sobre cómo se repartirán las tareas cuando llegue el bebé (noches, baños, cocina), sin cerrar nada todavía.",
  },
  {
    week: 16,
    size: { fruta: "Aguacate", geek: "Control de consola retro" },
    lengthCm: 11.6,
    weightG: 100,
    milestone: "Sus movimientos se coordinan; algunas mamás notan un primer aleteo",
    forMom: "Regálate un rato tranquilo cada día con las manos en la barriga: en un primer embarazo los movimientos suelen notarse entre las semanas 18 y 22, así que es normal no sentir nada aún.",
    forDad: "Empiecen con los nombres: agrega tus tres favoritos en Nombres y pídele que agregue los suyos; luego voten juntos.",
    together: "Hablen de qué tradiciones de sus familias quieren conservar con el bebé (comidas, celebraciones, canciones) y cuáles prefieren dejar.",
  },
  {
    week: 17,
    size: { fruta: "Granada", geek: "Teléfono celular pequeño" },
    lengthCm: 13,
    weightG: 140,
    milestone: "Empieza a acumular grasa y su esqueleto pasa de cartílago a hueso",
    forMom: "Ve acostumbrándote a dormir de lado, con una almohada entre las rodillas: desde el tercer trimestre es la postura recomendada.",
    forDad: "Consigue una almohada de embarazo en forma de U o C o, al menos, una almohada extra para que duerma de lado.",
    together: "Revisen el presupuesto del mes y separen un monto para lo del bebé, aunque sea pequeño. Anótenlo en el Presupuesto.",
  },
  {
    week: 18,
    size: { fruta: "Pimiento morrón", geek: "Teléfono celular" },
    lengthCm: 14.2,
    weightG: 190,
    milestone: "Se abre la ventana de la ecografía morfológica (semanas 18 a 22)",
    forMom: "Prepara tus preguntas para la ecografía morfológica, la más detallada: revisa la anatomía del bebé y la placenta. Si quieren saber el sexo, suele verse aquí.",
    forDad: "Agenda la ecografía morfológica en la Agenda, entre las semanas 18 y 22, y reserva ese día para acompañarla.",
    together: "Decidan si quieren saber el sexo del bebé y, si sí, cómo quieren enterarse: en la consulta, en un sobre o con alguien de confianza.",
  },
  {
    week: 19,
    size: { fruta: "Mango", geek: "Consola portátil clásica" },
    lengthCm: 15.3,
    weightG: 240,
    milestone: "Su piel se cubre de vérnix, una capa que la protege",
    forMom: "Levántate y cambia de postura despacio: las punzadas a los lados de la barriga suelen ser ligamentos que se estiran. Si el dolor es fuerte o no se va, llama a tu obstetra.",
    forDad: "Anota en la Agenda las fechas que vienen: la morfológica, la prueba de glucosa (semanas 24 a 28) y la vacuna Tdap (desde la 27).",
    together: "Elijan un curso de preparación para el parto, presencial o en línea, e inscríbanse: lo ideal es terminarlo antes de la semana 36.",
    note: "Desde la próxima semana se medirá de la cabeza a los talones.",
  },
  {
    week: 20,
    size: { fruta: "Plátano", geek: "Consola portátil grande" },
    lengthCm: 25.6,
    weightG: 300,
    milestone: "Mitad del embarazo: es la semana típica de la ecografía morfológica",
    forMom: "Tu útero llega a la altura del ombligo. Desde ahora evita los antiinflamatorios como el ibuprofeno o el naproxeno, salvo que tu obstetra los indique. Si te recetó aspirina en dosis baja, no la dejes sin hablar antes con tu obstetra.",
    forDad: "Después de la ecografía, guarden una imagen o unas líneas sobre cómo se sintieron en el Diario.",
    together: "Mitad del camino: escriba cada uno una carta corta al bebé y guárdenlas juntas para leerlas cuando nazca.",
    note: "Por eso el salto de longitud respecto a la semana 19.",
  },
  {
    week: 21,
    size: { fruta: "Zanahoria", geek: "Teclado inalámbrico delgado" },
    lengthCm: 26.7,
    weightG: 360,
    milestone: "Traga líquido amniótico y sus movimientos son más fuertes",
    forMom: "Si se te hinchan un poco los pies al final del día, eleva las piernas. Si la hinchazón es repentina en la cara o las manos, o viene con dolor de cabeza fuerte o visión borrosa, llama ya a tu obstetra o ve a urgencias.",
    forDad: "Confirmen en qué hospital nacerá el bebé y guarda su dirección y teléfono en el equipo de salud de la app.",
    together: "Hablen de cómo les gustaría vivir el parto (quién acompaña, manejo del dolor, el primer contacto) para tener una idea antes de empezar el plan de parto.",
  },
  {
    week: 22,
    size: { fruta: "Papaya pequeña", geek: "Tableta de 10 pulgadas" },
    lengthCm: 27.8,
    weightG: 430,
    milestone: "Se cierra la ventana habitual de la ecografía morfológica",
    forMom: "Si todavía no te hiciste la ecografía morfológica, pídela esta semana: la ventana habitual se cierra. Si ya te la hiciste, ten el informe a mano para tus controles.",
    forDad: "Si la morfológica no está agendada, llama hoy para pedirla. Si ya se hizo, revisen juntos el informe y anoten dudas para el próximo control.",
    together: "Hagan la lista de a quién avisarán cuando empiece el parto y cuando nazca el bebé, y decidan quién avisa a quién.",
  },
  {
    week: 23,
    size: { fruta: "Toronja", geek: "Tableta de 11 pulgadas" },
    lengthCm: 28.9,
    weightG: 500,
    milestone: "Empieza a oír sonidos de fuera",
    forMom: "Háblale o ponle música al bebé unos minutos al día: pronto empezará a reaccionar a los sonidos y es una forma sencilla de conectar.",
    forDad: "Háblale a la barriga unos minutos cada noche: léele un cuento o cuéntale tu día. Tu voz también se le vuelve familiar.",
    together: "Elijan una canción para el bebé y pónganla a menudo: más adelante será un ritual de los tres.",
  },
  {
    week: 24,
    size: { fruta: "Mazorca de maíz", geek: "Mango de espada láser de juguete" },
    lengthCm: 30,
    weightG: 600,
    milestone: "Sus pulmones y su cerebro siguen madurando; se abre la ventana de la prueba de glucosa (24 a 28)",
    forMom: "Pregúntale a tu obstetra cuándo toca la prueba de glucosa (semanas 24 a 28) y el análisis de anemia, y cómo debes prepararte.",
    forDad: "Anota la prueba de glucosa en la Agenda y acompáñala: puede tardar una hora o más. Lleva algo para que coma al terminar.",
    together: "Dense diez minutos sin pantallas para contarse cómo se sienten estos días: qué los tiene tranquilos y qué les preocupa.",
  },
  {
    week: 25,
    size: { fruta: "Nabo grande", geek: "Teclado mecánico compacto" },
    lengthCm: 31.7,
    weightG: 660,
    milestone: "Sus pulmones empiezan a producir surfactante",
    forMom: "Si te cuesta dormir, prueba una rutina fija y cenar ligero. Los calambres nocturnos son comunes: estira las piernas antes de acostarte.",
    forDad: "Revisen el Presupuesto: cuna, silla de auto y pañales. Cotiza tú al menos dos opciones de silla de auto.",
    together: "Decidan qué comprarán nuevo y qué pueden heredar o pedir prestado. La silla de auto, mejor nueva o de alguien que conozca su historial.",
  },
  {
    week: 26,
    size: { fruta: "Lechuga", geek: "Laptop de 11 pulgadas" },
    lengthCm: 33.3,
    weightG: 760,
    milestone: "Empieza a abrir los ojos",
    forMom: "Aprende a reconocer las contracciones de práctica: son irregulares y ceden con reposo. Si antes de la semana 37 tienes 4 o más en una hora, llama ya a tu obstetra.",
    forDad: "Abre con ella el contador de contracciones de la app y aprendan a usarlo: cuándo empezar, cuándo parar y qué hacer si hay 4 o más en una hora antes de la semana 37.",
    together: "Repasen las señales para ir a urgencias en «Síntomas» y guarden el teléfono del obstetra y del hospital en los dos celulares.",
  },
  {
    week: 27,
    size: { fruta: "Coliflor", geek: "Teclado sin bloque numérico" },
    lengthCm: 35,
    weightG: 875,
    milestone: "Se abre la ventana de la vacuna Tdap (semanas 27 a 36)",
    forMom: "Pide tu vacuna Tdap: protege al bebé contra la tos ferina en sus primeros meses. Se recomienda en cada embarazo, idealmente al inicio de esta ventana.",
    forDad: "Pregunta en tu centro de salud por tu propia vacuna Tdap y la de la influenza: quienes cuidarán al bebé deben tenerlas al día.",
    together: "Hagan la lista de quienes visitarán al bebé las primeras semanas y pídanles que tengan al día sus vacunas Tdap y de la influenza.",
  },
  {
    week: 28,
    size: { fruta: "Berenjena", geek: "Laptop de 13 pulgadas" },
    lengthCm: 36.6,
    weightG: 1000,
    milestone: "Empieza el tercer trimestre y el conteo diario de movimientos",
    forMom: "Desde esta semana puedes contar movimientos una vez al día con el contador de patadas. Si tu sangre es Rh negativo, pregúntale a tu obstetra por la inmunoglobulina anti-D, que suele aplicarse hacia esta semana.",
    forDad: "Acompáñala en el conteo de patadas en un momento tranquilo del día y aprende qué hacer si nota menos movimientos: es motivo para llamar enseguida.",
    together: "Elijan un momento fijo del día para el conteo de movimientos: así se vuelve rutina y no se olvida.",
  },
  {
    week: 29,
    size: { fruta: "Calabaza alargada", geek: "Laptop de 14 pulgadas" },
    lengthCm: 38.3,
    weightG: 1150,
    milestone: "Gana peso más rápido y sus patadas se sienten con fuerza",
    forMom: "Si aparece la acidez, come poco y seguido, no te acuestes justo después de comer y eleva un poco la cabecera de la cama.",
    forDad: "Averigua si el hospital que eligieron ofrece visitas guiadas o charlas para parejas, e inscríbanse.",
    together: "Pónganse de acuerdo en cómo quieren las primeras semanas en casa (visitas, ayuda de la familia, descanso) antes de que alguien pregunte.",
  },
  {
    week: 30,
    size: { fruta: "Repollo", geek: "Laptop de 15 pulgadas" },
    lengthCm: 39.9,
    weightG: 1300,
    milestone: "Su cerebro madura rápido y acumula grasa bajo la piel",
    forMom: "Descansa un rato cada día con las piernas en alto y empieza a pensar qué quieres en tu plan de parto.",
    forDad: "Arma la cuna o el lugar donde dormirá el bebé: boca arriba, colchón firme y sin almohadas, peluches ni protectores.",
    together: "Elijan al pediatra del bebé: pidan recomendaciones y, si pueden, agenden una visita para conocerlo antes del parto.",
  },
  {
    week: 31,
    size: { fruta: "Coco", geek: "Teclado completo con reposamuñecas" },
    lengthCm: 41.1,
    weightG: 1500,
    milestone: "Sus sentidos funcionan y duerme en ciclos",
    forMom: "Empieza el borrador de tu plan de parto en la app: acompañante, manejo del dolor y contacto piel con piel. No hay respuestas correctas; es para conversarlo con tu obstetra.",
    forDad: "Lee el borrador del plan de parto con ella y apunta qué te toca a ti: avisar a la familia, cuidar mascotas o hijos, llevar la maleta.",
    together: "Practiquen una técnica de respiración o relajación cinco minutos al día: les servirá en el parto y, desde ya, para dormir mejor.",
  },
  {
    week: 32,
    size: { fruta: "Papaya grande", geek: "Barra de sonido compacta" },
    lengthCm: 42.4,
    weightG: 1700,
    milestone: "Practica la respiración y suele empezar a colocarse cabeza abajo",
    forMom: "Pregúntale a tu obstetra por la protección contra el VSR (virus respiratorio sincitial): según el país y la temporada, es una vacuna para ti entre las semanas 32 y 36 o un anticuerpo para el bebé al nacer.",
    forDad: "Instala la silla de auto y revisa que quede firme: al moverla con la mano desde donde pasa el cinturón o el anclaje, no debe desplazarse más de 2,5 cm (una pulgada) de lado a lado ni hacia adelante. Si pueden, que la revise un técnico certificado.",
    together: "Anoten en la Agenda los controles que vienen: en esta etapa suelen ser cada dos semanas.",
  },
  {
    week: 33,
    size: { fruta: "Piña", geek: "Consola de sobremesa compacta" },
    lengthCm: 43.7,
    weightG: 1900,
    milestone: "Sus huesos se endurecen, salvo los del cráneo, que siguen flexibles para el parto",
    forMom: "Empieza a preparar tu maleta del hospital con la lista de la app: documentos, ropa cómoda y cosas para el bebé.",
    forDad: "Prepara tu parte de la maleta: cargador con cable largo, ropa para ti, algo de comer, dinero o tarjeta para el estacionamiento y copias de los documentos.",
    together: "Decidan quién cuidará a sus mascotas o a sus hijos mayores durante el parto y dejen las indicaciones por escrito.",
  },
  {
    week: 34,
    size: { fruta: "Melón cantalupo", geek: "Laptop gamer" },
    lengthCm: 45,
    weightG: 2150,
    milestone: "Sus pulmones maduran rápidamente",
    forMom: "Repasa con tu obstetra cuándo ir al hospital: sangrado, salida de líquido, menos movimientos o contracciones regulares.",
    forDad: "Haz la ruta al hospital de día y de noche, mide el tiempo y confirma por qué puerta se entra de madrugada y dónde estacionar.",
    together: "Pregunten si el hospital permite registrarse antes y guarden copias de sus documentos (identificaciones, seguro, estudios) en la maleta y en el teléfono.",
  },
  {
    week: 35,
    size: { fruta: "Melón verde", geek: "Laptop gamer de 16 pulgadas" },
    lengthCm: 46.2,
    weightG: 2400,
    milestone: "Gana unos 200 gramos por semana y le queda poco espacio",
    forMom: "Presta atención a las patadas: pueden sentirse como empujones o estiramientos, pero no deberían disminuir. Si notas menos movimientos, llama ya a tu obstetra o ve a urgencias.",
    forDad: "Pregunta en el próximo control cuándo toca el cultivo de estreptococo del grupo B (suele hacerse entre las semanas 36 y 37) y agéndalo.",
    together: "Hablen de la lactancia (qué esperan, qué les preocupa) y anoten a quién pedir ayuda: una asesora de lactancia o el hospital.",
  },
  {
    week: 36,
    size: { fruta: "Racimo de plátanos", geek: "Laptop gamer de 17 pulgadas" },
    lengthCm: 47.4,
    weightG: 2600,
    milestone: "Cultivo de estreptococo del grupo B y controles semanales",
    forMom: "Desde ahora los controles suelen ser semanales. El cultivo de estreptococo del grupo B es un hisopado rápido; si sale positivo, te darán antibióticos durante el parto.",
    forDad: "Deja la maleta junto a la puerta o en el auto y el tanque con gasolina. Confirma que el teléfono de su obstetra y la dirección del hospital estén en el equipo de salud de la app.",
    together: "Repasen el plan para el día del parto (quién maneja, a quién avisar, qué pasa con el trabajo) hasta que los dos lo sepan de memoria.",
  },
  {
    week: 37,
    size: { fruta: "Calabaza mediana", geek: "Consola de sobremesa" },
    lengthCm: 48.6,
    weightG: 2850,
    milestone: "Término temprano: el parto puede empezar en cualquier momento",
    forMom: "Repasa la regla 5-1-1: contracciones cada 5 minutos, que duran 1 minuto, durante 1 hora. Ante sangrado, salida de líquido o menos movimientos, no esperes: llama. Si no es tu primer parto, pregúntale a tu obstetra si debes salir antes.",
    forDad: "Ten el teléfono cargado y con sonido, y acuerda en tu trabajo cómo avisarás si tienes que salir de golpe. Repasa la guía rápida para el acompañante del contador de contracciones.",
    together: "Aprendan las señales de alarma después del parto (sangrado abundante, fiebre, dolor de cabeza fuerte, tristeza que no se va): también importan cuando el bebé ya nació.",
  },
  {
    week: 38,
    size: { fruta: "Sandía mini", geek: "Torre de PC compacta" },
    lengthCm: 49.8,
    weightG: 3100,
    milestone: "Sus órganos están listos para funcionar fuera del útero",
    forMom: "Duerme siestas y deja que otros se encarguen de las tareas: el descanso de estas semanas cuenta. Es normal sentir más presión en la pelvis cuando el bebé encaja.",
    forDad: "Congela algunas comidas para las primeras semanas en casa y organiza quién ayudará con las tareas cuando vuelvan del hospital.",
    together: "Dejen listo lo de la primera noche en casa: dónde dormirá el bebé, pañales, ropa y un lugar para cambiarlo.",
  },
  {
    week: 39,
    size: { fruta: "Melón grande", geek: "Consola de sobremesa grande" },
    lengthCm: 50.7,
    weightG: 3300,
    milestone: "Embarazo a término completo",
    forMom: "Si dudas de si es trabajo de parto, cronometra las contracciones con el contador y llama a tu obstetra.",
    forDad: "Practiquen juntos la respiración y el masaje en la zona lumbar para las contracciones: tú llevas el cronómetro y ella marca el ritmo.",
    together: "Dense un rato para ustedes dos antes de ser tres: una cena tranquila en casa o una caminata, con el teléfono a mano.",
  },
  {
    week: 40,
    size: { fruta: "Sandía pequeña", geek: "Consola de sobremesa grande" },
    lengthCm: 51.2,
    weightG: 3450,
    milestone: "Fecha probable de parto: pocos bebés nacen justo ese día",
    forMom: "Sigue contando movimientos cada día y descansa: solo una minoría de bebés nace en la fecha probable y es normal llegar a la semana 41.",
    forDad: "Responde tú los mensajes de familia y amigos para que ella descanse, y propón planes tranquilos cerca de casa, con todo listo para salir.",
    together: "Acuerden un mensaje corto para quienes pregunten «¿y todavía nada?», que cualquiera de los dos pueda enviar sin pensarlo.",
  },
  {
    week: 41,
    size: { fruta: "Sandía pequeña", geek: "Consola de sobremesa grande con un control" },
    lengthCm: 51.7,
    weightG: 3600,
    milestone: "Término tardío: controles más seguidos y conversación sobre la inducción",
    forMom: "Es habitual que tu obstetra indique controles más seguidos (monitoreo y revisión del líquido amniótico) y hable contigo de inducir el parto. Pregunta qué opciones tienes y cuándo. Sigue contando movimientos cada día.",
    forDad: "Acompáñala a los controles de esta semana y anoten preguntas sobre la inducción: cómo se hace, cuánto puede durar y cuándo ir al hospital.",
    together: "Revisen la maleta y el plan de parto por si una inducción cambia algo, y confirmen quién los acompañará.",
    note: "Desde la semana 41 se habla de embarazo de término tardío. El bebé ya casi no crece en longitud.",
  },
  {
    week: 42,
    size: { fruta: "Sandía pequeña", geek: "Consola de sobremesa grande con dos controles" },
    lengthCm: 51.7,
    weightG: 3700,
    milestone: "Postérmino: el parto suele inducirse antes o durante esta semana",
    forMom: "Sigue las indicaciones de tu equipo de salud y cuenta movimientos cada día. Si notas menos movimientos, sangrado o salida de líquido, llama ya a tu obstetra o ve al hospital.",
    forDad: "Si ya programaron la inducción, confirma con el hospital la fecha y la hora y ten la maleta en el auto. Encárgate tú de avisar a la familia.",
    together: "Cuéntense cómo llevan la espera, que la impaciencia es normal, y repasen cuándo ir al hospital sin esperar a la próxima cita.",
  },
];

/** Datos exactos de la semana (sin buscar "la anterior más cercana"). Acota a 1..42. */
export function getWeek(week: number): WeekInfo {
  return WEEKS[clampWeek(week) - 1];
}

/** Qué mide `lengthCm`: coronilla-rabadilla (5–19), cabeza-talón (20+) o nada (1–4). */
export function lengthMeasure(week: number): "coronilla-rabadilla" | "cabeza-talon" | null {
  const w = clampWeek(week);
  if (w <= 4) return null;
  return w <= 19 ? "coronilla-rabadilla" : "cabeza-talon";
}

/** Longitud para mostrar: "4 mm", "1.6 cm", "51.2 cm", "Menos de 1 mm" o "—" (semanas 1–2). */
export function formatLength(info: Pick<WeekInfo, "week" | "lengthCm">): string {
  const cm = info.lengthCm;
  if (cm === null || !Number.isFinite(cm)) return info.week <= 2 ? "—" : "Menos de 1 mm";
  if (cm < 1) return `${Math.round(cm * 10)} mm`;
  return `${Number.isInteger(cm) ? cm : cm.toFixed(1)} cm`;
}

/** Peso para mostrar: "14 g", "3450 g", "Menos de 1 g" o "—" (semanas 1–2). */
export function formatWeight(info: Pick<WeekInfo, "week" | "weightG">): string {
  const g = info.weightG;
  if (g === null || !Number.isFinite(g)) return info.week <= 2 ? "—" : "Menos de 1 g";
  return `${Math.round(g)} g`;
}

// Emoji decorativo SOLO para ilustrar la tarjeta de PandaStory (vacío si no hay uno fiel).
// Los textos de WeekInfo no llevan emoji.
const SIZE_EMOJI_FRUTA: Record<number, string> = {
  7: "🫐", 9: "🍒", 10: "🍓", 13: "🍋", 14: "🍑", 15: "🍎", 16: "🥑", 18: "🫑", 19: "🥭", 20: "🍌",
  21: "🥕", 24: "🌽", 26: "🥬", 28: "🍆", 30: "🥬", 31: "🥥", 33: "🍍", 34: "🍈", 35: "🍈", 36: "🍌",
  38: "🍉", 39: "🍈", 40: "🍉", 41: "🍉", 42: "🍉",
};
const SIZE_EMOJI_GEEK: Record<number, string> = {
  1: "⏳", 4: "🖊️", 5: "🔩", 7: "🎮", 8: "🎲", 9: "🪙", 12: "🔋", 14: "🃏", 15: "🖱️", 16: "🎮",
  17: "📱", 18: "📱", 19: "🕹️", 20: "🎮", 21: "⌨️", 25: "⌨️", 26: "💻", 27: "⌨️", 28: "💻", 29: "💻",
  30: "💻", 31: "⌨️", 32: "🔊", 33: "🎮", 34: "💻", 35: "💻", 36: "💻", 37: "🎮", 38: "🖥️", 39: "🎮",
  40: "🎮", 41: "🎮", 42: "🎮",
};

/** Emoji ilustrativo del tamaño (decorativo; "" si no hay uno que represente bien el objeto). */
export function sizeEmoji(week: number, theme: "frutas" | "geek" = "frutas"): string {
  const w = clampWeek(week);
  return (theme === "geek" ? SIZE_EMOJI_GEEK : SIZE_EMOJI_FRUTA)[w] ?? "";
}
