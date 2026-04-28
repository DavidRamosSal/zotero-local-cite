# Zotero Local Cite

Zotero Local Cite is a desktop-only Obsidian plugin for inserting Markdown links to Zotero items from Zotero's local API.

Type `@cite` in a Markdown note, continue typing a title or creator query, then choose a result from the suggestion popup. The plugin replaces the `@cite ...` token with a Markdown link using the item title as the link text.

When Zotero exposes a PDF attachment for the item, the link opens the PDF in Zotero's reader. Otherwise, the link selects the item in your Zotero library.

## Requirements

- Obsidian desktop
- Zotero desktop running locally
- Zotero's local API available at `http://127.0.0.1:23119/api`

## Settings

- `Zotero API base URL`: defaults to `http://127.0.0.1:23119/api`
- `Result limit`: defaults to `10`

## Commands

- `Insert Zotero citation`: inserts the `@cite ` trigger at the cursor and opens the same citation flow.

## Build

```bash
npm install
npm run build
```

The release assets are:

- `dist/main.js`
- `dist/manifest.json`
- `dist/styles.css`

## Limitations

- Personal library only.
- Desktop only.
- Group libraries are not supported in this version.
