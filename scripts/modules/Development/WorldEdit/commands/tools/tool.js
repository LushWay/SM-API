import {
	EquipmentSlot,
	MolangVariableMap,
	Vector,
	system,
} from "@minecraft/server";
import { ActionForm, ModalForm } from "xapi.js";
import { ListParticles } from "../../../../../lib/List/particles.js";
import { ListSounds } from "../../../../../lib/List/sounds.js";
import { WorldEditTool } from "../../builders/ToolBuilder.js";

const lists = {
	Particle: ListParticles,
	Sound: ListSounds,
};

new WorldEditTool({
	name: "tool",
	itemStackId: "we:tool",
	displayName: "инструмент",
	editToolForm(item, player) {
		let lore = item.getLore();
		new ActionForm(
			"§3Инструмент",
			"Настройте что будет происходить при использовании инструмента."
		)
			.addButton("Телепорт по взгляду", () => {
				item.nameTag = `§r§a► Телепорт по взгляду`;
				lore[0] = "teleportToView";

				item.setLore(lore);
				player.tell(`§a► §rРежим инструмента изменен на телепорт по взгляду`);
			})
			.addButton("Выполнение команды", () => {
				new ModalForm("§3Инструмент")
					.addTextField("Команда", "/tp @s ^^^5")
					.show(player, (_, command) => {
						if (command.startsWith("/")) command = command.substring(1);

						item.nameTag = `§r§aR► §f${command}`;
						lore[0] = "runCommand";
						lore[1] = command;

						item.setLore();
						player.tell(`§aR► §fКоманда: §7${command}`);
					});
			})
			.addButton("Проверка звуков", () => {
				SelectFromArray(ListSounds, "§3Звук", (sound, index) => {
					item.nameTag = `§3Звук`;
					lore[0] = "Sound";
					lore[1] = sound;
					lore[2] = index.toString();

					item.setLore();
					player.tell(`§aR► §fЗвук: §7${index} ${sound}`);
				});
			})
			.addButton("Проверка партиклов", () => {
				SelectFromArray(ListParticles, "§3Партикл", (particle, index) => {
					item.nameTag = `§3Партикл`;
					lore[0] = "Particle";
					lore[1] = particle;
					lore[2] = index.toString();

					item.setLore();
					player.tell(`§aR► §fПартикл: §7${index} ${particle}`);
				});
			})
			.show(player);

		/**
		 *
		 * @param {string[]} array
		 * @param {string} name
		 * @param {(element: string, index: number) => void} callback
		 */
		function SelectFromArray(array, name, callback) {
			const none = "Никакой";
			new ModalForm(name)
				.addDropdown("Из списка", [none, ...array], 0)
				.addTextField("ID Текстом", "Будет выбран из списка выше")
				.show(player, (ctx, list, text) => {
					let element;
					let index;
					if (list === none) {
						if (!element)
							return ctx.error("Выберите из списка или ввeдите ID!");
						element = text;
						index = array.indexOf(element);
						if (!index)
							return ctx.error(
								"Неизвестный ID! Убедитесь что он начинается с minecraft:"
							);
					} else {
						element = list;
						index = array.indexOf(element);
					}

					callback(element, index);
				});
		}
	},
	onUse(player, item) {
		let lore = item.getLore();
		if (!lore || !lore[0]) return;
		const act = lore[0];

		if (lore && act in lists) {
			// @ts-expect-error
			const list = lists[act];
			const num = Number(lore[2]) + (player.isSneaking ? 1 : -1);
			lore[1] = list[num] ?? lore[1];
			lore[2] = num.toString();
			item.setLore(lore);
		}
		if (act === "runCommand") {
			player.runCommand(lore[1]);
		}
		if (act === "teleportToView") {
			const dot = player.getBlockFromViewDirection();
			if (dot && dot.block) player.teleport(dot.block);
		}
	},
});

const variables = new MolangVariableMap();

system.runPlayerInterval(
	(player) => {
		const item = player
			.getComponent("equipment_inventory")
			.getEquipmentSlot(EquipmentSlot.mainhand);

		if (!item || item.typeId !== "we:tool") return;

		const lore = item.getLore();

		if (lore[0] === "Particle") {
			const { block } = player.getBlockFromViewDirection({
				includeLiquidBlocks: false,
				includePassableBlocks: false,
				maxDistance: 50,
			});

			if (!block) return;

			block.dimension.spawnParticle(
				lore[1],
				Vector.add(block.location, { x: 0.5, z: 0.5, y: 1.5 }),
				variables
			);
		}

		if (lore[0] === "Sound") {
			player.playSound(lore[1]);
		}
	},
	"we tool",
	20
);