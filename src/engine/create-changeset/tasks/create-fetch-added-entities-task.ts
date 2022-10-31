import {Entry} from 'contentful'
import {ListrTask} from 'listr2'
import {chunk, pick} from 'lodash'
import {CreateChangesetContext} from '../types'

const BATCH_SIZE = 100

function cleanEntity(entry: Entry<any>): any {
  return {...entry, sys: pick(entry.sys, ['id', 'type', 'revision', 'contentType', 'locale'])}
}

export function createFetchAddedEntitiesTask(shouldExecute: boolean): ListrTask {
  return {
    title: 'Fetch full payload for added entities',
    skip: !shouldExecute,
    task: async (context: CreateChangesetContext, task) => {
      const {client, ids: {added}, sourceEnvironmentId, changeset} = context
      task.title = `Fetch full payload for ${added.length} added entities`

      const idChunks = chunk(added, BATCH_SIZE)
      let iterator = 0

      changeset.added = []

      for (const chunk of idChunks) {
        task.output = `Fetching ${BATCH_SIZE} entities ${++iterator * BATCH_SIZE}/${added.length}`
        const query = {'sys.id[in]': chunk.join(','), locale: '*'}
        // eslint-disable-next-line no-await-in-loop
        const entries = await client.cda.entries.getMany({
          environment: sourceEnvironmentId,
          query,
        }).then(response => response.items)
        changeset.added.push(...entries.map(entry => cleanEntity(entry)))
      }
    },
  }
}
