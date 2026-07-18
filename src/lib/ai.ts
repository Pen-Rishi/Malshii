import { GATE_SUBJECTS } from '@/data/subjects';
import type { Question } from '@/types';

import { db } from '@/lib/db';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

async function getApiKey(): Promise<string> {
  const setting = await db.settings.where('key').equals('apiKey').first();
  return (setting?.value as string) || '';
}

interface ClassificationResult {
  subject: string;
  topic: string;
  subtopic: string;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
  confidence: number;
}

function buildTaxonomyString(): string {
  return GATE_SUBJECTS.map((subj) => {
    const topics = subj.topics
      .map((t) => {
        const subtopics = t.subtopics
          .map((st) => `      - ${st.name}: [${st.concepts.join(', ')}]`)
          .join('\n');
        return `    - ${t.name}\n${subtopics}`;
      })
      .join('\n');
    return `  ${subj.name}\n${topics}`;
  }).join('\n\n');
}

function getValidSubjects(): string[] {
  return GATE_SUBJECTS.map((s) => s.name);
}

async function callOpenRouter(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Go to Settings to add your API key.');
  }
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function classifyQuestion(
  questionText: string,
  options: string[] = []
): Promise<ClassificationResult> {
  const taxonomy = buildTaxonomyString();
  const validSubjects = getValidSubjects();
  const optionsText = options.length > 0 ? `\nOptions:\n${options.map((o, i) => `  ${String.fromCharCode(65 + i)}. ${o}`).join('\n')}` : '';

  const prompt = `You are a GATE CSE exam question classifier. Classify the following question into the correct subject, topic, subtopic, concept, and difficulty level.

You MUST pick values ONLY from the following taxonomy. Do NOT invent new subjects, topics, subtopics, or concepts.

Valid Subjects: ${validSubjects.join(', ')}

Full Taxonomy:
${taxonomy}

Question:
${questionText}${optionsText}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "subject": "<exact subject name from taxonomy>",
  "topic": "<exact topic name from taxonomy>",
  "subtopic": "<exact subtopic name from taxonomy>",
  "concept": "<exact concept from taxonomy>",
  "difficulty": "easy" | "medium" | "hard",
  "confidence": <0.0 to 1.0>
}`;

  const result = await callOpenRouter([{ role: 'user', content: prompt }]);

  try {
    const cleaned = result.replace(/```json\s*|```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse classification response: ${result}`);
  }
}

export async function explainQuestion(question: Question): Promise<string> {
  const optionsText =
    question.options.length > 0
      ? `\nOptions:\n${question.options.map((o, i) => `  ${String.fromCharCode(65 + i)}. ${o}`).join('\n')}`
      : '';

  const prompt = `You are a GATE CSE exam tutor. Explain the following question in detail.

Subject: ${question.subject}
Topic: ${question.topic}
Question: ${question.question}${optionsText}
${question.answer ? `Correct Answer: ${question.answer}` : ''}

Provide:
1. A clear explanation of the concept being tested
2. Step-by-step solution
3. Why the correct answer is correct
4. Why other options (if any) are incorrect
5. Key takeaway for GATE preparation

Use LaTeX notation (wrapped in $ or $$) for mathematical expressions where appropriate.`;

  return callOpenRouter([{ role: 'user', content: prompt }]);
}

export async function explainConcept(concept: string, subject: string): Promise<string> {
  const prompt = `You are a GATE CSE exam tutor specializing in ${subject}.

Explain the concept "${concept}" in the context of GATE CSE preparation.

Include:
1. Definition and intuition
2. Key properties and theorems
3. Common question patterns in GATE
4. Important formulas (use LaTeX with $ or $$)
5. Tips and common mistakes
6. Quick revision points

Keep the explanation concise but thorough, suitable for a GATE aspirant.`;

  return callOpenRouter([{ role: 'user', content: prompt }]);
}

export async function generateSimilarQuestion(question: Question): Promise<string> {
  const optionsText =
    question.options.length > 0
      ? `\nOptions:\n${question.options.map((o, i) => `  ${String.fromCharCode(65 + i)}. ${o}`).join('\n')}`
      : '';

  const prompt = `You are a GATE CSE exam question generator.

Given this GATE question:
Subject: ${question.subject}
Topic: ${question.topic}
Subtopic: ${question.subtopic}
Difficulty: ${question.difficulty}
Type: ${question.type}
Question: ${question.question}${optionsText}

Generate a similar practice question that:
1. Tests the same concept/topic
2. Has the same difficulty level
3. Has the same question type (${question.type})
4. Is different enough to be a new question
${question.type === 'MCQ' ? '5. Include 4 options (A, B, C, D) with exactly one correct answer' : ''}
${question.type === 'MSQ' ? '5. Include 4 options (A, B, C, D) with one or more correct answers' : ''}
${question.type === 'NAT' ? '5. The answer should be a numerical value' : ''}

Format:
Question: <question text>
${question.type !== 'NAT' ? 'A. <option>\nB. <option>\nC. <option>\nD. <option>' : ''}
Answer: <correct answer>
Explanation: <brief explanation>`;

  return callOpenRouter([{ role: 'user', content: prompt }]);
}

export async function getTopicSummary(subject: string, topic: string): Promise<string> {
  const subjectData = GATE_SUBJECTS.find((s) => s.name === subject);
  const topicData = subjectData?.topics.find((t) => t.name === topic);
  const subtopicsList = topicData
    ? topicData.subtopics.map((st) => `- ${st.name}: ${st.concepts.join(', ')}`).join('\n')
    : '';

  const prompt = `You are a GATE CSE exam preparation guide.

Create a comprehensive summary for the topic "${topic}" under "${subject}" for GATE CSE preparation.

Subtopics and concepts covered:
${subtopicsList}

Include:
1. Overview of the topic and its importance in GATE
2. Historical weightage and question patterns
3. Key concepts with brief explanations
4. Important formulas and theorems (use LaTeX with $ or $$)
5. Common question types asked
6. Recommended preparation strategy
7. Quick revision checklist

Keep it focused and exam-oriented.`;

  return callOpenRouter([{ role: 'user', content: prompt }]);
}
