const { DialogV2 } = foundry.applications.api;
/*
@param {String} characterName - The name of the character passed in as a string from actor-sheet.js
@param {Integer} skNum - The skill number passed in from actor-sheet.js
*/
function skillroll(characterName, skNum) {
  const thisActor = game.actors.getName(characterName);
  if (!thisActor) return;

  const content = document.createElement("div");
  content.innerHTML = `
      <label for="willpowerSpend" style="font-size: 25px;font-family: Daniel;">${game.i18n.localize("ROLL.Spend")}</label>
      <input type="number" name="willpowerSpend" placeholder="0" value="0" />
  `;

  const dialog = new DialogV2({
    window: {title: game.i18n.localize("ROLL.RollSkill")},
    content,
    buttons: [
      {
				action: "rollSkill",
        label: game.i18n.localize("ROLL.RollSkill"),
        type: "submit",
        value: "roll",
        icon: "fa-solid fa-dice-d20"
      },
      {
        label: "Fermer",
        type: "cancel"
      }
    ],
    submit: async (action, html) => {
      if (action !== "rollSkill") return;

      const input = html.element.querySelector("input[name='willpowerSpend']");
			let spend = 0;
			if (input && Number(input.value) > 0) {
				spend = input.value;
			}

      const roll = new Roll(`1d6 + ${spend}`);
      await roll.evaluate({ async: true });
      const resultat = roll.total;

      let skillDesc = "";
      switch (skNum) {
        case 1: skillDesc = thisActor.system.skills.skill1; break;
        case 2: skillDesc = thisActor.system.skills.skill2; break;
        case 3: skillDesc = thisActor.system.skills.skill3; break;
      }

      subtractWillpower(characterName, spend);

      const chatTemplate = `
				<p>${game.i18n.localize("ROLL.Skill")}: ${skillDesc}</p>
				<p>${game.i18n.format("ROLL.Rolled", { result: resultat, spend })}</p>
				<p>${game.i18n.localize(resultat >= 3 ? "ROLL.Check.Success" : "ROLL.Check.Failure")}</p>
			`;

      ChatMessage.create({
        content: chatTemplate,
        roll,
        speaker: { alias: characterName }
      });
    }
  }).render(true);
}

/*
@param {String} characterName - The name of the character passed in as a string from actor-sheet.js
@param {Integer} obLvl - The level of the obsession.
*/
function updateScore(characterName, obLvl) {
	console.log(characterName);
  let thisActor = game.actors.getName(characterName);
	console.log(thisActor);
  let messageContent = "";
  let newTally = 0;
  let newTotal = 0;

  switch (obLvl) {
    case 1:
      newTally = thisActor.system.scores.level1obsession + 1;
      newTotal = thisActor.system.scores.total + 1;
      thisActor.update({
        "system.scores.level1obsession": newTally,
        "system.scores.total": newTotal,
      });
      messageContent = `<p><b>Level 1 Obsession Complete</b></p>`;
      break;
    case 2:
      newTally = thisActor.system.scores.level2obsession + 1;
      newTotal = thisActor.system.scores.total + 2;
      thisActor.update({
        "system.scores.level2obsession": newTally,
        "system.scores.total": newTotal,
      });
      messageContent = `<p><b>Level 2 Obsession Complete</b></p>`;
      break;
    case 3:
      newTally = thisActor.system.scores.level3obsession + 1;
      newTotal = thisActor.system.scores.total + 3;
      thisActor.update({
        "system.scores.level3obsession": newTally,
        "system.scores.total": newTotal,
      });
      messageContent = `<p><b>Level 3 Obsession Complete</b></p>`;
      break;
  }

  ChatMessage.create({
    speaker: { alias: characterName },
    content: messageContent,
  });
}

/*
@param {String} characterName
@param {Number} amt
*/
function addWillpower(characterName, amt) {
  let thisActor = game.actors.getName(characterName);
  const newWillpower = thisActor.system.willpower + amt;
  thisActor.update({ "system.willpower": newWillpower });

  let chatTemplate = `
            <p><b>${characterName}</b> recovered ${amt} willpower</p>
            <p><b>New willpower:</b> ${newWillpower}</p>
            `;
  ChatMessage.create({
    content: chatTemplate,
    speaker: { alias: characterName },
  });
}

/*
@param {String} characterName
@param {Number} amt
*/
function subtractWillpower(characterName, amt) {
  let thisActor = game.actors.getName(characterName);
  const newWillpower = thisActor.system.willpower - amt;
  thisActor.update({ "system.willpower": newWillpower });
}

/*
@param {String} characterName - The name of the character passed in as a string from actor-sheet.js
@param {Integer} skNum - The skill number passed in from actor-sheet.js
*/
async function subtractBid(characterName) {
  const thisActor = game.actors.getName(characterName);
  if (!thisActor) return;

  const content = document.createElement("div");
  content.innerHTML = `
    <div class="dialog-content" style="display: flex; flex-direction: column; gap: 1em;">
      <h2 style="font-family: Daniel;">${game.i18n.localize("BID.ConfirmSubtract")}</h2>
      <p style="font-family: sans-serif; font-size: 14px;">${game.i18n.localize("BID.WarningSubtract")}</p>
      <input type="number" name="bidAmount" class="bidbox" placeholder="0" value="0" style="font-size: 20px;" />
    </div>
  `;

  new DialogV2({
    window: { title: game.i18n.localize("BID.SubtractBid") },
    content,
    buttons: [
      {
        action: "confirm",
        label: game.i18n.localize("BID.SubtractBid"),
        icon: "fa-solid fa-minus",
        default: true
      },
      {
        action: "cancel",
        label: game.i18n.localize("BID.Cancel")
      }
    ],
    submit: async (action, html) => {
      if (action === "cancel") return html.close();
      if (action !== "confirm") return;

      const input = html.element.querySelector("input.bidbox");
      const subtractThis = input && Number(input.value) > 0 ? Number(input.value) : 0;

      subtractWillpower(characterName, subtractThis);

      const chatTemplate = `
        <p><b>${game.i18n.localize("BID.ActiveVoice")}:</b> ${characterName}</p>
        <p><b>${game.i18n.localize("BID.BidSubtracted")}:</b> ${subtractThis}</p>
        <p><b>${game.i18n.localize("BID.RemainingWillpower")}:</b> ${thisActor.system.willpower - subtractThis}</p>
      `;

      ChatMessage.create({
        content: chatTemplate,
        speaker: { alias: characterName }
      });

      html.close();
    }
  }).render(true);
}

export { skillroll, updateScore, subtractBid, addWillpower };
