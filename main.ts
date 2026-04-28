import {
  App,
  Editor,
  MarkdownView,
  Notice,
  Plugin,
  PluginSettingTab,
  TFolder,
  normalizePath,
  Setting,
} from "obsidian";
import { CitationEditorSuggest } from "./src/citation-editor-suggest";
import { CitationSearchModal } from "./src/citation-search-modal";
import { getCitationTokenAtCursor } from "./src/trigger";
import { CitationItem, ZoteroClient } from "./src/zotero";

interface ZoteroLocalCiteSettings {
  apiBaseUrl: string;
  resultLimit: number;
  notesFolder: string;
}

const DEFAULT_SETTINGS: ZoteroLocalCiteSettings = {
  apiBaseUrl: "http://127.0.0.1:23119/api",
  resultLimit: 10,
  notesFolder: "Zotero Notes",
};

export default class ZoteroLocalCitePlugin extends Plugin {
  settings: ZoteroLocalCiteSettings = DEFAULT_SETTINGS;
  client!: ZoteroClient;
  suggest!: CitationEditorSuggest;
  private lastConnectionNoticeAt = 0;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.client = this.createClient();
    this.suggest = new CitationEditorSuggest(this.app, this);
    this.registerEditorSuggest(this.suggest);

    this.addCommand({
      id: "insert-zotero-citation",
      name: "Insert Zotero citation",
      editorCallback: (editor) => {
        this.prepareCitationInsertion(editor);
      },
    });

    this.addCommand({
      id: "create-zotero-paper-note",
      name: "Create note from Zotero item",
      callback: () => {
        new CitationSearchModal(this.app, this, async (item) => {
          await this.createNoteFromCitation(item);
        }).open();
      },
    });

    this.addSettingTab(new ZoteroLocalCiteSettingTab(this.app, this));
  }

  createClient(): ZoteroClient {
    return new ZoteroClient(this.settings.apiBaseUrl);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    if (this.settings.apiBaseUrl === "http://localhost:23119/api") {
      this.settings.apiBaseUrl = DEFAULT_SETTINGS.apiBaseUrl;
      await this.saveData(this.settings);
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.client = this.createClient();
  }

  getActiveMarkdownEditor(): Editor | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return view?.editor ?? null;
  }

  async pingZotero(): Promise<void> {
    try {
      await this.client.ping();
    } catch (error) {
      this.showConnectionNotice(error);
      throw error;
    }
  }

  async searchCitations(query: string): Promise<CitationItem[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      return await this.client.search(query, this.settings.resultLimit);
    } catch (error) {
      this.showConnectionNotice(error);
      return [];
    }
  }

  buildCitationMarkdown(item: CitationItem): string {
    const title = item.title.replace(/\]/g, "\\]");
    return `[${title}](${this.client.buildZoteroSelectLink(item)})`;
  }

  buildPaperNoteMarkdown(item: CitationItem): string {
    return [
      item.creators.join(", ") || "Unknown authors",
      "",
      `[Open in Zotero](${this.client.buildZoteroSelectLink(item)})`,
      "",
      "## Summary",
      "",
    ].join("\n");
  }

  async createNoteFromCitation(item: CitationItem): Promise<void> {
    const folderPath = normalizeFolderPath(this.settings.notesFolder);
    await this.ensureFolderExists(folderPath);

    const filePath = await this.getAvailableNotePath(folderPath, item.title);
    const file = await this.app.vault.create(filePath, this.buildPaperNoteMarkdown(item));
    await this.app.workspace.getLeaf(false).openFile(file);

    new Notice(`Zotero Local Cite: created ${file.basename}.`);
  }

  replaceToken(editor: Editor, item: CitationItem): void {
    const token = getCitationTokenAtCursor(editor);
    if (!token) {
      return;
    }

    editor.replaceRange(this.buildCitationMarkdown(item), token.from, token.to);
  }

  prepareCitationInsertion(editor: Editor): void {
    const token = getCitationTokenAtCursor(editor);
    if (!token) {
      const cursor = editor.getCursor();
      editor.replaceRange("@cite ", cursor);
      editor.setCursor({ line: cursor.line, ch: cursor.ch + 6 });
    }

    editor.focus();
    this.suggest.requestRefresh();
  }

  private showConnectionNotice(error: unknown): void {
    const now = Date.now();
    if (now - this.lastConnectionNoticeAt < 4000) {
      return;
    }

    this.lastConnectionNoticeAt = now;
    const message = error instanceof Error ? error.message : "Unable to reach Zotero local API.";
    new Notice(`Zotero Local Cite: ${message}`);
  }

  private async ensureFolderExists(folderPath: string): Promise<void> {
    if (!folderPath) {
      return;
    }

    const parts = folderPath.split("/").filter(Boolean);
    let currentPath = "";

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const existing = this.app.vault.getAbstractFileByPath(currentPath);

      if (existing instanceof TFolder) {
        continue;
      }

      if (existing) {
        throw new Error(`${currentPath} exists and is not a folder.`);
      }

      await this.app.vault.createFolder(currentPath);
    }
  }

  private async getAvailableNotePath(folderPath: string, title: string): Promise<string> {
    const baseName = sanitizeFileName(title) || "Untitled Zotero Note";
    let candidateName = baseName;
    let index = 1;

    while (true) {
      const path = normalizePath(folderPath ? `${folderPath}/${candidateName}.md` : `${candidateName}.md`);
      if (!this.app.vault.getAbstractFileByPath(path)) {
        return path;
      }

      index += 1;
      candidateName = `${baseName} ${index}`;
    }
  }
}

function normalizeFolderPath(path: string): string {
  return normalizePath(path.trim()).replace(/^\/+|\/+$/g, "");
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|#^[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

class ZoteroLocalCiteSettingTab extends PluginSettingTab {
  plugin: ZoteroLocalCitePlugin;

  constructor(app: App, plugin: ZoteroLocalCitePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Zotero API base URL")
      .setDesc("Base URL for Zotero's local read API.")
      .addText((text) => {
        text
          .setPlaceholder("http://127.0.0.1:23119/api")
          .setValue(this.plugin.settings.apiBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.apiBaseUrl = value.trim() || DEFAULT_SETTINGS.apiBaseUrl;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Paper note folder")
      .setDesc("Folder where Zotero paper notes are created. Leave empty to create notes at the vault root.")
      .addText((text) => {
        text
          .setPlaceholder(DEFAULT_SETTINGS.notesFolder)
          .setValue(this.plugin.settings.notesFolder)
          .onChange(async (value) => {
            this.plugin.settings.notesFolder = normalizeFolderPath(value);
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Result limit")
      .setDesc("Maximum number of Zotero items shown in suggestions.")
      .addText((text) => {
        text
          .setPlaceholder(String(DEFAULT_SETTINGS.resultLimit))
          .setValue(String(this.plugin.settings.resultLimit))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            this.plugin.settings.resultLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SETTINGS.resultLimit;
            await this.plugin.saveSettings();
          });
      })
      .addButton((button) => {
        button.setButtonText("Test connection").onClick(async () => {
          try {
            await this.plugin.pingZotero();
            new Notice("Zotero Local Cite: connection succeeded.");
          } catch {
            /* Notice handled in plugin */
          }
        });
      });
  }
}
