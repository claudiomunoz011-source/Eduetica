import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export type AnswerType = 'moral' | 'inmoral' | 'amoral' | 'negligente' | 'ignorancia';

export interface GeneratedDilemma {
  scenario: string;
  question: string;
  correct_answer: AnswerType;
  explanation: string;
  options_hint?: string;
}

export interface SocraticResponse {
  message: string;
  is_final: boolean;
  understood?: boolean;
  student_was_correct?: boolean;
}

export interface ConversationTurn {
  role: 'tutor' | 'student';
  message: string;
  turn_number?: number;
  timestamp: string;
}

// ── Constants ────────────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish', de: 'German', fr: 'French', en: 'English',
};

const TOPIC_CONTEXT: Record<string, string> = {
  climate:       'Climate change, environmental responsibility, and ecological ethics',
  animals:       'Animal rights, welfare, and moral consideration of non-human beings',
  cyberbullying: 'Cyberbullying, digital ethics, and responsibility in online spaces',
  justice:       'Justice, fairness, equity, and social ethics',
  corruption:    'Corruption, civic ethics, public duty, and institutional trust',
  euthanasia:    'Euthanasia, end-of-life decisions, autonomy, and medical ethics',
  abortion:      'Abortion, reproductive rights, personhood, and bodily autonomy',
  deathPenalty:  'Death penalty, state justice, retribution, and human rights',
};

// ── Age Level Instructions ───────────────────────────────────

function getAgeLevel(age: number): { level: number; tutorInstructions: string; label: string } {
  if (age >= 8 && age <= 11) {
    return {
      level: 1,
      label: 'Nivel 1 (8-11)',
      tutorInstructions: `
NIVEL DE EDAD: Niño/a de 8-11 años.
ESTILO DE COMUNICACIÓN:
- Usa un lenguaje muy simple, cálido y cercano.
- Emplea metáforas del mundo cotidiano del niño: la familia, el colegio, los amigos, los juegos.
- Evita términos filosóficos o académicos. Si necesitas uno, explícalo con un ejemplo.
- Usa preguntas cortas y directas: "¿Tú qué harías si...?", "¿Y si un amigo tuyo hiciera eso?".
- Sé muy alentador y nunca uses un tono de reproche.
- Ejemplo de metáfora aceptada: "Es como cuando sabes que debes ordenar tu cuarto pero lo dejas para después."
- Máximo 3 oraciones por respuesta del tutor.`,
    };
  } else if (age <= 13) {
    return {
      level: 2,
      label: 'Nivel 2 (12-13)',
      tutorInstructions: `
NIVEL DE EDAD: Preadolescente de 12-13 años.
ESTILO DE COMUNICACIÓN:
- Lenguaje claro pero con mayor complejidad que el nivel anterior.
- Introduce conceptos como "consecuencias", "intención", "responsabilidad".
- Preguntas que inviten a pensar en perspectivas de otros: "¿Cómo crees que se siente la otra persona?", "¿Y si las consecuencias afectan a más gente?"
- Puedes hacer referencias a situaciones escolares, redes sociales o deportes.
- Tono motivador pero que exige reflexión genuina.
- Máximo 4 oraciones por respuesta del tutor.`,
    };
  } else {
    return {
      level: 3,
      label: 'Nivel 3 (14-18)',
      tutorInstructions: `
NIVEL DE EDAD: Adolescente de 14-18 años.
ESTILO DE COMUNICACIÓN:
- Lenguaje filosófico y académico accesible. Puedes usar términos como "autonomía", "imperativo categórico", "utilitarismo", "dilema moral".
- Exige argumentación: "¿Qué principio ético estás aplicando?", "Eso sería válido bajo qué marco teórico?"
- Aplica la mayéutica socrática con rigor: cada respuesta del alumno debe ser cuestionada desde un ángulo diferente.
- Puedes introducir la técnica del "Universalizador" de Kant: "¿Qué pasaría si todos actuaran exactamente igual en esa situación?"
- Presión dialéctica progresiva: el turno 2 debe ser más exigente que el turno 1.
- Máximo 5 oraciones por respuesta del tutor.`,
    };
  }
}

// ── Answer type labels for the prompt ───────────────────────

