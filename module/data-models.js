const fields = foundry.data.fields;

class EIJCharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      notepad: new fields.StringField({ initial: "" }),
      willpower: new fields.NumberField({ initial: 10 }),

      skills: new fields.SchemaField({
        skill1: new fields.StringField({ initial: "" }),
        skill2: new fields.StringField({ initial: "" }),
        skill3: new fields.StringField({ initial: "" })
      }),

      obsessions: new fields.SchemaField({
        level1obsession: new fields.StringField({ initial: "" }),
        level2obsession: new fields.StringField({ initial: "" }),
        level3obsession: new fields.StringField({ initial: "" })
      }),

      scores: new fields.SchemaField({
        level1obsession: new fields.NumberField({ initial: 0 }),
        level2obsession: new fields.NumberField({ initial: 0 }),
        level3obsession: new fields.NumberField({ initial: 0 }),
        total: new fields.NumberField({ initial: 0 })
      })
    };
  }
}

class EIJItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.StringField({ initial: "" }),
      quantity: new fields.NumberField({ initial: 1 }),
      weight: new fields.NumberField({ initial: 0 }),
      attributes: new fields.ObjectField({ initial: {} })
    };
  }
}

Hooks.once("init", () => {
  CONFIG.Actor.dataModels.character = EIJCharacterData;
  CONFIG.Item.dataModels.item = EIJItemData;
});
