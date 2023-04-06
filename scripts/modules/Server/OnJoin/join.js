import { Player, system, world } from "@minecraft/server";
import { Database } from "lib/Database/Rubedo.js";
import { XA } from "xapi.js";
import { __JOIN_EMITTERS } from "./events.js";
import "./subscribes.js";
import { CONFIG_JOIN } from "./var.js";

/** @type {Database<string, IJoinData>} */
const PDB = Database.eventProxy(new Database("player"), {
	beforeGet(player, data) {
		return (
			data ?? {
				learning: 1,
				joined: Date.now(),
			}
		);
	},
	beforeSet(key, value) {
		return value;
	},
});

world.events.playerJoin.subscribe(({ playerId }) => {
	const { data, save } = PDB.work(playerId);
	data.waiting = 1;
	save;
});

system.runTimeout(
	() => {
		if (!XA.state.first_load) return;
		const player = world.getAllPlayers()[0];
		const D = PDB.get(player.id);
		D.waiting = 1;
		PDB.set(player.id, D);
	},
	"owner start screen",
	80
);

system.runPlayerInterval(
	(player) => {
		const data = PDB.get(player.id);
		let modified = false;

		if (data.waiting === 1) {
			// New player (player joined)
			delete data.waiting;
			data.message = 1;

			const rot = player.getRotation();
			data.at = [
				player.location.x,
				player.location.y,
				player.location.z,
				rot.x,
				rot.y,
			];
			modified = true;
		}

		// Pos where player joined
		const pos = data.at;

		if (Array.isArray(pos)) {
			const rot = player.getRotation();
			const not_moved =
				player.location.x === pos[0] &&
				player.location.y === pos[1] &&
				player.location.z === pos[2] &&
				rot.x === pos[3] &&
				rot.y === pos[4];

			if (not_moved) {
				// Player still stays at joined position...
				if (player.hasTag("on_ground")) {
					// Player doesnt falling down, show animation
					data.stage = data.stage ?? -1;
					data.stage++;
					if (
						typeof data.stage !== "number" ||
						data.stage >= CONFIG_JOIN.animation.stages.length
					)
						data.stage = 0;

					// Creating title
					let title = CONFIG_JOIN.animation.stages[data.stage];
					for (const [key, value] of Object.entries(
						CONFIG_JOIN.animation.vars
					)) {
						title = title.replace("$" + key, value);
					}

					// Show actionBar
					if (
						"actionBar" in CONFIG_JOIN &&
						typeof CONFIG_JOIN.actionBar === "string"
					)
						player.onScreenDisplay.setActionBar(CONFIG_JOIN.actionBar);

					// Title + subtitle
					/** @type {import("@minecraft/server").TitleDisplayOptions} */
					const options = {
						fadeInSeconds: 0,
						fadeOutSeconds: 1,
						staySeconds: 2,
					};
					if (CONFIG_JOIN.subtitle) options.subtitle = CONFIG_JOIN.subtitle;
					// Show...
					player.onScreenDisplay.setTitle(title, options);
				} else {
					// Player joined in air
					JOIN(player, data, "air");
				}
			} else if (data.message) {
				// Player moved on ground
				JOIN(player, data, "ground");
			}
			modified = true;
		}
		if (data.learning && !data.message) {
			// Show first time join guide
			__JOIN_EMITTERS.PlayerGuide.emit(player);
			delete data.learning;
			modified = true;
		}

		if (modified) PDB.set(player.id, data);
	},
	"joinInterval",
	20
);

const getSettings = XA.PlayerOptions("join", {
	message: { desc: "Сообщения о входе других игроков", value: true },
	sound: { desc: "Звук входа других игроков", value: true },
});

/**
 *
 * @param {Player} player
 * @param {IJoinData} data
 * @param {"air" | "ground"} messageType
 */
function JOIN(player, data, messageType) {
	delete data.at;
	delete data.stage;
	delete data.message;

	data.times = (data.times ?? 0) + 1;

	for (const plr of world.getPlayers()) {
		if (plr.id === player.id) continue;
		const settings = getSettings(plr);
		if (settings.sound) plr.playSound(CONFIG_JOIN.onJoin.sound);
		if (settings.message)
			plr.tell(`§7${player.name} ${CONFIG_JOIN.onJoin[messageType]}`);
	}

	if (!data.learning) __JOIN_EMITTERS.PlayerJoin.emit(player);
	player.onScreenDisplay.clearTitle();

	const oldTag = data.name;

	if (oldTag === player.name) return;
	if (oldTag && oldTag !== player.name) {
		world.say(
			"§c> §3Игрок §f" + oldTag + " §r§3сменил ник на §f" + player.name
		);
	}

	data.name = player.name;
}

new XA.Command({
	name: "info",
	description: "Открывает гайд",
	type: "public",
}).executes((ctx) => {
	const D = PDB.get(ctx.sender.id);
	D.learning = 1;
	PDB.set(ctx.sender.id, D);
});

new XA.Command({
	name: "join",
	role: "admin",
	description: "Имитирует вход",
	type: "public",
}).executes((ctx) => {
	const D = PDB.get(ctx.sender.id);
	D.waiting = 1;
	PDB.set(ctx.sender.id, D);
});