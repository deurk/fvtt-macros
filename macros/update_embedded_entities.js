// Updates all embedded entities of an actor
// 1) Select a token on a map (linked to an actor!)
// 2) Execute the macro
// 3) For each embedded entity, if there is an entry in a compendium (pack) with a matching name, the entity will be updated

// CONFIGURATION
// Specify which data should NOT be updated
// - any: applies to all entities (any type)
// - [key]: applies only to entities of type [key]
const NOUPDATE = {
  any: [ "data.quantity", "data.identified", "data.unidentified", "data.description.unidentified" ],
  class: [ "data.level" ]
}

// SCRIPT
// Do NOT change unless you know what you're doing!

const tokens = canvas.tokens.controlled;
let actors = tokens.map(o => o.actor);
if (!actors.length) actors = game.actors.entities.filter(o => o.isPC && o.hasPerm(game.user, "OWNER"));
actors = actors.filter(o => o.hasPerm(game.user, "OWNER"));

if (actors.length != 1) { 
  ui.notifications.error("Please choose exactly 1 token on the scene!")
} else {

  let actor = actors[0]

  Dialog.confirm({
    title: "Update embedded entities",
    content: `Are you sure you want to update ${actor.name}. Entities will be overwriten with data from compendium!`,
      yes: async function() {
        let updates = []
        let packs = game.packs.entries
        console.log(packs.length)
        for(let p=0; p<packs.length; p++) {
          if(packs[p].entity !== "Item") continue;
          console.log(`Processing ${packs[p].title}...`)
          const index = await packs[p].getIndex()
          for(let i=0; i<actor.data.items.length; i++) {
            const item = actor.data.items[i]
            let match = await index.find(e => e.name === item.name)
            if(!match) continue
            const entity = await packs[p].getEntity(match._id)
            if(entity.type !== item.type) continue;
            let update = duplicate(entity.data)
            update._id = item._id
            let nop = NOUPDATE["any"]
            if(NOUPDATE.hasOwnProperty(item.type)) nop = nop.concat(NOUPDATE[item.type]);
            for(let n=0; n<nop.length; n++) {
              if(hasProperty(update, nop[n]) && hasProperty(item, nop[n])) {
                setProperty(update, nop[n], getProperty(item, nop[n]))
              }
            }
            updates.push(update)
          }
        }        
        await actor.updateEmbeddedEntity("OwnedItem", updates);
        ui.notifications.info(`${updates.length} entities of ${actor.name} updated!`)
      },
      no: () => {}
  });
}
