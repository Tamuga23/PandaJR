export function getWeekData(week: number, theme: "frutas"|"geek" = "frutas") {
  const data = [
      { week: 4, size: { frutas: "Semilla de amapola 🌑", geek: "Dado D20 en miniatura 🎲" }, len: "0.1 cm", weight: "1 g" },
      { week: 8, size: { frutas: "Frambuesa 🍓", geek: "Ficha de LEGO de 1x1 🧱" }, len: "1.6 cm", weight: "1 g" },
      { week: 12, size: { frutas: "Ciruela 🍑", geek: "Dado D6 estándar 🎲" }, len: "5.4 cm", weight: "14 g" },
      { week: 14, size: { frutas: "Limón 🍋", geek: "Goma de borrar ✏️" }, len: "8.7 cm", weight: "43 g" },
      { week: 16, size: { frutas: "Aguacate 🥑", geek: "Mouse de computadora 🖱️" }, len: "11.6 cm", weight: "100 g" },
      { week: 20, size: { frutas: "Plátano 🍌", geek: "Control de Nintendo Switch (Joy-Con) 🎮" }, len: "25.6 cm", weight: "300 g" },
      { week: 24, size: { frutas: "Mazorca de maíz 🌽", geek: "Sable de luz (mango) 🔦" }, len: "30.0 cm", weight: "600 g" },
      { week: 27, size: { frutas: "Vegetal nutritivo 🥦", geek: "iPad Mini 📱" }, len: "33.8 cm", weight: "2922 g" },
      { week: 30, size: { frutas: "Repollo 🥬", geek: "Casco de realidad virtual 🥽" }, len: "39.9 cm", weight: "1319 g" },
      { week: 34, size: { frutas: "Melón cantalupo 🍈", geek: "Consola Steam Deck 🕹️" }, len: "45.0 cm", weight: "2146 g" },
      { week: 40, size: { frutas: "Sandía pequeña 🍉", geek: "PlayStation 5 (en proporción) 🎮" }, len: "51.2 cm", weight: "3462 g" },
    ];
  let closest = data[0];
  for (let d of data) {
    if (d.week <= week) closest = d;
  }
  return {
    size: closest.size[theme] || closest.size.frutas,
    length: closest.len,
    weight: closest.weight,
    milestone: week <= 12 ? "Fin de la organogénesis crítica" : week <= 20 ? "Glándula tiroides funcional" : "Desarrollo de sentidos y corteza cerebral",
    momMission: week <= 12 ? "Tu cuerpo está formando órganos vitales. Prioriza descanso, ácido fólico y evita cargar peso." : week <= 24 ? "Tu bebé ya escucha tu voz. Mantén una dieta rica en hierro y calcio, y camina 20 min diarios." : "Practica ejercicios de Kegel, usa la almohada de embarazo para dormir y prepara tu plan de parto.",
    dadMission: week <= 12 ? "El cerebro fetal triplica su sinapsis. Prepara cenas ricas en Colina (huevos) y DHA (salmón)." : "Ten lista la logística de transporte, tanque de gasolina lleno y números de emergencia a mano."
  };
}