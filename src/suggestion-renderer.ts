import { CitationItem } from "./zotero";

export function renderCitationItemSuggestion(item: CitationItem, el: HTMLElement): void {
  el.addClass("zotero-cite-suggest-item");

  const titleEl = el.createDiv({ cls: "zotero-cite-suggest-title", text: item.title });
  titleEl.setAttribute("title", item.title);

  const metaParts = [
    item.creators.slice(0, 3).join(", "),
    item.year,
    item.itemType,
  ].filter(Boolean);

  el.createDiv({
    cls: "zotero-cite-suggest-meta",
    text: metaParts.join(" • ") || item.key,
  });
}
