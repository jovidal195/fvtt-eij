export function setupToggleableProseMirrors(container, context) {
  container.querySelectorAll("prose-mirror.toggleable").forEach(pm => {
    const button = pm.querySelector("button.toggle");
    if (button) {
      button.disabled = false;
      button.addEventListener("click", () => {
        const state = pm.getAttribute("data-toggled");
        pm.setAttribute("data-toggled", state === "true" ? "false" : "true");
      });
    }

    pm.addEventListener("save", async () => {
      const value = pm.value;
      const path = pm.name;

      await context._updateField(path, value);

      const enriched = await foundry.applications.ux.TextEditor.enrichHTML(value, {
        secrets: context.document.isOwner,
        async: true,
        rollData: context.document.getRollData(),
        relativeTo: context.document
      });

      const display = pm.querySelector(".editor-content");
      if (display) display.innerHTML = enriched;
    });
  });
}