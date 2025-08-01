import { ATTRIBUTE_TYPES } from "./constants.js";
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
import { setupToggleableProseMirrors } from "./utils/prose-mirror.mjs";
import { patchUpdatedFields } from "./utils/form.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class SimpleItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
	static PARTS = {
    form: {
      template: "systems/fvtt-eij/templates/item-sheet.html",
    }
  };

  /** @override */
  static get DEFAULT_OPTIONS() {
    return foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["eij", "sheet", "item"],
			position: {				
				width: 520,
				height: 480,
			},
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "description",
        },
      ],
    });
  }
	
	get title() {
		return this.item.name;
	}

	_onRender(context, options) {
		super._onRender?.(context, options);
		
		requestAnimationFrame(() => {
			const content = this.element.querySelector(".window-content");
			if (!content) return;

			this._activateTabNavigation();
			this.activateListeners(content);
		});
	}


  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    for (let attr of Object.values(context.document.system.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
      attr.isResource = attr.dtype === "Resource";
    }
		
		const enrichedDescription =  await foundry.applications.ux.TextEditor.enrichHTML(
			this.item.system.description,
			{
			secrets: this.document.isOwner,
			async: true,
			rollData: this.item.getRollData(),
			relativeTo: this.item
			}
		)
			
    return {
      item: context.document,
      system: context.document.system,
      dtypes: ATTRIBUTE_TYPES,
			enrichedDescription : enrichedDescription
    };
  }
	
	async _updateField(path, value) {
	  await this.document.update({ [path]: value });
	  patchUpdatedFields(this.element, { [path]: value });
	}
  /* -------------------------------------------- */

	_activateTabNavigation() {
		const nav = this.element.querySelector(".sheet-tabs");
		const content = this.element.querySelector(".sheet-body");
		if (!(nav && content)) return;

		const links = nav.querySelectorAll("a.item");
		const tabs = content.querySelectorAll(".tab");

		const saved = this._activeTab ?? this.options.tabs?.[0]?.initial ?? tabs[0]?.dataset.tab;

		tabs.forEach(t => {
			const match = t.dataset.tab === saved;
			t.style.display = match ? "" : "none";
			t.classList.toggle("active", match);
		});

		links.forEach(link => {
			link.classList.toggle("active", link.dataset.tab === saved);

			link.addEventListener("click", ev => {
				ev.preventDefault();
				const selected = link.dataset.tab;
				this._activeTab = selected;

				tabs.forEach(t => {
					const match = t.dataset.tab === selected;
					t.style.display = match ? "" : "none";
					t.classList.toggle("active", match);
				});

				links.forEach(l => l.classList.toggle("active", l === link));
			});
		});
	}

  /** @override */
  /*setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }*/

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {

		setupToggleableProseMirrors(html, this);
    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove Attribute
    html
      .find(".attributes")
      .on(
        "click",
        ".attribute-control",
        this._onClickAttributeControl.bind(this)
      );
  }

  /* -------------------------------------------- */

  /**
   * Listen for click events on an attribute control to modify the composition of attributes in the sheet
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const attrs = this.object.system.attributes;
    const form = this.form;

    // Add new attribute
    if (action === "create") {
      const objKeys = Object.keys(attrs);
      let nk = Object.keys(attrs).length + 1;
      let newValue = `attr${nk}`;
      let newKey = document.createElement("div");
      while (objKeys.includes(newValue)) {
        ++nk;
        newValue = `attr${nk}`;
      }
      newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="${newValue}"/>`;
      newKey = newKey.children[0];
      form.appendChild(newKey);
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if (action === "delete") {
      const li = a.closest(".attribute");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {
    // Handle the free-form attributes list
	const expanded = foundry.utils.expandObject(formData);
	const isLegacyStructure = expanded?.data?.attributes !== undefined;
	if(isLegacyStructure){
		const formAttrs = foundry.utils.expandObject(formData).data.attributes || {};
		const attributes = Object.values(formAttrs).reduce((obj, v) => {
		  let k = v["key"].trim();
		  if (/[\s\.]/.test(k))
			return ui.notifications.error(
			  "Attribute keys may not contain spaces or periods"
			);
		  delete v["key"];
		  obj[k] = v;
		  return obj;
		}, {});

		// Remove attributes which are no longer used
		for (let k of Object.keys(this.object.system.attributes)) {
		  if (!attributes.hasOwnProperty(k)) attributes[`-=${k}`] = null;
		}

		// Re-combine formData
		formData = Object.entries(formData)
		  .filter((e) => !e[0].startsWith("system.attributes"))
		  .reduce(
			(obj, e) => {
			  obj[e[0]] = e[1];
			  return obj;
			},
			{ _id: this.object._id, "system.attributes": attributes }
		  );

		// Update the Item
		return this.object.update(formData);
	}else{
		const formAttrs = expanded?.item?.system?.attributes ?? {};
		const attributes = Object.values(formAttrs).reduce((obj, v) => {
			let k = v["key"]?.trim();
			if (!k) return obj;
			if (/[\s\.]/.test(k)) {
			  ui.notifications.error("Attribute keys may not contain spaces or periods");
			  return obj;
			}
			delete v["key"];
			obj[k] = v;
			return obj;
		  }, {});

		// Remove attributes which are no longer used
		for (let k of Object.keys(this.object.system.attributes)) {
		  if (!attributes.hasOwnProperty(k)) attributes[`-=${k}`] = null;
		}

		const updateData = {
			_id: this.object.id,
			"system.attributes": attributes,
			"system.description": expanded.system?.description ?? "",
			"system.quantity": expanded.item?.system?.quantity ?? 0,
			"system.weight": expanded.item?.system?.weight ?? 0,
			name: expanded.name ?? this.object.name,
			img: expanded.img ?? this.object.img,
		  };
		  
		// Update the Item
		return this.object.update(updateData);
	}
  }
}
