import { requestUrl } from "obsidian";

export interface CitationItem {
  key: string;
  title: string;
  year?: string;
  creators: string[];
  itemType?: string;
  pdfAttachmentKey?: string;
}

interface ZoteroItemData {
  key?: string;
  title?: string;
  date?: string;
  itemType?: string;
  creators?: ZoteroCreator[];
}

interface ZoteroCreator {
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface ZoteroResponseItem extends ZoteroItemData {
  links?: {
    attachment?: {
      href?: string;
      attachmentType?: string;
    };
  };
  data?: ZoteroItemData;
}

const EXCLUDED_ITEM_TYPES = new Set(["attachment", "note", "annotation"]);
const ZOTERO_HEADERS = {
  Accept: "application/json",
  "Zotero-Allowed-Request": "true",
};

export class ZoteroClient {
  constructor(private readonly baseUrl: string) {}

  async ping(): Promise<void> {
    await this.requestJson("/users/0/items/top?limit=1&format=json");
  }

  async search(query: string, limit: number): Promise<CitationItem[]> {
    const params = new URLSearchParams({
      q: query,
      qmode: "titleCreatorYear",
      limit: String(limit),
      format: "json",
    });

    const response = await this.requestJson(`/users/0/items/top?${params.toString()}`);
    if (!Array.isArray(response)) {
      throw new Error("Unexpected Zotero search response.");
    }

    return response
      .map((item) => normalizeItem(item as ZoteroResponseItem))
      .filter((item): item is CitationItem => item !== null);
  }

  buildZoteroSelectLink(item: CitationItem): string {
    if (item.pdfAttachmentKey) {
      return `zotero://open-pdf/library/items/${encodeURIComponent(item.pdfAttachmentKey)}`;
    }

    return `zotero://select/library/items/${encodeURIComponent(item.key)}`;
  }

  private async requestJson(path: string): Promise<unknown> {
    const url = `${this.baseUrl.replace(/\/+$/, "")}${path}`;

    try {
      return await requestWithObsidian(url);
    } catch (error) {
      throw new Error(`Unable to reach Zotero at ${url}. ${formatError(error)}`);
    }
  }
}

async function requestWithObsidian(url: string): Promise<unknown> {
  const response = await requestUrl({
    url,
    method: "GET",
    headers: ZOTERO_HEADERS,
  });

  return response.json;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function normalizeItem(item: ZoteroResponseItem): CitationItem | null {
  const data = item.data ?? item;
  const key = data.key ?? item.key;
  const title = data.title?.trim();

  if (!key || !title) {
    return null;
  }

  if (data.itemType && EXCLUDED_ITEM_TYPES.has(data.itemType)) {
    return null;
  }

  return {
    key,
    title,
    year: extractYear(data.date),
    creators: (data.creators ?? []).map(formatCreator).filter((creator): creator is string => Boolean(creator)),
    itemType: data.itemType,
    pdfAttachmentKey: extractPdfAttachmentKey(item),
  };
}

function extractPdfAttachmentKey(item: ZoteroResponseItem): string | undefined {
  const attachment = item.links?.attachment;
  if (attachment?.attachmentType !== "application/pdf" || !attachment.href) {
    return undefined;
  }

  const match = attachment.href.match(/\/items\/([^/?#]+)$/);
  return match?.[1];
}

function formatCreator(creator: ZoteroCreator): string | null {
  if (creator.name?.trim()) {
    return creator.name.trim();
  }

  const parts = [creator.firstName?.trim(), creator.lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function extractYear(date?: string): string | undefined {
  const match = date?.match(/\b(\d{4})\b/);
  return match?.[1];
}
