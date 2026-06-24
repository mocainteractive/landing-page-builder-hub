import type { PageDoc } from "./types";
import { buildBaseStyles, buildCssVariables, googleFontsHref } from "./tokens";
import { renderBlock } from "./blocks";

/** Shared <head> contents for both export and preview. */
function head(page: PageDoc, extraStyle = ""): string {
  const fonts = googleFontsHref(page.brand);
  const fontLinks = fonts
    ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${fonts}" rel="stylesheet">`
    : "";
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeAttr(page.title)}</title>
${fontLinks}
<style>${buildCssVariables(page.brand)}
${buildBaseStyles()}
${extraStyle}</style>`;
}

function escapeAttr(s: string): string {
  return String(s ?? "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Produce the final, clean, self-contained HTML document for download / hosting.
 * No editor chrome, no extra scripts — just the brand styles and blocks.
 */
export function buildHtmlDocument(page: PageDoc): string {
  const body = page.blocks.map((b) => renderBlock(b, page.brand)).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
${head(page)}
</head>
<body>
${body}
</body>
</html>`;
}

/**
 * Produce the preview document used inside the editor iframe.
 * Identical styling to the export, plus per-block wrappers and a tiny script
 * that lets the editor select a block by click and highlight the active one.
 */
export function buildPreviewDocument(page: PageDoc, selectedId?: string): string {
  const previewStyle = `
.lpb-block{position:relative;outline:2px solid transparent;outline-offset:-2px;transition:outline-color .12s ease;cursor:pointer;}
.lpb-block:hover{outline-color:color-mix(in srgb, var(--color-primary) 60%, transparent);}
.lpb-block[data-selected="true"]{outline-color:var(--color-primary);}
.lpb-block[data-selected="true"]::after{content:attr(data-label);position:absolute;top:6px;left:6px;background:var(--color-primary);color:#fff;font:600 11px/1 var(--font-body);padding:4px 8px;border-radius:6px;z-index:5;}`;

  const body = page.blocks
    .map((b) => {
      const selected = b.id === selectedId ? ' data-selected="true"' : "";
      return `<div class="lpb-block" data-block-id="${b.id}" data-label="${escapeAttr(
        b.type,
      )}"${selected}>${renderBlock(b, page.brand)}</div>`;
    })
    .join("\n");

  const script = `<script>
(function(){
  document.addEventListener('click', function(e){
    var el = e.target.closest('[data-block-id]');
    if(!el) return;
    e.preventDefault();
    parent.postMessage({source:'lpb-preview', type:'select', id: el.getAttribute('data-block-id')}, '*');
  });
})();
</script>`;

  return `<!doctype html>
<html lang="en">
<head>
${head(page, previewStyle)}
</head>
<body>
${body}
${script}
</body>
</html>`;
}
