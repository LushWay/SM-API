import {
	ContainerSlot,
	EquipmentSlot,
	ItemStack,
	ItemTypes,
	Player,
	world,
} from "@minecraft/server";
import { MessageForm, util } from "xapi.js";

/**
 * @template {Record<string, any> & {version: number}} [LoreFormat=any]
 */
export class WorldEditTool {
	/**
	 * @type {WorldEditTool<any>[]}
	 */
	static TOOLS = [];
	/**
	 * @param {Object} o
	 * @param {string} o.name
	 * @param {string} o.displayName
	 * @param {string} o.itemStackId
	 * @param {WorldEditTool['editToolForm']} o.editToolForm
	 * @param {LoreFormat} [o.loreFormat]
	 * @param {(player: Player, item: ItemStack) => void} [o.onUse]
	 */
	constructor({
		name,
		displayName,
		itemStackId,
		editToolForm,
		loreFormat,
		onUse,
	}) {
		WorldEditTool.TOOLS.push(this);
		this.name = name;
		this.displayName = displayName;
		this.item = itemStackId;
		this.editToolForm = editToolForm;
		this.loreFormat = loreFormat ?? { version: 0 };
		this.loreFormat.version ??= 0;
		this.onUse = onUse;
		this.command = new XCommand({
			name,
			description: `Создает или редактирует ${displayName}`,
			role: "builder",
			type: "we",
		}).executes((ctx) => {
			const slotOrError = this.getToolSlot(ctx.sender);

			if (typeof slotOrError === "string") ctx.error(slotOrError);
			else this.editToolForm(slotOrError, ctx.sender);
		});
	}
	/**
	 * @param {Player} player
	 */
	getToolSlot(player) {
		const slot = player
			.getComponent("inventory")
			.container.getSlot(player.selectedSlot);

		if (slot.getItem()?.typeId) {
			if (slot.typeId !== this.item) {
				return `Возьми ${this.displayName} в руки для настройки или выбери пустой слот чтобы создать!`;
			}
		} else {
			slot.setItem(new ItemStack(ItemTypes.get(this.item)));
		}

		return slot;
	}
	/**
	 * @param {Player} player
	 * @returns {string}
	 */
	getMenuButtonName(player) {
		const { typeId } = player
			.getComponent("equipment_inventory")
			.getEquipmentSlot(EquipmentSlot.mainhand);

		const edit = typeId === this.item;

		return `${edit ? "§2Редактировать" : "Создать"} ${this.displayName}`;
	}
	/**
	 * @param {ContainerSlot} slot
	 * @param {Player} player
	 */
	editToolForm(slot, player) {
		new MessageForm(
			"Не настроено.",
			"Редактирование этого инструмента не настроено."
		).show(player);
	}
	/**
	 * @param {string[]} lore
	 * @returns {LoreFormat | undefined}
	 */
	parseLore(lore) {
		let raw;
		try {
			raw = JSON.parse(lore[0].replace(/§(.)/g, "$1"));
		} catch (e) {}
		if (raw?.version !== this.loreFormat.version) {
			// @ts-expect-error
			return this.loreFormat;
		}
		delete raw.version;

		return raw;
	}
	/** @type {Record<string, string>} */
	loreTranslation = {
		shape: "Форма",
		size: "Размер",
		height: "Высота",
		blocksSet: "Набор блоков",
	};
	/**
	 * @param {LoreFormat} format
	 * @returns {string[]}
	 */
	stringifyLore(format) {
		return [
			JSON.stringify(format)
				.split("")
				.map((e) => "§" + e)
				.join(""),

			...Object.entries(format)
				.filter(([key]) => key !== "version")
				.map(
					([key, value]) =>
						`§r§f${this.loreTranslation[key] ?? key}: ${util.inspect(value)}`
				),
		];
	}
}

world.afterEvents.itemUse.subscribe(({ source: player, itemStack: item }) => {
	if (!(player instanceof Player)) return;
	const tool = WorldEditTool.TOOLS.find((e) => e.item === item.typeId);
	if (tool) tool.onUse(player, item);
});
