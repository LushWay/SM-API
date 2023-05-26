import { Player, Vector } from "@minecraft/server";
import { ActionForm } from "../../../lib/Form/ActionForm.js";
import { ModalForm } from "../../../lib/Form/ModelForm.js";
import { RadiusRegion } from "../../Server/Region/Region.js";

/**
 * @param {Player} player
 * @param {RadiusRegion} base
 */
export function baseMenu(player, base) {
	const isOwner = base.permissions.owners[0] === player.id;
	const form = new ActionForm(
		"Меню базы",
		`${
			isOwner
				? "Это ваша база."
				: "База игрока " + XA.Entity.getNameByID(base.permissions.owners[0])
		}\n\nКоординаты: ${Vector.string(base.center)}`
	)
		.addButton("Телепорт!", null, () =>
			player.teleport(Vector.add(base.center, { x: 0.5, y: 2, z: 0.5 }))
		)
		.addButton("Участники", null, () => members(player, base));

	if (isOwner)
		form.addButton("Разрешения", null, () => permissions(player, base));

	form.show(player);
}

/**
 * @param {Player} player
 * @param {RadiusRegion} base
 */
function members(player, base) {
	const isOwner = base.permissions.owners[0] === player.id;
	const form = new ActionForm(
		"Участники базы",
		isOwner
			? "Для управления участником нажмите на кнопку с его ником"
			: "Вы можете только посмотреть их"
	);

	form.addButton("< Назад", null, () => baseMenu(player, base));

	if (isOwner) form.addButton("Добавить!", "textures/ui/plus", () => {});
	for (const member of base.permissions.owners) {
		const name = XA.Entity.getNameByID(member) ?? "§7<unknown>";
		form.addButton(name, null, () => {});
	}

	form.show(player);
}

/**
 * @param {Player} player
 * @param {RadiusRegion} base
 */
function permissions(player, base) {
	new ModalForm("Разрешения базы")
		.addToggle(
			"Двери и переключатели\n§7Определяет, смогут ли не добавленные в базу игроки использовать двери и переключатели.",
			base.permissions.doorsAndSwitches
		)
		.addToggle(
			"Контейнеры\n§7Определяет, смогут ли не добавленные в базу игроки открывать контейнеры (сундуки, шалкеры и тд)",
			base.permissions.openContainers
		)
		.show(player, (ctx, doors, containers) => {
			base.permissions.doorsAndSwitches = doors;
			base.permissions.openContainers = containers;
			base.update();
			baseMenu(player, base);
		});
}