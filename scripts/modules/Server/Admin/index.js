import { Player, world } from "@minecraft/server";
import { OPTIONS_NAME, Options } from "lib/Class/Options.js";
import { WorldDynamicPropertiesKey } from "lib/Database/Properties.js";
import { ActionForm } from "lib/Form/ActionForm.js";
import { ModalForm } from "lib/Form/ModalForm.js";
import { FormCallback, ROLES, getRole, setRole, util } from "xapi.js";

/** @type {WorldDynamicPropertiesKey<string, {role: keyof typeof ROLES, setter?: 1}>} */
const key = new WorldDynamicPropertiesKey("player");
const DB = key.proxy();

const NAME = new XCommand({
	name: "name",
	description: "Меняет имя",
	role: "admin",
});

NAME.literal({ name: "set" })
	.string("new name")
	.executes((ctx, newname) => {
		ctx.sender.nameTag = newname;
	});

NAME.literal({ name: "reset" }).executes((ctx) => {
	for (const player of world.getPlayers()) player.nameTag = player.name;
});

const R = new XCommand({
	name: "role",
	description: "Показывает вашу роль",
});

R.executes((ctx) => {
	const role = getRole(ctx.sender.id);
	const noAdmins = !Object.values(DB)
		.map((e) => e.role)
		.includes("admin");
	const isAdmin = role === "admin";
	const needAdmin = ctx.args[0] === "ACCESS";
	const beenAdmin = DB[ctx.sender.id].setter && !isAdmin;

	if (noAdmins && ctx.sender.isOp() && (needAdmin || beenAdmin)) {
		DB[ctx.sender.id].role = "admin";
		delete DB[ctx.sender.id].setter;
		return ctx.reply("§b> §3Вы получили роль §r" + ROLES.admin);
	}

	if (!isAdmin) return ctx.reply(`§b> §r${ROLES[role]}`);

	/**
	 *
	 * @param {Player} player
	 * @returns
	 */
	const callback = (player, fakeChange = false) => {
		return () => {
			const role = getRole(player.id);
			const ROLE = Object.keys(ROLES).map(
				(e) => `${role === e ? "> " : ""}` + ROLES[e],
			);
			new ModalForm(player.name)
				.addToggle("Уведомлять", false)
				.addToggle("Показать Ваш ник в уведомлении", false)
				.addDropdown(
					"Роль",
					ROLE,
					ROLE.findIndex((e) => e.startsWith(">")),
				)
				.addTextField("Причина смены роли", `Например, "космокс"`)
				.show(ctx.sender, (_, notify, showName, selected, message) => {
					if (selected.startsWith(">")) return;
					const newrole = Object.entries(ROLES).find(
						(e) => e[1] === selected,
					)?.[0];
					if (!newrole) _.error("Unknown role: " + newrole);
					if (notify)
						player.tell(
							`§b> §3Ваша роль сменена c ${ROLES[role]} §3на ${selected}${
								showName ? `§3 игроком §r${ctx.sender.name}` : ""
							}${message ? `\n§r§3Причина: §r${message}` : ""}`,
						);
					// @ts-expect-error
					setRole(player.id, newrole);
					if (fakeChange) {
						// @ts-expect-error
						DB[player.id].role = newrole;
						DB[player.id].setter = 1;
					}
				});
		};
	};
	const form = new ActionForm("Roles", "§3Ваша роль: " + ROLES[role]).addButton(
		"Сменить мою роль",
		null,
		callback(ctx.sender, true),
	);

	for (const player of world.getPlayers({ excludeNames: [ctx.sender.name] }))
		form.addButton(player.name, null, callback(player));

	form.show(ctx.sender);
});

new XCommand({
	name: "options",
	role: "member",
	description: "Настройки",
}).executes((ctx) => {
	poptions(ctx.sender);
});

/**
 * @param {Player} player
 */
function poptions(player) {
	const form = new ActionForm("§dНастройки");

	for (const groupName in Options.PLAYER) {
		const name = Options.PLAYER[groupName][OPTIONS_NAME];
		if (name)
			form.addButton(name, null, () => {
				group(player, groupName, "PLAYER");
			});
	}

	form.show(player);
}

new XCommand({
	name: "wsettings",
	role: "admin",
	description: "Настройки мира",
}).executes((ctx) => {
	options(ctx.sender);
});

/**
 * @param {Player} player
 */
