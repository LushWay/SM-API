import { is } from 'xapi.js'
import { MENU } from '../../Server/Menu/var.js'
import { JOIN } from '../../Server/PlayerJoin/var.js'
import { Region } from '../../Server/Region/Region.js'
import { loadRegionsWithGuards } from '../../Server/Region/index.js'
import './anarchy.js'
import { BASE_ITEM_STACK } from './base.js'
import './bouncyTnt.js'
import './fireworks.js'
import './raid.js'
import './spawn.js'

console.log('§6Gameplay mode: survival')

loadRegionsWithGuards(
  // Common actions guard
  (player, region, context) => {
    if (player.hasTag('modding') || is(player.id, 'builder')) return true

    if (region) {
      if (region.permissions.owners.includes(player.id)) return true
    } else {
      if (
        player
          .getComponent('inventory')
          .container.getItem(player.selectedSlot)
          ?.isStackableWith(BASE_ITEM_STACK)
      )
        return true

      if (context.type === 'break' && player.isGamemode('adventure'))
        return true
    }
  },

  // Spawn entity guard
  (region, data) =>
    !region ||
    region.permissions.allowedEntities === 'all' ||
    region.permissions.allowedEntities.includes(data.entity.typeId),

  (player, currentRegion) => {
    if (currentRegion && !currentRegion?.permissions.pvp) {
      player.triggerEvent('player:spawn')
    }
  }
)

Region.config.permissions = {
  allowedEntities: 'all',
  doorsAndSwitches: false,
  openContainers: false,
  owners: [],
  pvp: true,
}

JOIN.CONFIG.title_animation = {
  stages: ['» $title «', '»  $title  «'],
  vars: {
    title: '§aShp1nat§6Mine§r§f',
  },
}
JOIN.CONFIG.subtitle = 'Добро пожаловать!'

for (const key of Object.keys(JOIN.EVENT_DEFAULTS).filter(e => e !== 'join')) {
  JOIN.EVENTS[key].unsubscribe(JOIN.EVENT_DEFAULTS[key])
}

JOIN.EVENTS.firstTime.subscribe(player => {
  player.getComponent('inventory').container.addItem(MENU.item)
})
