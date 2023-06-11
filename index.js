/* eslint-disable no-undef */
/* eslint-disable no-constant-condition */

module.exports = function EndlessCrafting(mod) {
	const { player } = mod.require.library;
	const PIE_ID = [282106, 282006, 206023];
	const PIE_AB_ID = [690098, 690091, 70264];	
	const Tear = [6498, 6500, 6501, 152902, 155617, 179051, 179052, 181099, 181100, 182439, 211801, 211802];
	const elPlate = 282051;

	mod.dispatch.addDefinition("S_FATIGABILITY_POINT", 3, [
		["unk", "int32"],
		["maxFatigability", "int32"],
		["fatigability", "int32"]
	]);

	mod.game.initialize(["me.abnormalities", "inventory"]);

	let craftItem = null,
		pp = null,
		enabled = false,
		timeout = null,
		usePie = false,
		recipe = null,
		extraDelay = 0,
		numCrafts = 0,
		numCrits = 0,
		hooks = [];

	mod.command.add("craft", {
		$none: () => {
			enabled = !enabled;
			mod.command.message(`Endless crafting module ${enabled ? "enabled." : "disabled."}`);
			(enabled) ? load() : unload();
			if (mod.settings.delay < 0) {
				mod.settings.delay = 0;
				mod.command.message("Invalid mod.settings.delay, delay is now 0");
			}
		},
		point: arg => {
			mod.settings.pointPP = arg;
			mod.command.message(`Use Elin's Tear when production points are below <font color="#fdff00">${mod.settings.pointPP}</font>`);
		},
		unlock: () => {
			unlock();
		},
		pie: () => {
			mod.settings.reUsePie = !mod.settings.reUsePie;
			mod.command.message(`Pie reuse is now ${mod.settings.reUsePie ? "on" : "off"}`);
		},
		delay: (number) => {
			const tempDelay = parseInt(number);
			if (tempDelay && tempDelay >= 0) {
				mod.settings.delay = tempDelay;
				mod.command.message(`Crafting delay set to ${mod.settings.delay}`);
			} else {
				mod.command.message(`Invalid crafting delay. Current delay = ${mod.settings.delay}`);
			}
		},
		$default: (chatLink) => {
			const regexId = /#(\d*)@/;
			const id = chatLink.match(regexId);
			if (id) {
				mod.settings.cureId = parseInt(id[1]);
				mod.command.message(`Using pp consumable with id:${mod.settings.cureId}`);
			} else {
				mod.command.message("Error, not a chatLink nor delay. Please type \"craft <Item>\" or \"craft delay aNumber\". Link the item with Ctrl+LMB.");
			}
		}
	});


	function unlock() {
		clearTimeout(timeout);
		timeout = mod.setTimeout(() => {
			mod.send("S_START_PRODUCE", 3, {
				duration: 0
			});
		}, 0);
	}

	function doneCrafting() {
		mod.command.message(`You crafted ${numCrafts.toString().clr("00BFFF")} times and crit ${numCrits.toString().clr("32CD32")} times.`);
		unlock();
	}

	function hook() { hooks.push(mod.hook(...arguments)); }

	function unload() {
		clearTimeout(timeout);
		timeout = setTimeout(doneCrafting, 5000); // send fake failed craft after 5 sec to unlock the character
		if (hooks.length) {
			for (const h of hooks)
				mod.unhook(h);
			hooks = [];
		}
	}

	function load() {
		if (!hooks.length) {
			usePie = true;
			numCrafts = 0;
			numCrits = 0;

			hook("S_ABNORMALITY_END", 1, event => {
				if (PIE_AB_ID.includes(event.id) && mod.settings.reUsePie && mod.game.me.is(event.target)) {
					usePie = true;
				}
			});

			hook("S_FATIGABILITY_POINT", 3, event => {
				pp = event.fatigability;
			});

			hook("C_START_PRODUCE", 1, event => {
				craftItem = event;
				recipe = event.recipe;
			});

			hook("S_PRODUCE_CRITICAL", 1, () => {
				numCrits++;
			});

			hook("S_END_PRODUCE", 1, event => {
				if (!event.success) return;
				const items = mod.game.inventory.findInBagOrPockets(Tear);
				numCrafts++;
				extraDelay = 0;
				if (usePie || !PIE_AB_ID.includes(mod.game.me.abnormalities) && mod.settings.reUsePie) {
					usePie = false;					
					const foundPie	= mod.game.inventory.findInBagOrPockets(PIE_ID);
					if (foundPie && mod.game.inventory.findAllInBagOrPockets(foundPie.id).length !== 0) {
						extraDelay = 5000;
						mod.command.message("Using Moongourd Pie.");
						// mod.setTimeout(() => {
							useItem(foundPie.id);
						// }, extraDelay / 2);
					} else {
						mod.command.message("You have 0 Moongourd Pies.");
					}
				}

				if (pp < mod.settings.pointPP && pp !== null) {
					if (items && mod.game.inventory.findAllInBagOrPockets(items.id).length !== 0) {
						mod.command.message(`Using Elinu's Tear. ${pp}`);
						extraDelay += 1000;
						mod.setTimeout(() => {
							useItem(items.id, items.dbid);
							mod.hookOnce("S_FATIGABILITY_POINT", 3, () => {
								mod.send("C_START_PRODUCE", 1, craftItem);
							});
						}, 50 + extraDelay);
					} else {
						mod.command.message("Not found Elinu's Tear.");
					}
				} else {
					clearTimeout(timeout);
					timeout = mod.setTimeout(() => {
						mod.send("C_START_PRODUCE", 1, craftItem);
					}, mod.settings.delay + extraDelay);
				}
				if (recipe === elPlate) {
					if (pp >= 3600) return;
					if (pp <= 750) {
						mod.setTimeout(() => useItem(items.id, items.dbid), 2000);
					}
				}
			});
		}
	}

	function useItem(id, dbid) {
		if (!player) return;
		mod.send("C_USE_ITEM", 3, {
			gameId: mod.game.me.gameId,
			id: id,
			dbid: dbid,
			amount: 1,
			loc: player.loc,
			w: player.loc.w,
			unk4: true
		});
	}
};