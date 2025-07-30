export function patchUpdatedFields(html, updateData) {
  for (const [key, value] of Object.entries(foundry.utils.flattenObject(updateData))) {
    const input = html.querySelector(`[name="${key}"]`);
    if (!input) continue;

    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.value = value;
    } else if (input instanceof HTMLSelectElement) {
      input.value = value;
      input.dispatchEvent(new Event("change"));
    }
  }
}