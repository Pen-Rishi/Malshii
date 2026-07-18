import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

export async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // Group items by Y-coordinate (same line) — items with close Y values are on the same line
    let lastY: number | null = null;
    const lines: string[] = [];
    let currentLine = '';

    for (const item of textContent.items) {
      if (!('str' in item)) continue;
      const ti = item as unknown as { str: string; transform: number[] };
      const y = Math.round(ti.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 3) {
        lines.push(currentLine.trim());
        currentLine = '';
      }
      currentLine += (currentLine ? ' ' : '') + ti.str;
      lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());

    textParts.push(lines.join('\n'));
  }

  return textParts.join('\n\n');
}

interface ParsedQuestion {
  questionNumber: number;
  text: string;
  options: string[];
  marks: number;
  type: 'MCQ' | 'MSQ' | 'NAT';
}

export function splitIntoQuestions(text: string, year: number): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];

  // pdfjs-dist joins text items with spaces, so question markers appear mid-text.
  // Try multiple patterns from most specific to least specific.
  const patterns = [
    // Q.1, Q.2, Q. 1, Q .1, Q . 1 (with or without trailing punctuation)
    /(?:^|[\s\n])Q\s*\.?\s*(\d{1,2})\b/gi,
    // Question 1, Question 2
    /Question\s+(\d{1,2})\b/gi,
    // Q1), Q2), Q1., Q2.
    /(?:^|[\s\n])Q(\d{1,2})\s*[.)]/gi,
  ];

  let matches: { index: number; number: number }[] = [];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const qNum = parseInt(match[1], 10);
      if (!isNaN(qNum) && qNum >= 1 && qNum <= 65) {
        matches.push({ index: match.index, number: qNum });
      }
    }
    if (matches.length >= 5) break;
    matches = [];
  }

  // Fallback: bare numbered patterns "1." "2." etc. — only if they form a reasonable sequence
  if (matches.length < 5) {
    matches = [];
    const fallbackPattern = /(?:^|[\s\n])(\d{1,2})\.\s/g;
    let match: RegExpExecArray | null;
    while ((match = fallbackPattern.exec(text)) !== null) {
      const qNum = parseInt(match[1], 10);
      if (qNum >= 1 && qNum <= 65) {
        matches.push({ index: match.index, number: qNum });
      }
    }
  }

  // Deduplicate: keep only the first occurrence of each question number
  const seen = new Set<number>();
  matches = matches
    .sort((a, b) => a.index - b.index)
    .filter((m) => {
      if (seen.has(m.number)) return false;
      seen.add(m.number);
      return true;
    });

  // Extract text between consecutive question markers
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const questionText = text.slice(start, end).trim();

    const parsed = parseQuestionBlock(questionText, matches[i].number, year);
    if (parsed) {
      questions.push(parsed);
    }
  }

  return questions;
}

function parseQuestionBlock(
  block: string,
  questionNumber: number,
  _year: number
): ParsedQuestion | null {
  // Remove the question number prefix
  let text = block.replace(/^\s*(?:Q\s*\.?\s*\d{1,2}|Question\s+\d{1,2}|\d{1,2}\.)\s*[.:)—\-\s]*/i, '').trim();

  if (text.length < 10) return null;

  // Detect marks: patterns like "(1 mark)", "(2 marks)", "1 Mark", "2 Marks"
  let marks = questionNumber <= 25 ? 1 : 2; // GATE convention: Q1-25 = 1 mark, Q26-55 = 2 marks
  const marksMatch = text.match(/\(?\s*(\d)\s*marks?\s*\)?/i);
  if (marksMatch) {
    marks = parseInt(marksMatch[1], 10);
    text = text.replace(marksMatch[0], '').trim();
  }

  // Extract options (A), (B), (C), (D) or A. B. C. D.
  const options: string[] = [];
  const optionPattern = /(?:^|\n)\s*\(?([A-D])\)?\s*[.):]\s*(.*?)(?=(?:\n\s*\(?[A-D]\)?\s*[.):])|\n\s*(?:Answer|Correct|NAT|Numerical)|$)/gis;
  let optMatch: RegExpExecArray | null;
  const optionTexts: string[] = [];

  while ((optMatch = optionPattern.exec(text)) !== null) {
    optionTexts.push(optMatch[2].trim());
  }

  if (optionTexts.length >= 2) {
    options.push(...optionTexts);
    // Remove options from the question text
    const firstOptionIndex = text.search(/(?:^|\n)\s*\(?[A-D]\)?\s*[.):]/i);
    if (firstOptionIndex > 0) {
      text = text.slice(0, firstOptionIndex).trim();
    }
  }

  // Determine question type
  let type: 'MCQ' | 'MSQ' | 'NAT' = 'MCQ';
  if (/(?:MSQ|multiple\s+select)/i.test(block)) {
    type = 'MSQ';
  } else if (
    /(?:NAT|numerical\s+answer|numerical\s+type)/i.test(block) ||
    options.length === 0
  ) {
    type = 'NAT';
  }

  return {
    questionNumber,
    text,
    options,
    marks,
    type,
  };
}

export async function parseZip(file: File): Promise<File[]> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const results: File[] = [];

  const pdfFiles = Object.entries(zip.files).filter(
    ([name, entry]) => !entry.dir && name.toLowerCase().endsWith('.pdf')
  );

  for (const [filename, entry] of pdfFiles) {
    const data = await entry.async('arraybuffer');
    const blob = new Blob([data], { type: 'application/pdf' });
    const pdfFile = new File([blob], filename, { type: 'application/pdf' });
    results.push(pdfFile);
  }

  return results;
}

export function detectYear(filename: string): number | null {
  // Match 4-digit year patterns: 2024, 2023, etc.
  const yearMatch = filename.match(/(20\d{2}|19\d{2})/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    // GATE CSE papers are typically from 2000-2030 range
    if (year >= 2000 && year <= 2030) {
      return year;
    }
  }
  return null;
}
