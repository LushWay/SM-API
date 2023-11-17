import { Vector, world } from '@minecraft/server'
import { Settings } from 'xapi.js'
import './class/Tool.js'
import './class/WorldEdit.js'
import './commands/index.js'

export const WE_PLAYER_SETTINGS = Settings.player('Строитель мира', 'we', {
  noBrushParticles: {
    name: 'Партиклы кисти',
    desc: 'Отключает партиклы у кисти',
    value: false,
  },
  enableMobile: {
    name: 'Мобильное управление',
    desc: 'Включает мобильное управление',
    value: false,
  },
})

world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
  if (itemStack.typeId === 'we:dash') {
    source.teleport(
      Vector.add(source.location, Vector.multiply(source.getViewDirection(), 5))
    )
  }
})
