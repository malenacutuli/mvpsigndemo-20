// Complete Spanish Elmo captions data
export interface CaptionWord {
  text: string;
  startTime: number;
  endTime: number;
  emphasis: "normal" | "loud" | "quiet";
  pitch: "normal" | "high" | "low";
}

export interface CaptionSegment {
  text: string;
  speaker: 'chef' | 'narrator' | 'child' | 'teacher' | 'hero' | 'Elmo' | 'Smarty';
  startTime: number;
  endTime: number;
  words: CaptionWord[];
}

export const spanishElmoCaptions: CaptionSegment[] = [
  {
    text: "Hola. Bienvenidos a El Mundo de Elmo.",
    speaker: 'Elmo',
    startTime: 5.04,
    endTime: 8.4,
    words: [
      { text: "Hola.", startTime: 5.04, endTime: 5.44, emphasis: "normal", pitch: "normal" },
      { text: "Bienvenidos", startTime: 5.84, endTime: 6.68, emphasis: "normal", pitch: "normal" },
      { text: "a", startTime: 6.68, endTime: 6.84, emphasis: "normal", pitch: "normal" },
      { text: "El", startTime: 6.84, endTime: 7.0, emphasis: "normal", pitch: "normal" },
      { text: "Mundo", startTime: 7.0, endTime: 7.28, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 7.28, endTime: 7.64, emphasis: "normal", pitch: "normal" },
      { text: "Elmo.", startTime: 7.64, endTime: 8.4, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Adivinen lo que Elmo está pensando el día de hoy.",
    speaker: 'Elmo',
    startTime: 8.8,
    endTime: 12.16,
    words: [
      { text: "Adivinen", startTime: 8.8, endTime: 9.64, emphasis: "normal", pitch: "normal" },
      { text: "lo", startTime: 9.64, endTime: 9.68, emphasis: "normal", pitch: "normal" },
      { text: "que", startTime: 9.68, endTime: 9.76, emphasis: "normal", pitch: "normal" },
      { text: "Elmo", startTime: 9.76, endTime: 10.12, emphasis: "normal", pitch: "normal" },
      { text: "está", startTime: 10.12, endTime: 10.36, emphasis: "normal", pitch: "normal" },
      { text: "pensando", startTime: 10.36, endTime: 11.0, emphasis: "normal", pitch: "normal" },
      { text: "el", startTime: 11.0, endTime: 11.24, emphasis: "normal", pitch: "normal" },
      { text: "día", startTime: 11.24, endTime: 11.48, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 11.48, endTime: 11.72, emphasis: "normal", pitch: "normal" },
      { text: "hoy.", startTime: 11.72, endTime: 12.16, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Disfruten el paseo. Gallina.",
    speaker: 'Elmo',
    startTime: 27.32,
    endTime: 29.0,
    words: [
      { text: "Disfruten", startTime: 27.32, endTime: 28.16, emphasis: "normal", pitch: "normal" },
      { text: "el", startTime: 28.16, endTime: 28.28, emphasis: "normal", pitch: "normal" },
      { text: "paseo.", startTime: 28.28, endTime: 28.52, emphasis: "normal", pitch: "normal" },
      { text: "Gallina.", startTime: 28.52, endTime: 29.0, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Vaya. Elmo quiere saber todo sobre los choferes de",
    speaker: 'Elmo',
    startTime: 33.08,
    endTime: 36.12,
    words: [
      { text: "Vaya.", startTime: 33.08, endTime: 33.56, emphasis: "normal", pitch: "normal" },
      { text: "Elmo", startTime: 33.56, endTime: 34.12, emphasis: "normal", pitch: "normal" },
      { text: "quiere", startTime: 34.12, endTime: 34.48, emphasis: "normal", pitch: "normal" },
      { text: "saber", startTime: 34.48, endTime: 34.76, emphasis: "normal", pitch: "normal" },
      { text: "todo", startTime: 34.76, endTime: 35.0, emphasis: "normal", pitch: "normal" },
      { text: "sobre", startTime: 35.0, endTime: 35.2, emphasis: "normal", pitch: "normal" },
      { text: "los", startTime: 35.2, endTime: 35.36, emphasis: "normal", pitch: "normal" },
      { text: "choferes", startTime: 35.36, endTime: 35.96, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 35.96, endTime: 36.12, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "autobús. Preguntémosle a la amiga de Elmo,",
    speaker: 'Elmo',
    startTime: 36.12,
    endTime: 39.2,
    words: [
      { text: "autobús.", startTime: 36.12, endTime: 36.84, emphasis: "normal", pitch: "normal" },
      { text: "Preguntémosle", startTime: 37.16, endTime: 38.2, emphasis: "normal", pitch: "normal" },
      { text: "a", startTime: 38.2, endTime: 38.28, emphasis: "normal", pitch: "normal" },
      { text: "la", startTime: 38.28, endTime: 38.36, emphasis: "normal", pitch: "normal" },
      { text: "amiga", startTime: 38.36, endTime: 38.6, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 38.6, endTime: 38.72, emphasis: "normal", pitch: "normal" },
      { text: "Elmo,", startTime: 38.72, endTime: 39.2, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Smarty. Llamémosla juntos.",
    speaker: 'Elmo',
    startTime: 39.2,
    endTime: 41.8,
    words: [
      { text: "Smarty.", startTime: 39.2, endTime: 40.24, emphasis: "normal", pitch: "normal" },
      { text: "Llamémosla", startTime: 40.24, endTime: 41.24, emphasis: "normal", pitch: "normal" },
      { text: "juntos.", startTime: 41.24, endTime: 41.8, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Esta parada es Al Mundo de Elmo.",
    speaker: 'Smarty',
    startTime: 49.32,
    endTime: 51.52,
    words: [
      { text: "Esta", startTime: 49.32, endTime: 49.64, emphasis: "normal", pitch: "normal" },
      { text: "parada", startTime: 49.64, endTime: 50.08, emphasis: "normal", pitch: "normal" },
      { text: "es", startTime: 50.08, endTime: 50.28, emphasis: "normal", pitch: "normal" },
      { text: "Al", startTime: 50.28, endTime: 50.52, emphasis: "normal", pitch: "normal" },
      { text: "Mundo", startTime: 50.52, endTime: 50.76, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 50.76, endTime: 50.96, emphasis: "normal", pitch: "normal" },
      { text: "Elmo.", startTime: 50.96, endTime: 51.52, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Cuidado al bajar.",
    speaker: 'Smarty',
    startTime: 51.52,
    endTime: 52.44,
    words: [
      { text: "Cuidado", startTime: 51.52, endTime: 51.96, emphasis: "normal", pitch: "normal" },
      { text: "al", startTime: 51.96, endTime: 52.04, emphasis: "normal", pitch: "normal" },
      { text: "bajar.", startTime: 52.04, endTime: 52.44, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Oh, hola, Elmo.",
    speaker: 'Smarty',
    startTime: 52.96,
    endTime: 54.64,
    words: [
      { text: "Oh,", startTime: 52.96, endTime: 53.2, emphasis: "normal", pitch: "normal" },
      { text: "hola,", startTime: 53.44, endTime: 53.92, emphasis: "normal", pitch: "normal" },
      { text: "Elmo.", startTime: 53.92, endTime: 54.64, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Hola, Smarty. Guau.",
    speaker: 'Elmo',
    startTime: 54.72,
    endTime: 56.72,
    words: [
      { text: "Hola,", startTime: 54.72, endTime: 55.12, emphasis: "normal", pitch: "normal" },
      { text: "Smarty.", startTime: 55.12, endTime: 56.2, emphasis: "normal", pitch: "normal" },
      { text: "Guau.", startTime: 56.2, endTime: 56.72, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Smarty es chofer de autobús.",
    speaker: 'Elmo',
    startTime: 57.44,
    endTime: 59.36,
    words: [
      { text: "Smarty", startTime: 57.44, endTime: 58.08, emphasis: "normal", pitch: "normal" },
      { text: "es", startTime: 58.08, endTime: 58.16, emphasis: "normal", pitch: "normal" },
      { text: "chofer", startTime: 58.16, endTime: 58.56, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 58.56, endTime: 58.8, emphasis: "normal", pitch: "normal" },
      { text: "autobús.", startTime: 58.8, endTime: 59.36, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Así es. Los teléfonos somos muy móviles.",
    speaker: 'Smarty',
    startTime: 59.36,
    endTime: 62.8,
    words: [
      { text: "Así", startTime: 59.36, endTime: 59.76, emphasis: "normal", pitch: "normal" },
      { text: "es.", startTime: 59.84, endTime: 60.24, emphasis: "normal", pitch: "normal" },
      { text: "Los", startTime: 60.72, endTime: 61.0, emphasis: "normal", pitch: "normal" },
      { text: "teléfonos", startTime: 61.0, endTime: 61.56, emphasis: "normal", pitch: "normal" },
      { text: "somos", startTime: 61.56, endTime: 61.88, emphasis: "normal", pitch: "normal" },
      { text: "muy", startTime: 61.88, endTime: 62.12, emphasis: "normal", pitch: "normal" },
      { text: "móviles.", startTime: 62.12, endTime: 62.8, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Smarty, Elmo quiere saber más sobre los choferes de autobús.",
    speaker: 'Elmo',
    startTime: 63.68,
    endTime: 67.28,
    words: [
      { text: "Smarty,", startTime: 63.68, endTime: 64.36, emphasis: "normal", pitch: "normal" },
      { text: "Elmo", startTime: 64.36, endTime: 64.8, emphasis: "normal", pitch: "normal" },
      { text: "quiere", startTime: 64.8, endTime: 65.12, emphasis: "normal", pitch: "normal" },
      { text: "saber", startTime: 65.12, endTime: 65.4, emphasis: "normal", pitch: "normal" },
      { text: "más", startTime: 65.4, endTime: 65.56, emphasis: "normal", pitch: "normal" },
      { text: "sobre", startTime: 65.56, endTime: 65.8, emphasis: "normal", pitch: "normal" },
      { text: "los", startTime: 65.8, endTime: 66.04, emphasis: "normal", pitch: "normal" },
      { text: "choferes", startTime: 66.04, endTime: 66.64, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 66.64, endTime: 66.72, emphasis: "normal", pitch: "normal" },
      { text: "autobús.", startTime: 66.72, endTime: 67.28, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "¿Qué hacemos para aprender algo nuevo? No.",
    speaker: 'Smarty',
    startTime: 67.28,
    endTime: 70.08,
    words: [
      { text: "¿Qué", startTime: 67.28, endTime: 67.48, emphasis: "normal", pitch: "normal" },
      { text: "hacemos", startTime: 67.48, endTime: 67.88, emphasis: "normal", pitch: "normal" },
      { text: "para", startTime: 67.88, endTime: 68.12, emphasis: "normal", pitch: "normal" },
      { text: "aprender", startTime: 68.12, endTime: 68.44, emphasis: "normal", pitch: "normal" },
      { text: "algo", startTime: 68.44, endTime: 68.759, emphasis: "normal", pitch: "normal" },
      { text: "nuevo?", startTime: 68.759, endTime: 69.199, emphasis: "normal", pitch: "normal" },
      { text: "No.", startTime: 69.68, endTime: 70.08, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Demos un paseo y aprendamos sobre los choferes de autobús. Aquí vamos.",
    speaker: 'Smarty',
    startTime: 72.56,
    endTime: 76.72,
    words: [
      { text: "Demos", startTime: 72.56, endTime: 73.08, emphasis: "normal", pitch: "normal" },
      { text: "un", startTime: 73.08, endTime: 73.24, emphasis: "normal", pitch: "normal" },
      { text: "paseo", startTime: 73.24, endTime: 73.72, emphasis: "normal", pitch: "normal" },
      { text: "y", startTime: 73.72, endTime: 73.84, emphasis: "normal", pitch: "normal" },
      { text: "aprendamos", startTime: 73.84, endTime: 74.32, emphasis: "normal", pitch: "normal" },
      { text: "sobre", startTime: 74.32, endTime: 74.56, emphasis: "normal", pitch: "normal" },
      { text: "los", startTime: 74.56, endTime: 74.68, emphasis: "normal", pitch: "normal" },
      { text: "choferes", startTime: 74.68, endTime: 75.32, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 75.32, endTime: 75.44, emphasis: "normal", pitch: "normal" },
      { text: "autobús.", startTime: 75.44, endTime: 76.0, emphasis: "normal", pitch: "normal" },
      { text: "Aquí", startTime: 76.0, endTime: 76.32, emphasis: "normal", pitch: "normal" },
      { text: "vamos.", startTime: 76.32, endTime: 76.72, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Un chofer de autobús conduce un autobús por una ruta.",
    speaker: 'Smarty',
    startTime: 78.16,
    endTime: 81.36,
    words: [
      { text: "Un", startTime: 78.16, endTime: 78.48, emphasis: "normal", pitch: "normal" },
      { text: "chofer", startTime: 78.48, endTime: 78.96, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 78.96, endTime: 79.2, emphasis: "normal", pitch: "normal" },
      { text: "autobús", startTime: 79.2, endTime: 79.64, emphasis: "normal", pitch: "normal" },
      { text: "conduce", startTime: 79.64, endTime: 80.08, emphasis: "normal", pitch: "normal" },
      { text: "un", startTime: 80.08, endTime: 80.2, emphasis: "normal", pitch: "normal" },
      { text: "autobús", startTime: 80.2, endTime: 80.68, emphasis: "normal", pitch: "normal" },
      { text: "por", startTime: 80.68, endTime: 80.84, emphasis: "normal", pitch: "normal" },
      { text: "una", startTime: 80.84, endTime: 81.0, emphasis: "normal", pitch: "normal" },
      { text: "ruta.", startTime: 81.0, endTime: 81.36, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Se detiene en la parada del autobús para recoger pasajeros.",
    speaker: 'Smarty',
    startTime: 81.84,
    endTime: 84.71,
    words: [
      { text: "Se", startTime: 81.84, endTime: 82.12, emphasis: "normal", pitch: "normal" },
      { text: "detiene", startTime: 82.12, endTime: 82.64, emphasis: "normal", pitch: "normal" },
      { text: "en", startTime: 82.64, endTime: 82.72, emphasis: "normal", pitch: "normal" },
      { text: "la", startTime: 82.72, endTime: 82.8, emphasis: "normal", pitch: "normal" },
      { text: "parada", startTime: 82.8, endTime: 83.08, emphasis: "normal", pitch: "normal" },
      { text: "del", startTime: 83.08, endTime: 83.24, emphasis: "normal", pitch: "normal" },
      { text: "autobús", startTime: 83.24, endTime: 83.72, emphasis: "normal", pitch: "normal" },
      { text: "para", startTime: 83.72, endTime: 83.84, emphasis: "normal", pitch: "normal" },
      { text: "recoger", startTime: 83.84, endTime: 84.28, emphasis: "normal", pitch: "normal" },
      { text: "pasajeros.", startTime: 84.28, endTime: 84.71, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Los pasajeros pagan su viaje cuando suben. Y empieza el viaje por la ciudad.",
    speaker: 'Smarty',
    startTime: 85.5,
    endTime: 90.06,
    words: [
      { text: "Los", startTime: 85.5, endTime: 85.62, emphasis: "normal", pitch: "normal" },
      { text: "pasajeros", startTime: 85.62, endTime: 86.22, emphasis: "normal", pitch: "normal" },
      { text: "pagan", startTime: 86.22, endTime: 86.66, emphasis: "normal", pitch: "normal" },
      { text: "su", startTime: 86.66, endTime: 86.82, emphasis: "normal", pitch: "normal" },
      { text: "viaje", startTime: 86.82, endTime: 87.18, emphasis: "normal", pitch: "normal" },
      { text: "cuando", startTime: 87.18, endTime: 87.38, emphasis: "normal", pitch: "normal" },
      { text: "suben.", startTime: 87.38, endTime: 88.06, emphasis: "normal", pitch: "normal" },
      { text: "Y", startTime: 88.06, endTime: 88.14, emphasis: "normal", pitch: "normal" },
      { text: "empieza", startTime: 88.14, endTime: 88.62, emphasis: "normal", pitch: "normal" },
      { text: "el", startTime: 88.62, endTime: 88.86, emphasis: "normal", pitch: "normal" },
      { text: "viaje", startTime: 88.86, endTime: 89.14, emphasis: "normal", pitch: "normal" },
      { text: "por", startTime: 89.14, endTime: 89.26, emphasis: "normal", pitch: "normal" },
      { text: "la", startTime: 89.26, endTime: 89.38, emphasis: "normal", pitch: "normal" },
      { text: "ciudad.", startTime: 89.38, endTime: 90.06, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "No olvides su parada.",
    speaker: 'Smarty',
    startTime: 90.22,
    endTime: 91.58,
    words: [
      { text: "No", startTime: 90.22, endTime: 90.46, emphasis: "normal", pitch: "normal" },
      { text: "olvides", startTime: 90.46, endTime: 91.06, emphasis: "normal", pitch: "normal" },
      { text: "su", startTime: 91.06, endTime: 91.18, emphasis: "normal", pitch: "normal" },
      { text: "parada.", startTime: 91.18, endTime: 91.58, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Un chofer de autobús puede incluso llevarse a paradas muy lejanas.",
    speaker: 'Smarty',
    startTime: 92.14,
    endTime: 96.06,
    words: [
      { text: "Un", startTime: 92.14, endTime: 92.54, emphasis: "normal", pitch: "normal" },
      { text: "chofer", startTime: 92.54, endTime: 92.94, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 92.94, endTime: 93.14, emphasis: "normal", pitch: "normal" },
      { text: "autobús", startTime: 93.14, endTime: 93.66, emphasis: "normal", pitch: "normal" },
      { text: "puede", startTime: 93.66, endTime: 93.86, emphasis: "normal", pitch: "normal" },
      { text: "incluso", startTime: 93.86, endTime: 94.14, emphasis: "normal", pitch: "normal" },
      { text: "llevarse", startTime: 94.14, endTime: 94.58, emphasis: "normal", pitch: "normal" },
      { text: "a", startTime: 94.58, endTime: 94.74, emphasis: "normal", pitch: "normal" },
      { text: "paradas", startTime: 94.74, endTime: 95.18, emphasis: "normal", pitch: "normal" },
      { text: "muy", startTime: 95.18, endTime: 95.3, emphasis: "normal", pitch: "normal" },
      { text: "lejanas.", startTime: 95.3, endTime: 96.06, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Un chofer de autobús escolar te lleva a la escuela.",
    speaker: 'Smarty',
    startTime: 96.22,
    endTime: 99.02,
    words: [
      { text: "Un", startTime: 96.22, endTime: 96.5, emphasis: "normal", pitch: "normal" },
      { text: "chofer", startTime: 96.5, endTime: 96.86, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 96.86, endTime: 97.06, emphasis: "normal", pitch: "normal" },
      { text: "autobús", startTime: 97.06, endTime: 97.54, emphasis: "normal", pitch: "normal" },
      { text: "escolar", startTime: 97.54, endTime: 97.9, emphasis: "normal", pitch: "normal" },
      { text: "te", startTime: 97.9, endTime: 98.06, emphasis: "normal", pitch: "normal" },
      { text: "lleva", startTime: 98.06, endTime: 98.26, emphasis: "normal", pitch: "normal" },
      { text: "a", startTime: 98.26, endTime: 98.38, emphasis: "normal", pitch: "normal" },
      { text: "la", startTime: 98.38, endTime: 98.5, emphasis: "normal", pitch: "normal" },
      { text: "escuela.", startTime: 98.5, endTime: 99.02, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Y cuando termina el día, el chofer del autobús escolar está ahí para llevarte a casa.",
    speaker: 'Smarty',
    startTime: 99.42,
    endTime: 103.66,
    words: [
      { text: "Y", startTime: 99.42, endTime: 99.66, emphasis: "normal", pitch: "normal" },
      { text: "cuando", startTime: 99.66, endTime: 99.82, emphasis: "normal", pitch: "normal" },
      { text: "termina", startTime: 99.82, endTime: 100.5, emphasis: "normal", pitch: "normal" },
      { text: "el", startTime: 100.5, endTime: 100.54, emphasis: "normal", pitch: "normal" },
      { text: "día,", startTime: 100.54, endTime: 100.74, emphasis: "normal", pitch: "normal" },
      { text: "el", startTime: 100.74, endTime: 100.979, emphasis: "normal", pitch: "normal" },
      { text: "chofer", startTime: 100.979, endTime: 101.46, emphasis: "normal", pitch: "normal" },
      { text: "del", startTime: 101.46, endTime: 101.7, emphasis: "normal", pitch: "normal" },
      { text: "autobús", startTime: 101.7, endTime: 102.18, emphasis: "normal", pitch: "normal" },
      { text: "escolar", startTime: 102.18, endTime: 102.58, emphasis: "normal", pitch: "normal" },
      { text: "está", startTime: 102.58, endTime: 102.74, emphasis: "normal", pitch: "normal" },
      { text: "ahí", startTime: 102.74, endTime: 102.94, emphasis: "normal", pitch: "normal" },
      { text: "para", startTime: 102.94, endTime: 103.06, emphasis: "normal", pitch: "normal" },
      { text: "llevarte", startTime: 103.06, endTime: 103.54, emphasis: "normal", pitch: "normal" },
      { text: "a", startTime: 103.54, endTime: 103.66, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "casa. Nos vemos mañana.",
    speaker: 'Smarty',
    startTime: 103.66,
    endTime: 105.58,
    words: [
      { text: "casa.", startTime: 103.66, endTime: 103.98, emphasis: "normal", pitch: "normal" },
      { text: "Nos", startTime: 104.54, endTime: 104.78, emphasis: "normal", pitch: "normal" },
      { text: "vemos", startTime: 104.78, endTime: 105.02, emphasis: "normal", pitch: "normal" },
      { text: "mañana.", startTime: 105.02, endTime: 105.58, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Los choferes de autobús son muy amables. Sí que lo son.",
    speaker: 'Elmo',
    startTime: 109.42,
    endTime: 113.3,
    words: [
      { text: "Los", startTime: 109.42, endTime: 109.66, emphasis: "normal", pitch: "normal" },
      { text: "choferes", startTime: 109.66, endTime: 110.38, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 110.38, endTime: 110.5, emphasis: "normal", pitch: "normal" },
      { text: "autobús", startTime: 110.5, endTime: 111.02, emphasis: "normal", pitch: "normal" },
      { text: "son", startTime: 111.02, endTime: 111.26, emphasis: "normal", pitch: "normal" },
      { text: "muy", startTime: 111.26, endTime: 111.46, emphasis: "normal", pitch: "normal" },
      { text: "amables.", startTime: 111.46, endTime: 111.82, emphasis: "normal", pitch: "normal" },
      { text: "Sí", startTime: 112.42, endTime: 112.62, emphasis: "normal", pitch: "normal" },
      { text: "que", startTime: 112.62, endTime: 112.78, emphasis: "normal", pitch: "normal" },
      { text: "lo", startTime: 112.78, endTime: 112.98, emphasis: "normal", pitch: "normal" },
      { text: "son.", startTime: 112.98, endTime: 113.3, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Parece que es hora de cambiar de rumbo. Este autobús tiene un horario que cumplir.",
    speaker: 'Smarty',
    startTime: 113.62,
    endTime: 117.86,
    words: [
      { text: "Parece", startTime: 113.62, endTime: 114.1, emphasis: "normal", pitch: "normal" },
      { text: "que", startTime: 114.1, endTime: 114.22, emphasis: "normal", pitch: "normal" },
      { text: "es", startTime: 114.22, endTime: 114.34, emphasis: "normal", pitch: "normal" },
      { text: "hora", startTime: 114.34, endTime: 114.54, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 114.54, endTime: 114.7, emphasis: "normal", pitch: "normal" },
      { text: "cambiar", startTime: 114.7, endTime: 114.98, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 114.98, endTime: 115.22, emphasis: "normal", pitch: "normal" },
      { text: "rumbo.", startTime: 115.22, endTime: 115.7, emphasis: "normal", pitch: "normal" },
      { text: "Este", startTime: 115.7, endTime: 115.9, emphasis: "normal", pitch: "normal" },
      { text: "autobús", startTime: 115.9, endTime: 116.46, emphasis: "normal", pitch: "normal" },
      { text: "tiene", startTime: 116.46, endTime: 116.62, emphasis: "normal", pitch: "normal" },
      { text: "un", startTime: 116.62, endTime: 116.78, emphasis: "normal", pitch: "normal" },
      { text: "horario", startTime: 116.78, endTime: 117.1, emphasis: "normal", pitch: "normal" },
      { text: "que", startTime: 117.1, endTime: 117.34, emphasis: "normal", pitch: "normal" },
      { text: "cumplir.", startTime: 117.34, endTime: 117.86, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Nos vemos luego, Elmo.",
    speaker: 'Smarty',
    startTime: 117.94,
    endTime: 119.46,
    words: [
      { text: "Nos", startTime: 117.94, endTime: 118.18, emphasis: "normal", pitch: "normal" },
      { text: "vemos", startTime: 118.18, endTime: 118.38, emphasis: "normal", pitch: "normal" },
      { text: "luego,", startTime: 118.38, endTime: 118.82, emphasis: "normal", pitch: "normal" },
      { text: "Elmo.", startTime: 118.82, endTime: 119.46, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Feliz viaje. Vaya, Elmo desearía ser chofer de autobús.",
    speaker: 'Elmo',
    startTime: 120.18,
    endTime: 125.86,
    words: [
      { text: "Feliz", startTime: 120.18, endTime: 120.62, emphasis: "normal", pitch: "normal" },
      { text: "viaje.", startTime: 120.62, endTime: 121.3, emphasis: "normal", pitch: "normal" },
      { text: "Vaya,", startTime: 122.66, endTime: 123.18, emphasis: "normal", pitch: "normal" },
      { text: "Elmo", startTime: 123.18, endTime: 123.86, emphasis: "normal", pitch: "normal" },
      { text: "desearía", startTime: 123.86, endTime: 124.34, emphasis: "normal", pitch: "normal" },
      { text: "ser", startTime: 124.34, endTime: 124.46, emphasis: "normal", pitch: "normal" },
      { text: "chofer", startTime: 124.46, endTime: 124.9, emphasis: "normal", pitch: "normal" },
      { text: "de", startTime: 124.9, endTime: 125.18, emphasis: "normal", pitch: "normal" },
      { text: "autobús.", startTime: 125.18, endTime: 125.86, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "A Elmo se le ocurrió una idea.",
    speaker: 'Elmo',
    startTime: 127.54,
    endTime: 129.7,
    words: [
      { text: "A", startTime: 127.54, endTime: 127.82, emphasis: "normal", pitch: "normal" },
      { text: "Elmo", startTime: 127.82, endTime: 128.22, emphasis: "normal", pitch: "normal" },
      { text: "se", startTime: 128.22, endTime: 128.419, emphasis: "normal", pitch: "normal" },
      { text: "le", startTime: 128.419, endTime: 128.5, emphasis: "normal", pitch: "normal" },
      { text: "ocurrió", startTime: 128.5, endTime: 129.06, emphasis: "normal", pitch: "normal" },
      { text: "una", startTime: 129.06, endTime: 129.3, emphasis: "normal", pitch: "normal" },
      { text: "idea.", startTime: 129.3, endTime: 129.7, emphasis: "normal", pitch: "normal" }
    ]
  },
  {
    text: "Vamos a jugar un juego juntos. Sí. Sigan a Elmo.",
    speaker: 'Elmo',
    startTime: 130.82,
    endTime: 135.3,
    words: [
      { text: "Vamos", startTime: 130.82, endTime: 131.18, emphasis: "normal", pitch: "normal" },
      { text: "a", startTime: 131.18, endTime: 131.34, emphasis: "normal", pitch: "normal" },
      { text: "jugar", startTime: 131.34, endTime: 131.7, emphasis: "normal", pitch: "normal" },
      { text: "un", startTime: 131.7, endTime: 131.86, emphasis: "normal", pitch: "normal" },
      { text: "juego", startTime: 131.86, endTime: 132.38, emphasis: "normal", pitch: "normal" },
      { text: "juntos.", startTime: 132.38, endTime: 132.9, emphasis: "normal", pitch: "normal" },
      { text: "Sí.", startTime: 132.9, endTime: 133.38, emphasis: "normal", pitch: "normal" },
      { text: "Sigan", startTime: 134.02, endTime: 134.54, emphasis: "normal", pitch: "normal" },
      { text: "a", startTime: 134.54, endTime: 134.74, emphasis: "normal", pitch: "normal" },
      { text: "Elmo.", startTime: 134.74, endTime: 135.3, emphasis: "normal", pitch: "normal" }
    ]
  }
];