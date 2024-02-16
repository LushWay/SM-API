import { Player, system } from '@minecraft/server'
import { MinecraftBlockTypes } from '@minecraft/vanilla-data.js'
import { actionGuard } from 'lib/Region/index.js'
import { isBuilding } from 'modules/Build/isBuilding'
import { EditableLocation, SafeAreaRegion } from 'smapi.js'

export class DefaultPlaceWithInventory {
  /**
   * @type {DefaultPlaceWithInventory[]}
   */
  static places = []

  constructor() {
    DefaultPlaceWithInventory.places.push(this)
  }

  /**
   * Loads and saves player inventory
   * @param {Player} player - Player to load
   * @param {VoidFunction} callback - Function that gets executed when inventory actually needs to be loaded
   */
  loadInventory(player, callback) {
    if (isBuilding(player)) return

    const currentInventory = player.database.inv
    if (currentInventory === this.inventoryName) return

    DefaultPlaceWithInventory.places.forEach(place => {
      // Prevent from self saving
      if (place === this) return
      if (place.inventoryName === currentInventory) {
        place.saveInventory(player)
      }
    })

    callback()
  }

  /**
   * @param {Player} player
   */
  saveInventory(player) {}

  /** @type {InventoryTypeName} */
  inventoryName
}

export class DefaultPlaceWithSafeArea {
  /**
   * @param {string} name
   */
  constructor(name) {
    this.name = name
    this.portalTeleportsTo = new EditableLocation(name + ' портал телепортирует на', { type: 'vector3+rotation' }).safe
    this.portalPos2 = new EditableLocation(name + ' портал от', { type: 'vector3' }).safe
    this.portalPos1 = new EditableLocation(name + ' портал до', { type: 'vector3' }).safe
    this.safeAreaLocation = new EditableLocation(name + ' мирная зона', { type: 'vector3+radius' }).safe
    this.safeAreaLocation.onLoad.subscribe(location => {
      this.safeArea = new SafeAreaRegion({
        name,
        key: name + ' мирная зона',
        dimensionId: 'overworld',
        center: location,
        radius: location.radius,
      })
    })
  }
}

system.delay(() => {
  actionGuard((_, region, ctx) => {
    if (
      ctx.type === 'interactWithBlock' &&
      ctx.event.block.typeId === MinecraftBlockTypes.CraftingTable &&
      region instanceof SafeAreaRegion &&
      region.allowUsageOfCraftingTable
    ) {
      return true
    }
  })
})
