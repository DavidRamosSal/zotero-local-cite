import { Editor, EditorPosition } from "obsidian";

export interface CitationToken {
  from: EditorPosition;
  to: EditorPosition;
  query: string;
}

const TRIGGER = "@cite";

export function getCitationTokenAtCursor(editor: Editor): CitationToken | null {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const beforeCursor = line.slice(0, cursor.ch);
  const triggerIndex = beforeCursor.lastIndexOf(TRIGGER);

  if (triggerIndex === -1) {
    return null;
  }

  if (triggerIndex > 0 && !/\s/.test(line.charAt(triggerIndex - 1))) {
    return null;
  }

  const triggerEnd = triggerIndex + TRIGGER.length;
  const afterTrigger = line.slice(triggerEnd);

  if (afterTrigger.length > 0 && !afterTrigger.startsWith(" ")) {
    return null;
  }

  const queryStart = line.charAt(triggerEnd) === " " ? triggerEnd + 1 : triggerEnd;
  const rightBoundary = findRightBoundary(line, queryStart);

  if (cursor.ch < triggerEnd || cursor.ch > rightBoundary) {
    return null;
  }

  return {
    from: { line: cursor.line, ch: triggerIndex },
    to: { line: cursor.line, ch: rightBoundary },
    query: line.slice(queryStart, rightBoundary).trim(),
  };
}

function findRightBoundary(line: string, start: number): number {
  for (let index = start; index < line.length; index += 1) {
    const current = line.charAt(index);
    const next = line.charAt(index + 1);

    if (["[", "]", "(", ")"].includes(current)) {
      return index;
    }

    if (current === " " && next === " ") {
      return index;
    }
  }

  return line.length;
}
