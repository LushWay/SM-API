import { EquipmentSlot, Player, system, world } from "@minecraft/server";
import {
	MinecraftEntityTypes,
	MinecraftItemTypes,
} from "@minecraft/vanilla-data.js";

world.beforeEvents.itemUse.subscribe((data) => {
	if (data.itemStack.typeId !== MinecraftItemTypes.Tnt) return;
	if (!(data.source instanceof Player)) return;
	data.cancel = true;

	system.run(() => {
		if (!(data.source instanceof Player)) return;

		const tnt = data.source.dimension.spawnEntity(
			MinecraftEntityTypes.Tnt,
			data.source.location,
		);
		const tntSlot = data.source
			.getComponent("equippable")
			.getEquipmentSlot(EquipmentSlot.Mainhand);

		if (tntSlot.amount === 1) tntSlot.setItem(undefined);
		else tntSlot.amount--;

		tnt.applyImpulse(data.source.getViewDirection());
		data.source.playSound("camera.take_picture", { volume: 4, pitch: 0.9 });
	});
});
