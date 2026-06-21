import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  theme: "default",
});

let renderCounter = 0;

async function renderMermaidBlocks() {
  const blocks = document.querySelectorAll("pre.mermaid-source:not([data-rendered])");

  for (const block of blocks) {
    block.setAttribute("data-rendered", "true");

    const code = block.textContent.trim();
    const container = document.createElement("div");
    const id = "mermaid-diagram-" + renderCounter++;

    container.className = "mermaid";

    try {
      const result = await mermaid.render(id, code);
      container.innerHTML = result.svg;
      block.replaceWith(container);

      if (typeof result.bindFunctions === "function") {
        result.bindFunctions(container);
      }
    } catch (error) {
      block.removeAttribute("data-rendered");
      block.classList.add("mermaid-error");
      console.error("Mermaid render failed", error, code);
    }
  }
}

if (typeof document$ !== "undefined") {
  document$.subscribe(renderMermaidBlocks);
} else {
  window.addEventListener("DOMContentLoaded", renderMermaidBlocks);
}
