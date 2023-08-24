import { Vector, world } from "@minecraft/server";
import { ModalForm } from "xapi.js";
import { WorldEditPlayerSettings } from "../../WBindex.js";
import { Shape } from "../../builders/ShapeBuilder.js";
import { WorldEditTool } from "../../builders/ToolBuilder.js";
import { CONFIG_WE } from "../../config.js";
import { SHAPES } from "../../utils/shapes.js";
import { getBlockSet, getBlockSets } from "../general/menu.js";

world.overworld
	.getEntities({
		type: "f:t",
		name: CONFIG_WE.BRUSH_LOCATOR,
	})
	.forEach((e) => e.triggerEvent("f:t:kill"));

const brush = new WorldEditTool({
	name: "brush",
	displayName: "кисть",
	itemStackId: "we:brush",
	loreFormat: {
		version: 1,

		blocksSet: "",
		shape: "sphere",
		radius: 1,
		maxDistance: 300,
	},
	editToolForm(slot, player) {
		const lore = brush.parseLore(slot.getLore());
		const shapes = Object.keys(SHAPES);

		new ModalForm("§3Кисть")
			.addDropdown(
				"Форма",
				shapes,
				shapes.findIndex((e) => e === lore.shape)
			)
			.addSlider("Размер", 1, 10, 1, lore.radius)
			.addDropdown(
				"Набор блоков",
				...ModalForm.arrayAndDefault(
					Object.keys(getBlockSets(player)),
					lore.blocksSet
				)
			)
			.show(player, (ctx, shape, radius, blocksSet) => {
				if (!SHAPES[shape]) return ctx.error("§c" + shape);
				lore.shape = shape;
				lore.radius = radius;
				lore.blocksSet = blocksSet;
				slot.nameTag = "§r§3Кисть §6" + shape;
				slot.setLore(brush.stringifyLore(lore));
				player.tell(
					`§a► §r${
						lore.blocksSet ? "Отредактирована" : "Создана"
					} кисть ${shape} с набором блоков ${blocksSet} и радиусом ${radius}`
				);
			});
	},
	interval(player, slot, settings) {
		const lore = brush.parseLore(slot.getLore());
		const dot = player.getBlockFromViewDirection({
			maxDistance: lore.maxDistance,
		});
		const entities = player.dimension.getEntities({
			type: "f:t",
			name: CONFIG_WE.BRUSH_LOCATOR,
			tags: [player.name],
		});
		if (dot && !settings.noBrushParticles) {
			const { block } = dot;
			if (!entities) {
				const entity = player.dimension.spawnEntity("f:t", block.location);
				entity.addTag(player.name);
			}
			for (const entity of entities) {
				if (Vector.distance(entity.location, block) > 1) {
					entity.triggerEvent("f:t:kill");
				}
			}
		} else {
			for (const entity of entities) entity.triggerEvent("f:t:kill");
		}
	},
	onUse(player, item) {
		const settings = WorldEditPlayerSettings(player);
		if (settings.enableMobile) return;

		const lore = brush.parseLore(item.getLore());
		const dot = player.getBlockFromViewDirection({
			maxDistance: lore.maxDistance,
		});

		if (dot.block) {
			new Shape(
				SHAPES[lore.shape],
				dot.block.location,
				getBlockSet(getBlockSets(player), lore.blocksSet),
				lore.radius
			);
		}
	},
});
