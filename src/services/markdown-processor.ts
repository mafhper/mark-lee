/**
 * Markdown Formatter & Minifier Service
 *
 * Logic adapted from task analysis.
 */

// State for the parser
class ParserState {
  inCodeBlock: boolean = false;
  inHTMLBlock: boolean = false;
  inFrontmatter: boolean = false;
  inTable: boolean = false;
  codeFence: string | null = null;
  htmlTag: string | null = null;
  listLevel: number = 0;

  reset() {
    this.inCodeBlock = false;
    this.inHTMLBlock = false;
    this.inFrontmatter = false;
    this.inTable = false;
    this.codeFence = null;
    this.htmlTag = null;
    this.listLevel = 0;
  }
}

// Helper functions for detection
const detectCodeBlock = (line: string, state: ParserState) => {
  const codeFenceMatch = line.match(/^(`{3,} | ~{3,})/);
  
  if (codeFenceMatch) {
    if (!state.inCodeBlock) {
      state.inCodeBlock = true;
      state.codeFence = codeFenceMatch[1];
    } else if (line.startsWith(state.codeFence || '')) {
      state.inCodeBlock = false;
      state.codeFence = null;
    }
  }
  
  return state.inCodeBlock;
};

const detectHTMLBlock = (line: string, state: ParserState) => {
  const htmlStartMatch = line.match(/^<(\w+).* >$/);
  const htmlEndMatch = line.match(/^<\/(\w+)>$/);
  
  if (htmlStartMatch && !state.inHTMLBlock) {
    state.inHTMLBlock = true;
    state.htmlTag = htmlStartMatch[1];
  } else if (htmlEndMatch && state.inHTMLBlock && htmlEndMatch[1] === state.htmlTag) {
    state.inHTMLBlock = false;
    state.htmlTag = null;
  }
  
  return state.inHTMLBlock;
};

const detectFrontmatter = (line: string, state: ParserState, lineIndex: number) => {
  if (lineIndex === 0 && line === '---') {
    state.inFrontmatter = true;
    return true;
  }
  
  if (state.inFrontmatter && line === '---') {
    state.inFrontmatter = false;
    return true;
  }
  
  return state.inFrontmatter;
};

const isTableLine = (line: string) => {
  return line.trim().startsWith('|') && line.trim().endsWith('|');
};

const isHeader = (line: string) => {
  return /^#{1,6}\s/.test(line.trim());
};

const isList = (line: string) => {
  return /^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line);
};

const hasHardBreak = (line: string) => {
  return line.endsWith('  ') || line.endsWith('\\');
};

/**
 * Formats Markdown content with standardized spacing and indentation.
 */
export const formatMarkdown = (text: string): string => {
  const lines = text.split('\n');
  const state = new ParserState();
  const result: string[] = [];
  let previousLineType: string | null = null;
  let blankLineCount = 0;

  lines.forEach((line, index) => {
    // Detect context
    const inCodeBlock = detectCodeBlock(line, state);
    const inHTMLBlock = detectHTMLBlock(line, state);
    const inFrontmatter = detectFrontmatter(line, state, index);
    const inTable = isTableLine(line);

    // If in protected region, preserve exactly
    if (inCodeBlock || inHTMLBlock || inFrontmatter) {
      result.push(line);
      previousLineType = 'protected';
      blankLineCount = 0;
      return;
    }

    // Empty line
    if (line.trim() === '') {
      blankLineCount++;
      // Avoid multiple consecutive blank lines (max 2)
      if (blankLineCount <= 2) {
        result.push('');
      }
      previousLineType = 'blank';
      return;
    }

    blankLineCount = 0;
    const trimmedLine = line.trim();

    // HEADERS
    if (isHeader(trimmedLine)) {
      const headerMatch = trimmedLine.match(/^(#{1,6})\s*(.*)/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const content = headerMatch[2].trim();
        
        // Add spacing before header
        if (previousLineType && previousLineType !== 'blank') {
          if (level <= 2) {
            result.push('', ''); // 2 blank lines for H1/H2
          } else {
            result.push(''); // 1 blank line for H3-H6
          }
        }
        
        result.push(`${headerMatch[1]} ${content}`);
        previousLineType = 'header';
        return;
      }
    }

    // LISTS
    if (isList(trimmedLine)) {
      const listMatch = trimmedLine.match(/^(\s*)([-*+]|\d+\.)\s+(.*)/);
      if (listMatch) {
        const indent = listMatch[1];
        const marker = listMatch[2];
        const content = listMatch[3];
        
        // Add blank line before list if previous was not list/blank
        if (previousLineType && previousLineType !== 'list' && previousLineType !== 'blank') {
          result.push('');
        }
        
        // Normalize unordered list marker to '-'
        const normalizedMarker = marker.match(/\d+\./) ? marker : '-';
        result.push(`${indent}${normalizedMarker} ${content}`);
        previousLineType = 'list';
        return;
      }
    }

    // TABLES
    if (inTable) {
      result.push(line);
      previousLineType = 'table';
      return;
    }

    // PARAGRAPHS
    // Remove trailing spaces unless it's a hard break
    let processedLine = line;
    if (hasHardBreak(line)) {
      processedLine = line.trimStart(); // Remove leading spaces, keep trailing
    } else {
      processedLine = line.trim();
    }

    // Add blank line before paragraph after list or header
    if (previousLineType === 'list' || previousLineType === 'header') {
      result.push('');
    }

    result.push(processedLine);
    previousLineType = 'paragraph';
  });

  // Remove trailing blank lines
  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop();
  }

  return result.join('\n');
};

/**
 * Minifies Markdown content by removing unnecessary whitespace.
 */
export const minifyMarkdown = (text: string): string => {
  const lines = text.split('\n');
  const state = new ParserState();
  const result: string[] = [];

  lines.forEach((line, index) => {
    // Detect context
    const inCodeBlock = detectCodeBlock(line, state);
    const inHTMLBlock = detectHTMLBlock(line, state);
    const inFrontmatter = detectFrontmatter(line, state, index);

    // Preserve protected blocks
    if (inCodeBlock || inHTMLBlock || inFrontmatter) {
      result.push(line);
      return;
    }

    const trimmedLine = line.trim();

    // Remove completely empty lines
    if (trimmedLine === '') {
      return;
    }

    // Remove extra spaces, preserve hard breaks
    if (hasHardBreak(line)) {
      result.push(trimmedLine + '  ');
    } else {
      result.push(trimmedLine);
    }
  });

  return result.join('\n');
};