function options(player) {
	const form = new ActionForm("§dНастройки мира");

	for (const groupName in Options.WORLD) {
		const data = OPTIONS_DB[groupName];
		const requires = Object.entries(Options.WORLD[groupName]).reduce(
			(count, [key, option]) =>
				option.requires && typeof data[key] === "undefined" ? count + 1 : count,
			0,
		);
		form.addButton(
			`${groupName}${requires ? ` §c(${requires}!)` : ""}`,
			null,
			() => {
				group(player, groupName, "WORLD");
			},
		);
	}

	form.show(player);
}

/** @type {import("lib/Class/Options.js").OPTIONS_DYN} */
const OPTIONS_DYN = new WorldDynamicPropertiesKey("options");
const OPTIONS_DB = OPTIONS_DYN.proxy();

/**
 *
 * @param {Player} player
 * @param {string} groupName
 * @param {"PLAYER" | "WORLD"} groupType
 * @param {Record<string, string>} [errors]
 */
function group(player, groupName, groupType, errors = {}) {
	const source = groupType === "PLAYER" ? Options.PLAYER : Options.WORLD;
	const config = source[groupName];
	const name = config[OPTIONS_NAME];
	const data = OPTIONS_DB[groupName];

	/** @type {[string, (input: string | boolean) => string][]} */
	const buttons = [];
	/** @type {ModalForm<(ctx: FormCallback, ...options: any) => void>} */
	const form = new ModalForm(name ?? groupName);

	for (const KEY in config) {
		const OPTION = config[KEY];
		const dbValue = data[KEY];
		const isDef = typeof dbValue === "undefined";
		const message = errors[KEY] ? `${errors[KEY]}\n` : "";
		const requires =
			Reflect.get(config[KEY], "requires") && typeof dbValue === "undefined";

		const value = dbValue ?? OPTION.value;
		const toggle = typeof value === "boolean";

		let label = toggle ? "" : "\n";
		label += message;
		if (requires) label += "§c(!) ";
		label += `§f${OPTION.name}`; //§r
		if (OPTION.desc) label += `§i - ${OPTION.desc}`;

		if (toggle) {
			if (isDef) label += `\n §8(По умолчанию)`;
			label += "\n ";
		} else {
			label += `\n   §7Значение: ${str(dbValue ?? OPTION.value)}`;
			label += `${isDef ? ` §8(По умолчанию)` : ""}\n`;

			label += `   §7Тип: §f${Types[typeof value] ?? typeof value}`;
		}

		if (toggle) form.addToggle(label, value);
		else
			form.addTextField(
				label,
				"Настройка не изменится",
				typeof value === "string" ? value : JSON.stringify(value),
			);

		buttons.push([
			KEY,
			(input) => {
				let total;
				if (typeof input !== "undefined") {
					if (typeof input === "boolean") total = input;
					else
						switch (typeof OPTION.value) {
							case "string":
								total = input;
								break;
							case "number":
								total = Number(input);
								if (isNaN(total)) return "§cВведите число!";
								break;
							case "object":
								try {
									total = JSON.parse(input);
								} catch (error) {
									return `§c${error.message}`;
								}
								break;
						}

					if (str(data[KEY]) === str(total)) return "";
					data[KEY] = total;
					OPTIONS_DB[groupName] = data;
					return "§aСохранено!";
				} else return "";
			},
		]);
	}

	form.show(player, (ctx, ...opts) => {
		/** @type {Record<string, string>} */
		const messages = {};
		for (const [i, option] of opts.entries()) {
			const [KEY, callback] = buttons[i];
			const result = callback(option);
			if (result) messages[KEY] = result;
		}

		if (Object.keys(messages).length)
			group(player, groupName, groupType, messages);
		else {
			if (groupType === "PLAYER") poptions(player);
			else options(player);
		}
	});
}

/**
 * @typedef {"string"
 * 	| "number"
 * 	| "object"
 * 	| "boolean"
 * 	| "symbol"
 * 	| "bigint"
 * 	| "undefined"
 * 	| "function"} AllTypes
 */

/** @type {Partial<Record<AllTypes, string>>} */
const Types = {
	string: "Строка",
	number: "Число",
	object: "JSON-Объект",
	boolean: "Переключатель",
};

/**
 * @param {any} value
 */
function str(value) {
	if (typeof value === "string") return value;
	return util.inspect(value);
}

new XCommand({
	name: "speed",
	description: "Меняет скорость",
}).executes((ctx) => {
	const speedc = ctx.sender.getComponent("flying_speed");
	new ModalForm("Скорость")
		.addSlider("Скросоть", 1, 100, 1, speedc.value)
		.show(ctx.sender, (_, speed) => {
			speedc.value = speed;
		});
});
