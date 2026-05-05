# Zotero Local Cite

Zotero Local Cite is a desktop-only Obsidian plugin for working with Zotero items through Zotero's local API.

It supports two workflows:

- Insert an inline Markdown link to a Zotero item with `@cite`.
- Create a paper note from a Zotero search result.

When Zotero exposes a PDF attachment for an item, generated links open the PDF in Zotero's reader. Otherwise, generated links select the item in your Zotero library.

## Inline Citations

Type `@cite` in a Markdown note, continue typing a title or creator query, then choose a result from the suggestion popup. The plugin replaces the `@cite ...` token with a Markdown link using the item title as the link text.

You can also run the `Insert Zotero citation` command to insert the `@cite ` trigger at the cursor and open the same citation flow.

## Paper Notes

Run the `Create note from Zotero item` command from Obsidian's command palette, search Zotero by title, creator, or year, then choose a result.

The plugin creates a new Markdown note in the configured paper-note folder. The note filename is based on the paper title. If a note with the same name already exists, the plugin appends a number to avoid overwriting it.

Generated notes use this format:

```md
Author One, Author Two

[Open in Zotero](zotero://...)

## Summary
```

## Requirements

- Obsidian desktop
- Zotero desktop running locally
- Zotero's local API available at `http://127.0.0.1:23119/api`

## Settings

- `Zotero API base URL`: defaults to `http://127.0.0.1:23119/api`
- `Result limit`: defaults to `10`
- `Paper note folder`: defaults to `Zotero Notes`; leave empty to create notes at the vault root

## Commands

- `Insert Zotero citation`: inserts the `@cite ` trigger at the cursor and opens the inline citation flow.
- `Create note from Zotero item`: opens Zotero search and creates a paper note from the selected item.

## Build

```bash
npm install
npm run build
```

The release assets are:

- `dist/main.js`
- `dist/manifest.json`
- `dist/styles.css`

## Test Vault Install

This repo includes a helper script that copies the built plugin files into a local test vault:

```bash
npm run install:test-vault
```

By default, the script installs to:

```text
/Users/dave/Documents/test/.obsidian/plugins/zotero-local-cite
```

Set `OBSIDIAN_TEST_VAULT` to install into a different vault root.

## Limitations

- Personal library only.
- Desktop only.
- Group libraries are not supported in this version.
