import type { Question } from '../types';

export async function generateQuestions(params: {
  topic: string;
  sector: string;
  level: string;
  questionType: string;
  count: number;
}): Promise<{ questions: Question[] }> {
  await new Promise((r) => setTimeout(r, 1500));

  const questions: Question[] = [];
  const types = params.questionType.includes('Mixed')
    ? (['MCQ', 'Theory', 'TrueFalse'] as const)
    : params.questionType.includes('MCQ')
      ? (['MCQ'] as const)
      : params.questionType.includes('Theory')
        ? (['Theory'] as const)
        : params.questionType.includes('True')
          ? (['TrueFalse'] as const)
          : params.questionType.includes('Fill')
            ? (['MCQ'] as const)
            : params.questionType.includes('Matching')
              ? (['MCQ'] as const)
              : (['MCQ'] as const);

  for (let i = 0; i < params.count; i++) {
    const type = types[i % types.length];

    if (type === 'MCQ') {
      questions.push({
        id: `q-${Date.now()}-${i}`,
        question: `What is a key concept related to ${params.topic}? (Question ${i + 1})`,
        type: 'MCQ',
        options: [
          `${params.topic} concept A`,
          `${params.topic} concept B`,
          `${params.topic} concept C`,
          `${params.topic} concept D`,
        ],
        correctAnswer: `${params.topic} concept B`,
        explanation: `The correct answer is concept B because it represents the most fundamental aspect of ${params.topic} at the ${params.level} level.`,
        difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard',
        subject: params.sector,
        topic: params.topic,
      });
    } else if (type === 'Theory') {
      questions.push({
        id: `q-${Date.now()}-${i}`,
        question: `Explain the importance of ${params.topic} in your own words. (Question ${i + 1})`,
        type: 'Theory',
        correctAnswer: `${params.topic} is important because it forms the foundation of understanding in ${params.sector}. Key points include its practical applications, theoretical framework, and relevance to real-world scenarios.`,
        explanation: `A strong answer should cover: definition, key principles, practical applications, and real-world examples related to ${params.topic}.`,
        difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard',
        subject: params.sector,
        topic: params.topic,
      });
    } else {
      questions.push({
        id: `q-${Date.now()}-${i}`,
        question: `True or False: ${params.topic} is a fundamental concept in ${params.sector}? (Question ${i + 1})`,
        type: 'TrueFalse',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: `This statement is true. ${params.topic} is indeed a fundamental concept studied at the ${params.level} level.`,
        difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard',
        subject: params.sector,
        topic: params.topic,
      });
    }
  }

  return { questions };
}
