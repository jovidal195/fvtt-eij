import { ATTRIBUTE_TYPES } from "./constants.js";
import { skillroll, updateScore, subtractBid, addWillpower } from "./eij.js";
import { patchUpdatedFields } from "./utils/form.mjs";
const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class EveryoneIsJohnActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static PARTS = {
    form: {
      template: "systems/fvtt-eij/templates/actor-sheet.html"
    }
  };
	
	/** @override */
  static get DEFAULT_OPTIONS() {
    return foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["eij", "sheet", "actor"],
      template: "systems/fvtt-eij/templates/actor-sheet.html",
      position: {
				width: 600,
				height: 600
			},
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "description",
        },
      ],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    });
  }

	get title() {
	  return this.actor.name;
	}

  /* -------------------------------------------- */
  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
		const showName = game.settings.get("fvtt-eij", "Name");
    
	  const actor = this.document; // structure safe, légère et sans embedded classes
	  
	  // Préparation du contexte pour Handlebars
	  foundry.utils.mergeObject(context, {
			actor,
			system: actor.system,
			flags: actor.flags,
			items: actor.items.map(i => i.toObject()),
			editable: this.isEditable,
			showName: showName
	  });
		
		return {
				actor: context.actor,
				data: context.system,
			showName: showName,
				dtypes: ["String", "Number", "Boolean"],
			};
  }
	
	_onRender(context, options) {
		super._onRender?.(context, options);
		
		requestAnimationFrame(() => {
			const content = this.element.querySelector(".window-content");
			if (!content) return;

			this.activateListeners(content);
		});
	}
	
	async _updateObject(event, formData) {
    await this.actor.update(formData);
  }
	
	
	async _updateField(path, value) {
	  await this.document.update({ [path]: value });
	  patchUpdatedFields(this.element, { [path]: value });
	}
	
	_onInputChange(event) {
		const input = event.currentTarget;
		if (!input.name) return;

		let value = input.value;

		// Traitement spécial selon le type de champ
		switch (input.type) {
			case "checkbox":
				value = input.checked;
				break;
			case "number":
				value = input.valueAsNumber;
				break;
		}

		// Applique la mise à jour sans render
		this._updateField(input.name, value);
	}
	
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    //super.activateListeners(html);

    const root = html; // html est un HTMLElement dans App V2

		let characterName = this.options.document.name;


		// Input / select changes
		root.querySelectorAll("input[name], select[name]").forEach(el => {
			el.addEventListener("change", this._onInputChange.bind(this));
		});

		// Nom du personnage (charname) modifié
		root.querySelector(".sheet-header h1.charname input")?.addEventListener("change", ev => {
			characterName = root.closest(".app")?.querySelector(".sheet-header h1.charname input")?.value;
		});

		// Si une 3e compétence est ajoutée, la volonté de départ passe à 7, sinon 10
		root.querySelector("input.special")?.addEventListener("change", ev => {
			const sk3 = root.closest(".app")?.querySelector("input.special")?.value ?? "";
			const newWillpower = sk3 === "" ? 10 : 7;
			const thisActor = game.actors.getName(characterName);
			if (thisActor) thisActor.update({ "system.willpower": newWillpower });
		});

		// Rouler les compétences (skillroll)
		root.querySelector(".column .row a.rowlabel.sk1")?.addEventListener("click", () => skillroll(characterName, 1));
		root.querySelector(".column .row a.rowlabel.sk2")?.addEventListener("click", () => skillroll(characterName, 2));
		root.querySelector(".column .row a.rowlabel.sk3")?.addEventListener("click", () => skillroll(characterName, 3));

		// Incrémenter les obsessions
		root.querySelector(".column .row a.rowlabel.ob1")?.addEventListener("click", () => updateScore(characterName, 1));
		root.querySelector(".column .row a.rowlabel.ob2")?.addEventListener("click", () => updateScore(characterName, 2));
		root.querySelector(".column .row a.rowlabel.ob3")?.addEventListener("click", () => updateScore(characterName, 3));

		// Bouton "soustraire enchère"
		root.querySelector("button.subtractBid")?.addEventListener("click", () => subtractBid(characterName));

		// Bouton "récupérer de la volonté"
		root.querySelector("button.addWillpower")?.addEventListener("click", () => addWillpower(characterName, 1));
  } //end of activatelisteners
}
