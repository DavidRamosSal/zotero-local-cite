import {
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  TFile,
} from "obsidian";
import ZoteroLocalCitePlugin from "../main";
import { renderCitationItemSuggestion } from "./suggestion-renderer";
import { getCitationTokenAtCursor } from "./trigger";
import { CitationItem } from "./zotero";

type CitationSuggestion =
  | { type: "item"; item: CitationItem }
  | { type: "status"; message: string };

interface CitationSuggestionContext extends EditorSuggestContext {
  query: string;
}

export class CitationEditorSuggest extends EditorSuggest<CitationSuggestion> {
  private pendingTimer: number | null = null;
  private pendingResolve: ((items: CitationItem[]) => void) | null = null;
  private latestRequest = 0;

  constructor(app: ZoteroLocalCitePlugin["app"], private readonly plugin: ZoteroLocalCitePlugin) {
    super(app);
    this.setInstructions([
      { command: "Enter", purpose: "insert citation" },
      { command: "Esc", purpose: "close" },
      { command: "Up/Down", purpose: "navigate" },
    ]);
  }

  onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile | null): EditorSuggestTriggerInfo | null {
    const token = getCitationTokenAtCursor(editor);
    if (!token) {
      return null;
    }

    return {
      start: token.from,
      end: token.to,
      query: token.query,
    };
  }

  async getSuggestions(context: CitationSuggestionContext): Promise<CitationSuggestion[]> {
    if (!context.query.trim()) {
      return [{ type: "status", message: "Type to search Zotero" }];
    }

    const items = await this.debouncedSearch(context.query);
    if (items.length === 0) {
      return [{ type: "status", message: "No Zotero items found" }];
    }

    return items.map((item) => ({ type: "item", item }));
  }

  renderSuggestion(suggestion: CitationSuggestion, el: HTMLElement): void {
    el.empty();

    if (suggestion.type === "status") {
      el.addClass("zotero-cite-suggest-empty");
      el.setText(suggestion.message);
      return;
    }

    const { item } = suggestion;
    renderCitationItemSuggestion(item, el);
  }

  selectSuggestion(suggestion: CitationSuggestion, evt: MouseEvent | KeyboardEvent): void {
    if (suggestion.type === "status") {
      evt.preventDefault();
      return;
    }

    const editor = this.plugin.getActiveMarkdownEditor();
    if (!editor) {
      return;
    }

    this.plugin.replaceToken(editor, suggestion.item);
    this.close();
    evt.preventDefault();
  }

  requestRefresh(): void {
    const editor = this.plugin.getActiveMarkdownEditor();
    const file = this.app.workspace.getActiveFile();

    if (!editor || !file) {
      return;
    }

    const cursor = editor.getCursor();
    const trigger = this.onTrigger(cursor, editor, file);
    if (!trigger) {
      return;
    }

    this.close();
    (this as unknown as { open(context: CitationSuggestionContext): void }).open({
      editor,
      file,
      start: trigger.start,
      end: trigger.end,
      query: trigger.query,
    });
  }

  close(): void {
    super.close();

    if (this.pendingTimer !== null) {
      window.clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }

    if (this.pendingResolve) {
      this.pendingResolve([]);
      this.pendingResolve = null;
    }
  }

  private debouncedSearch(query: string): Promise<CitationItem[]> {
    this.latestRequest += 1;
    const requestId = this.latestRequest;

    if (this.pendingTimer !== null) {
      window.clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }

    if (this.pendingResolve) {
      this.pendingResolve([]);
      this.pendingResolve = null;
    }

    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.pendingTimer = window.setTimeout(async () => {
        this.pendingTimer = null;

        try {
          const items = await this.plugin.searchCitations(query);
          if (requestId === this.latestRequest) {
            resolve(items);
          }
        } finally {
          if (this.pendingResolve === resolve) {
            this.pendingResolve = null;
          }
        }
      }, 180);
    });
  }
}
