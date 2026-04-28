import { Notice, SuggestModal } from "obsidian";
import ZoteroLocalCitePlugin from "../main";
import { renderCitationItemSuggestion } from "./suggestion-renderer";
import { CitationItem } from "./zotero";

type CitationModalSuggestion =
  | { type: "item"; item: CitationItem }
  | { type: "status"; message: string };

export class CitationSearchModal extends SuggestModal<CitationModalSuggestion> {
  constructor(
    app: ZoteroLocalCitePlugin["app"],
    private readonly plugin: ZoteroLocalCitePlugin,
    private readonly onChooseItem: (item: CitationItem) => void | Promise<void>,
  ) {
    super(app);
    this.setPlaceholder("Search Zotero by title, creator, or year");
    this.setInstructions([
      { command: "Enter", purpose: "create note" },
      { command: "Esc", purpose: "close" },
      { command: "Up/Down", purpose: "navigate" },
    ]);
  }

  async getSuggestions(query: string): Promise<CitationModalSuggestion[]> {
    if (!query.trim()) {
      return [{ type: "status", message: "Type to search Zotero" }];
    }

    const items = await this.plugin.searchCitations(query);
    if (items.length === 0) {
      return [{ type: "status", message: "No Zotero items found" }];
    }

    return items.map((item) => ({ type: "item", item }));
  }

  renderSuggestion(suggestion: CitationModalSuggestion, el: HTMLElement): void {
    el.empty();

    if (suggestion.type === "status") {
      el.addClass("zotero-cite-suggest-empty");
      el.setText(suggestion.message);
      return;
    }

    renderCitationItemSuggestion(suggestion.item, el);
  }

  async onChooseSuggestion(suggestion: CitationModalSuggestion): Promise<void> {
    if (suggestion.type === "status") {
      return;
    }

    try {
      await this.onChooseItem(suggestion.item);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Zotero Local Cite: ${message}`);
    }
  }
}