const ANSWER_LABELS: Record<string, string> = {
  moral:       'Moral (intentionally good act)',
  inmoral:     'Immoral (intentionally bad act)',
  amoral:      'Amoral (outside the moral domain)',
  negligente:  'Negligence by Lazy Will (knew what was right but too lazy to act)',
  ignorancia:  'Vincible Ignorance (could have known better with reasonable effort)',
};

// ── Dilemma Generation ───────────────────────────────────────

export async function generateDilemma(
  topic: string,
  ageGroup: 'junior' | 'senior',
  language: string,
  ragContext: string = '',
  exclude: string[] = [],
  customApiKey?: string
): Promise<GeneratedDilemma> {
  const activeKey = customApiKey || GEMINI_API_KEY;
  if (!activeKey) return getFallbackDilemma(topic, language, exclude);

  try {
    const client = new GoogleGenerativeAI(activeKey);
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const langName = LANGUAGE_NAMES[language] || 'Spanish';
    const topicContext = TOPIC_CONTEXT[topic] || topic;
    const ageContext = ageGroup === 'junior'
      ? 'for students aged 8-13 years. Use simple, engaging language and avoid mature/graphic content. The scenario should feel relatable to a child or preteen.'
      : 'for students aged 14-18 years. Use sophisticated language and nuanced, realistic situations that challenge critical thinking.';

    const ragSection = ragContext
      ? `\n\nACAdemic Knowledge Base (use this as your theoretical foundation):\n${ragContext.slice(0, 8000)}`
      : '';

    const excludeSection = exclude.length > 0
      ? `\n\nCRITICAL SCENARIO EXCLUSION: Do NOT repeat, copy, or generate any of the following scenarios/stories (they have already been completed by the student):
${exclude.map((s) => `- "${s}"`).join('\n')}`
      : '';

    const prompt = `You are an ethics educator creating content ${ageContext}.
Topic: ${topicContext}${ragSection}${excludeSection}

Create a SHORT ethical dilemma story (3-4 sentences) featuring a named character making a decision.
The student must classify the character's conduct using exactly one of these 5 categories:
- moral: action performed with good intent, knowing the moral norm and acting to fulfill it.
- inmoral: action performed with bad intent, actively and deliberately violating moral norms or seeking to harm/exploit others (e.g. stealing, lying, cheating).
- amoral: action outside the moral domain (done by animals, infants, or purely instinctive/reflexive actions).
- negligente: negligence by lazy will (Akrasia). The character knows the correct moral duty/action but fails to act or omits their duty simply due to comfort, laziness, apathy, or lack of willpower (e.g. seeing someone in minor trouble and ignoring them to avoid effort, not recycling out of convenience).
- ignorancia: vincible ignorance. The character does not know the moral norm, but they could have easily known it with reasonable effort (they chose not to inform themselves).

CRITICAL DISTINCTION:
- INMORAL means actively choosing to do bad/harm.
- NEGLIGENTE means knowing what is good but failing to do it out of sheer laziness or comfort.

IMPORTANT: 
- Write in ${langName}
- The scenario must have ONE clear correct classification
- Make the classification non-obvious to encourage reflection
- Do NOT include the answer in the scenario text

Respond ONLY with valid JSON (no markdown fences):
{
  "scenario": "<narrative 3-4 sentences>",
  "question": "<how would you classify [character]'s conduct? in ${langName}>",
  "correct_answer": "<moral|inmoral|amoral|negligente|ignorancia>",
  "explanation": "<2-3 sentence academic explanation why this classification is correct>",
  "options_hint": "<optional brief hint to guide thinking without revealing answer>"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(text) as GeneratedDilemma;
    const valid: AnswerType[] = ['moral', 'inmoral', 'amoral', 'negligente', 'ignorancia'];
    if (!valid.includes(parsed.correct_answer)) parsed.correct_answer = 'moral';
    return parsed;
  } catch (error) {
    console.error('[Gemini] Dilemma generation error:', error);
    return getFallbackDilemma(topic, language, exclude);
  }
}

// ── Socratic Chat ─────────────────────────────────────────────

export async function generateSocraticResponse(params: {
  topic: string;
  age: number;
  language: string;
  dilemmaScenario: string;
  selectedAnswer: AnswerType;
  correctAnswer: AnswerType;
  history: ConversationTurn[];
  studentMessage: string;
  turnNumber: number;
  ragContext?: string;
  customApiKey?: string;
}): Promise<SocraticResponse> {
  const activeKey = params.customApiKey || GEMINI_API_KEY;
  if (!activeKey) {
    return getFallbackSocraticResponse(params.turnNumber, params.age, params.selectedAnswer, params.correctAnswer);
  }

  try {
    const client = new GoogleGenerativeAI(activeKey);
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const langName = LANGUAGE_NAMES[params.language] || 'Spanish';
    const { level, tutorInstructions, label } = getAgeLevel(params.age);
    const ragSection = params.ragContext
      ? `\nACADEMIC FRAMEWORK:\n${params.ragContext.slice(0, 6000)}`
      : '';

    const historyText = params.history
      .map((t) => `${t.role === 'tutor' ? 'TUTOR' : 'STUDENT'}: ${t.message}`)
      .join('\n');

    let systemInstructions = '';

    if (params.turnNumber >= 6) {
      // Force final verdict at turn 6
      systemInstructions = `
You are a Socratic ethics tutor and logic teacher. This is the FINAL VERDICT (maximum turns reached).
${tutorInstructions}
${ragSection}

Strict ethical definitions to apply:
- moral: intentionally good act.
- inmoral: intentionally bad/harmful act.
- amoral: outside the moral domain (natural, instinctive).
- negligente: knows the duty but fails to act out of laziness/convenience (Akrasia).
- ignorancia: could have known with reasonable effort but did not bother.

The student originally classified the conduct as: "${ANSWER_LABELS[params.selectedAnswer]}"
The correct classification is: "${ANSWER_LABELS[params.correctAnswer]}"

Now, act as a logic teacher and deliver the final verdict:
1. Provide a final evaluation of the student's arguments across the dialogue.
2. In your response, clearly state the CORRECT classification, explain why it is correct based on the academic framework, and contrast it directly with their choice if they were wrong.
3. Keep an encouraging but clear educational tone.
4. Write in ${langName}.
5. Match the vocabulary level: ${label}.

Evaluate: based on the entire dialogue, did the student demonstrate a clear understanding of the concept?
Set "understood": true if the student showed genuine comprehension in their arguments (even if they initially chose wrong).
Set "student_was_correct": true if their ORIGINAL selected answer matches the correct answer.

Respond ONLY with valid JSON:
{
  "message": "<your final verdict message in ${langName}>",
  "is_final": true,
  "understood": <true|false>,
  "student_was_correct": <true|false>
}`;
    } else if (params.turnNumber <= 3) {
      // Force Socratic question (turns 1, 2, 3)
      const isTurn1 = params.turnNumber === 1;
      systemInstructions = `
You are a Socratic ethics tutor and logic teacher. This is Turn ${params.turnNumber} of the dialogue.
${tutorInstructions}
${ragSection}

STRICT RULES:
- Do NOT reveal whether the student's original classification choice is correct or incorrect yet. Keep them in suspense.
- Do NOT use phrases like "you're right", "that's wrong", "the correct answer is...".
- Write in ${langName}.
- Match the vocabulary level: ${label}.

ROLE AS A LOGIC TEACHER:
${isTurn1 ? `
- This is the beginning of the chat. The student just selected their answer choice: "${ANSWER_LABELS[params.selectedAnswer]}".
- Ask the FIRST probing question to get the student to justify their decision. Ask them to explain the reasoning, intent, or principles behind their choice.
` : `
- Read the student's latest message: "${params.studentMessage}"
- First, write a brief comment (1-2 sentences) evaluating the logical validity of their argument. Point out if it is logically sound (solid) or if there are weaknesses, contradictions, fallacies, or gaps in their reasoning (weak). Act as an educational logic teacher helping them learn how to construct solid arguments.
- Then, ask a coherent follow-up question that builds on their response and challenges them to think deeper or distinguish key concepts (e.g. active malice vs. laziness of will, or consequences vs. intent).
`}

DILEMMA: ${params.dilemmaScenario}
STUDENT'S CLASSIFICATION: "${ANSWER_LABELS[params.selectedAnswer]}" (do NOT mention if correct)

CONVERSATION SO FAR:
${historyText}

Respond ONLY with valid JSON:
{
  "message": "<your logic comment (if not Turn 1) + Socratic question in ${langName}>",
  "is_final": false,
  "understood": null,
  "student_was_correct": null
}`;
    } else {
      // Dynamic Turn 4 or 5: The tutor can choose to continue (ask next question) or finalize (give verdict)
      systemInstructions = `
You are a Socratic ethics tutor and logic teacher. This is Turn ${params.turnNumber} (dynamic choice to continue or finalize).
${tutorInstructions}
${ragSection}

Strict ethical definitions to apply:
- moral: intentionally good act.
- inmoral: intentionally bad/harmful act.
- amoral: outside the moral domain (natural, instinctive).
- negligente: knows the duty but fails to act out of laziness/convenience (Akrasia).
- ignorancia: could have known with reasonable effort but did not bother.

The student originally classified the conduct as: "${ANSWER_LABELS[params.selectedAnswer]}"
The correct classification is: "${ANSWER_LABELS[params.correctAnswer]}"

DILEMMA: ${params.dilemmaScenario}
CONVERSATION SO FAR:
${historyText}
STUDENT'S LATEST MESSAGE: "${params.studentMessage}"

YOUR DYNAMIC CHOICE:
Evaluate the student's argument. You can choose to EITHER:
A) Continue the dialogue (if you feel a further question would help their learning, or if their reasoning is still incomplete/needs challenge).
   In this case, set "is_final": false. Write a brief comment on the logic of their argument (solid or weak) and ask the next probing question.
B) Finalize the dialogue (if they have successfully justified their answer, or if they are stuck/repeating themselves and further turns won't help).
   In this case, set "is_final": true. Deliver the final verdict: clearly state the CORRECT classification, explain why it is correct based on the academic framework, and contrast it with their choice. Evaluate "understood": true/false based on their reasoning.

Write in ${langName} matching the vocabulary level: ${label}.

Respond ONLY with valid JSON:
{
  "message": "<your next question OR your final verdict in ${langName}>",
  "is_final": <true|false>,
  "understood": <true|false|null depending on is_final>,
  "student_was_correct": <true|false|null depending on is_final>
}`;
    }

    const result = await model.generateContent(systemInstructions);
    const text = result.response.text().replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(text) as SocraticResponse;
    // Enforce strict deterministic evaluation of correctness on backend side
    parsed.student_was_correct = params.selectedAnswer === params.correctAnswer;
    return parsed;
  } catch (error) {
    console.error('[Gemini] Socratic response error:', error);
    return getFallbackSocraticResponse(params.turnNumber, params.age, params.selectedAnswer, params.correctAnswer);
  }
}

// ── Fallbacks ────────────────────────────────────────────────

export const FALLBACK_POOL: Record<string, GeneratedDilemma[]> = {
  climate: [
    {
      scenario: 'Camila sabe que su fábrica contamina el río local. Podría instalar filtros, pero son costosos. Decide seguir operando sin cambios porque "la empresa siempre lo ha hecho así" y nunca se preocupó por buscar alternativas más baratas.',
      question: '¿Cómo clasificarías la conducta de Camila?',
      correct_answer: 'negligente',
      explanation: 'Camila actúa por negligencia con voluntad perezosa: sabía del daño ambiental pero no se esforzó por buscar soluciones. Tenía la información y los medios potenciales, pero la pereza de voluntad le impidió actuar correctamente.',
      options_hint: 'Piensa: ¿Camila no sabía del daño, o simplemente no quiso actuar?',
    },
    {
      scenario: 'Lucas compra botellas de agua todos los días y las tira a la basura normal porque le da pereza caminar una cuadra hasta el contenedor de reciclaje de plástico, a pesar de conocer el daño que causa.',
      question: '¿Cómo clasificarías la conducta de Lucas?',
      correct_answer: 'negligente',
      explanation: 'Lucas actúa por negligencia con voluntad perezosa: conoce el deber de reciclar y tiene el contenedor cerca, pero prefiere no hacer el esfuerzo por mera comodidad o pereza.',
      options_hint: 'El deber de reciclar es conocido, pero Lucas decide omitirlo por flojera.',
    },
    {
      scenario: 'Sofía descubre que un compañero de taller tira aceite usado al desagüe del patio. Decide confrontarlo calmadamente, explicarle el daño que hace y regalarle un bidón para recolectar el aceite y llevarlo a un punto verde.',
      question: '¿Cómo clasificarías la conducta de Sofía?',
      correct_answer: 'moral',
      explanation: 'Sofía actúa moralmente: identifica una acción perjudicial y asume la responsabilidad de educar y proveer una alternativa positiva para cuidar el entorno de manera constructiva.',
      options_hint: 'Sofía busca promover un bien ecológico a través de la educación y el apoyo práctico.',
    }
  ],
  animals: [
    {
      scenario: 'Un científico experimenta con ratones para desarrollar una vacuna que salvaría millones de vidas humanas. Es consciente del sufrimiento que causa pero sigue el protocolo ético establecido y minimiza el dolor en lo posible.',
      question: '¿Cómo clasificarías la conducta del científico?',
      correct_answer: 'moral',
      explanation: 'El científico actúa moralmente: sigue protocolos éticos de bienestar animal, minimiza el sufrimiento y persigue un bien mayor y justificado como es salvar vidas humanas.',
      options_hint: '¿El seguir protocolos éticos de reducción de daño cambia el juicio moral?',
    },
    {
      scenario: 'Pedro ve a un perro herido en la calle que fue atropellado. Sabe que existe un número de rescate municipal gratuito pero decide no llamar por no interrumpir su partida de videojuego.',
      question: '¿Cómo clasificarías la conducta de Pedro?',
      correct_answer: 'negligente',
      explanation: 'Pedro actúa por negligencia por voluntad perezosa: sabe del deber de ayudar y tiene un medio fácil para hacerlo (una llamada telefónica), pero decide omitirlo por pura desidia.',
      options_hint: 'Pedro no causó el daño, pero decide no actuar a pesar de tener un deber moral sencillo.',
    },
    {
      scenario: 'Javier adopta un perro de cachorro pero, al ver que crece y requiere demasiados cuidados, decide dejarlo atado a un árbol en una carretera solitaria por la noche para librarse del problema.',
      question: '¿Cómo clasificarías la conducta de Javier?',
      correct_answer: 'inmoral',
      explanation: 'Javier actúa de forma inmoral: abandona conscientemente a un ser indefenso a su suerte, violando deliberadamente el principio de responsabilidad y causando daño directo al animal.',
      options_hint: 'Javier toma una decisión activa que perjudica gravemente y a sabiendas a otra criatura.',
    }
  ],
  cyberbullying: [
    {
      scenario: 'Martín crea un perfil falso en redes sociales para difundir fotos humillantes e insultos sobre un compañero de clase con el fin de arruinar su reputación por diversión.',
      question: '¿Cómo clasificarías la conducta de Martín?',
      correct_answer: 'inmoral',
      explanation: 'Martín actúa de forma inmoral: tiene la intención directa y consciente de dañar emocionalmente a su compañero para satisfacer su propia diversión y popularidad.',
      options_hint: 'Aquí hay una intención directa de causar daño y humillar en línea.',
    },
    {
      scenario: 'Valeria ve que en el grupo de chat del colegio están acosando e insultando gravemente a una compañera. Decide intervenir en el chat pidiendo respeto y reporta el grupo a los administradores escolares.',
      question: '¿Cómo clasificarías la conducta de Valeria?',
      correct_answer: 'moral',
      explanation: 'Valeria actúa moralmente: asume el deber de proteger a su compañera y defender la dignidad humana, enfrentándose al acoso de forma activa y constructiva.',
      options_hint: 'Valeria interviene activamente para detener una injusticia.',
    },
    {
      scenario: 'Esteban nota que sus amigos comparten memes ofensivos sobre un compañero en un grupo. Sabe que está mal y que debería pedirles que paren, pero no escribe nada para no generar tensión ni incomodarse.',
      question: '¿Cómo clasificarías la conducta de Esteban?',
      correct_answer: 'negligente',
      explanation: 'Esteban actúa por negligencia con voluntad perezosa: es consciente de que el meme es acoso y de su deber de no ser cómplice, pero prefiere guardar silencio por comodidad social.',
      options_hint: 'Esteban sabe que está mal, pero omite su deber de actuar para evitarse molestias.',
    }
  ],
  justice: [
    {
      scenario: 'Un inspector de colegio descubre a dos alumnos peleando. En lugar de sancionar a ambos por igual, indaga la situación y descubre que uno solo se defendía de un asalto físico, aplicando medidas justas a cada uno.',
      question: '¿Cómo clasificarías la conducta del inspector?',
      correct_answer: 'moral',
      explanation: 'El inspector actúa moralmente y de forma justa: aplica equidad y discernimiento en lugar de una regla ciega, buscando proteger al agredido y corregir de forma proporcional.',
      options_hint: 'La justicia real requiere analizar el contexto y la legítima defensa de los involucrados.',
    },
    {
      scenario: 'Diego se salta la fila del almuerzo escolar de manera disimulada aprovechando que la encargada de la cafetería está de espaldas, dejando a otros alumnos esperando más tiempo.',
      question: '¿Cómo clasificarías la conducta de Diego?',
      correct_answer: 'inmoral',
      explanation: 'Diego actúa de forma inmoral: decide violar deliberada y conscientemente las normas comunes de convivencia para obtener un beneficio egoísta en perjuicio de los demás.',
      options_hint: 'Diego comete una falta intencional a la justicia común por conveniencia propia.',
    },
    {
      scenario: 'Un profesor nota que uno de sus alumnos de escasos recursos tiene problemas para hacer las tareas virtuales. Decide buscar opciones y le gestiona un préstamo de tablet en la biblioteca del colegio en lugar de reprobarlo sin más.',
      question: '¿Cómo clasificarías la conducta del profesor?',
      correct_answer: 'moral',
      explanation: 'El profesor actúa de forma moral y equitativa: identifica una desigualdad y busca una alternativa concreta de apoyo para restablecer la justicia y la igualdad de oportunidades.',
      options_hint: 'El profesor aplica equidad para dar a su alumno lo que necesita para competir en igualdad.',
    }
  ]
};

export function getFallbackDilemma(topic: string, language: string, exclude: string[] = []): GeneratedDilemma {
  // Use climate as fallback topic if the requested one has no pool defined
  const pool = FALLBACK_POOL[topic] || FALLBACK_POOL['climate'];
  
  // Find the first dilemma in the pool whose scenario is NOT in the exclude list
  const available = pool.filter(d => !exclude.includes(d.scenario));
  
  if (available.length > 0) {
    return available[0];
  }
  
  // If all are excluded, recycle and return the first one
  return pool[0];
}

export function getFallbackSocraticResponse(
  turnNumber: number,
  age: number,
  selectedAnswer?: string,
  correctAnswer?: string
): SocraticResponse {
  const { level } = getAgeLevel(age);
  const turn = Math.min(turnNumber, 4);
  const isFinal = turn === 4;

  if (isFinal && selectedAnswer && correctAnswer) {
    const isCorrect = selectedAnswer === correctAnswer;
    const answerLabelSelected = ANSWER_LABELS[selectedAnswer] || selectedAnswer;
    const answerLabelCorrect = ANSWER_LABELS[correctAnswer] || correctAnswer;

    let message = '';
    if (isCorrect) {
      if (level === 1) {
        message = `¡Excelente! Clasificaste el caso correctamente como "${answerLabelCorrect}". ¡Pensaste muy bien sobre lo que hizo el personaje! ¡Sigue así!`;
      } else if (level === 2) {
        message = `¡Muy buen trabajo! Tu clasificación de "${answerLabelCorrect}" es totalmente correcta. Has demostrado que comprendes los elementos clave de la intención y la responsabilidad en este dilema.`;
      } else {
        message = `Correcto. La clasificación del dilema es efectivamente "${answerLabelCorrect}". A través de tu análisis has identificado correctamente la intencionalidad y las circunstancias éticas del caso, demostrando un excelente discernimiento moral.`;
      }
    } else {
      // Correcting the student clearly, providing reasons and definitions
      if (level === 1) {
        message = `Buen intento, pero elegiste "${answerLabelSelected}" cuando la respuesta correcta era "${answerLabelCorrect}". Recuerda: en este caso el personaje sabía cuál era su deber pero no lo hizo simplemente por flojera (Negligencia), no porque quisiera hacer daño directo (Inmoral). ¡La próxima te irá mejor!`;
      } else if (level === 2) {
        message = `Gracias por tu razonamiento, pero hay un error: clasificaste el caso como "${answerLabelSelected}" y la respuesta correcta es "${answerLabelCorrect}". Esto se debe a que el personaje conocía su deber moral y omitió actuar por comodidad o desidia (negligencia de la voluntad). No hubo una intención maliciosa directa (inmoralidad), sino debilidad ante el esfuerzo.`;
      } else {
        message = `Tu clasificación fue "${answerLabelSelected}", pero la resolución correcta es "${answerLabelCorrect}". Debemos precisar que no hay una conducta inmoral activa (donde el agente actúa deliberadamente para dañar o violar la ley moral), sino una conducta negligente por voluntad perezosa (Akrasia): el agente tiene pleno conocimiento del deber y de los medios para actuar, pero omite su deber por comodidad personal.`;
      }
    }

    return {
      message,
      is_final: true,
      understood: isCorrect,
      student_was_correct: isCorrect,
    };
  }

  // Turn 1, 2 or 3 fallback question pools
  const pools: Record<number, Record<number, string[]>> = {
    1: {
      1: [
        '¿Por qué elegiste esa clasificación? ¿Puedes explicarlo con tus propias palabras?',
        '¿Qué parte de la historia te hizo elegir esa respuesta? ¡Cuéntame!',
        '¿Qué crees que sintió el personaje al tomar esa decisión?'
      ],
      2: [
        '¿Qué te hizo pensar en esa clasificación? ¿Podría haber otra explicación?',
        '¿Cuáles crees que fueron las consecuencias directas de la acción del personaje?',
        'Si estuvieras en los zapatos del personaje, ¿habrías tomado la misma decisión y por qué?'
      ],
      3: [
        '¿Qué elemento de la historia te pareció más importante para tomar tu decisión?',
        '¿En qué principio moral o valor te apoyas para clasificar esta conducta?',
        '¿Cómo consideras que influye la intención del personaje frente al resultado de la acción?'
      ],
    },
    2: {
      1: [
        '¿Y si el personaje hubiera sabido lo que iba a pasar? ¿Cambiaría tu respuesta?',
        '¿Crees que el personaje quería portarse bien o simplemente no le importó?',
        '¿Qué crees que le dirías al personaje si pudieras hablar con él/ella?'
      ],
      2: [
        '¿Y si el personaje hubiera sabido las consecuencias antes de actuar? ¿Cambiaría tu respuesta?',
        '¿Crees que la intención del personaje fue hacer el bien, el mal, o simplemente no pensó en ello?',
        '¿Qué habría hecho una persona verdaderamente responsable en esa situación?'
      ],
      3: [
        '¿Consideras que la acción es defendible universalmente o se trata de una excepción conveniente?',
        'Si cambiamos las consecuencias del acto a unas mucho más graves, ¿mantendrías la misma clasificación?',
        '¿Cómo distinguirías en este caso entre actuar por deber y actuar meramente conforme al deber?'
      ],
    },
    3: {
      1: [
        '¿Puedes resumir tu argumento en una frase muy simple?',
        '¿Crees que el personaje actuó libremente o estaba obligado por las circunstancias?',
        '¿Qué pasaría si la decisión del personaje afectara a personas muy cercanas?'
      ],
      2: [
        '¿Cuál crees que es la diferencia clave en este caso entre hacer lo correcto y hacer lo que es más fácil?',
        '¿Qué valor ético crees que tiene más peso en esta situación y por qué?',
        'Si todos en la sociedad actuaran de la misma manera que el personaje, ¿qué tipo de convivencia tendríamos?'
      ],
      3: [
        '¿Cómo justificarías esta acción desde una perspectiva que valore la responsabilidad por sobre las consecuencias?',
        '¿Qué deber moral fundamental crees que está en conflicto en este dilema?',
        '¿Qué contraargumento le darías a alguien que sostenga la postura contraria a la tuya?'
      ]
    }
  };

  const pool = pools[turn]?.[level] || pools[2]?.[level] || ['¿Puedes detallar más tu razonamiento?'];
  const message = pool[Math.floor(Math.random() * pool.length)];

  return {
    message,
    is_final: false,
    understood: undefined,
    student_was_correct: undefined,
  };
}
