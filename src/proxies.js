const { Map, Set, List, Record, fromJS } = require('immutable')
const OpSet = require('./op_set')
const { setField, deleteField } = require ('./state')

function listImmutable(attempt) {
  throw new TypeError('You tried to ' + attempt + ', but this list is read-only. ' +
                      'Please use Automerge.change() to get a writable version.')
}

function listMethods(context, listId) {
  const methods = {
    deleteAt(index, numDelete) {
      if (!context.mutable) listImmutable('delete the list element at index ' + index)
      context.state = context.splice(context.state, listId, index, numDelete || 1, [])
      return this
    },

    fill(value, start, end) {
      if (!context.mutable) listImmutable('fill a list with a value')
      for (let [index, elem] of OpSet.listIterator(context.state.get('opSet'), listId, 'elems', context)) {
        if (end && index >= end) break
        if (index >= (start || 0)) {
          context.state = context.setField(context.state, listId, elem, value)
        }
      }
      return this
    },

    insertAt(index, ...values) {
      if (!context.mutable) listImmutable('insert a list element at index ' + index)
      context.state = context.splice(context.state, listId, index, 0, values)
      return this
    },

    pop() {
      if (!context.mutable) listImmutable('pop the last element off a list')
      const length = OpSet.listLength(context.state.get('opSet'), listId)
      if (length == 0) return
      const last = OpSet.listElemByIndex(context.state.get('opSet'), listId, length - 1, context)
      context.state = context.splice(context.state, listId, length - 1, 1, [])
      return last
    },

    push(...values) {
      if (!context.mutable) listImmutable('push a new list element ' + JSON.stringify(values[0]))
      const length = OpSet.listLength(context.state.get('opSet'), listId)
      context.state = context.splice(context.state, listId, length, 0, values)
      return OpSet.listLength(context.state.get('opSet'), listId)
    },

    shift() {
      if (!context.mutable) listImmutable('shift the first element off a list')
      const first = OpSet.listElemByIndex(context.state.get('opSet'), listId, 0, context)
      context.state = context.splice(context.state, listId, 0, 1, [])
      return first
    },

    splice(start, deleteCount, ...values) {
      if (!context.mutable) listImmutable('splice a list')
      if (deleteCount === undefined) {
        deleteCount = OpSet.listLength(context.state.get('opSet'), listId) - start
      }
      const deleted = []
      for (let n = 0; n < deleteCount; n++) {
        deleted.push(OpSet.listElemByIndex(context.state.get('opSet'), listId, start + n, context))
      }
      context.state = context.splice(context.state, listId, start, deleteCount, values)
      return deleted
    },

    unshift(...values) {
      if (!context.mutable) listImmutable('unshift a new list element ' + JSON.stringify(values[0]))
      context.state = context.splice(context.state, listId, 0, 0, values)
      return OpSet.listLength(context.state.get('opSet'), listId)
    }
  }

  for (let iterator of ['entries', 'keys', 'values']) {
    methods[iterator] = () => OpSet.listIterator(context.state.get('opSet'), listId, iterator, context)
  }

  // Read-only methods that can delegate to the JavaScript built-in implementations
  for (let method of ['concat', 'every', 'filter', 'find', 'findIndex', 'forEach', 'includes',
                      'indexOf', 'join', 'lastIndexOf', 'map', 'reduce', 'reduceRight',
                      'slice', 'some', 'toLocaleString', 'toString']) {
    methods[method] = (...args) => {
      const array = [...OpSet.listIterator(context.state.get('opSet'), listId, 'values', context)]
      return array[method].call(array, ...args)
    }
  }

  return methods
}

const MapHandler = {
  get (target, key) {
    const { context, objectId } = target
    if (!context.state.hasIn(['opSet', 'byObject', objectId])) throw 'Target object does not exist: ' + objectId
    if (key === '_inspect') return JSON.parse(JSON.stringify(mapProxy(context, objectId)))
    if (key === '_type') return 'map'
    if (key === '_objectId') return objectId
    if (key === '_state') return context.state
    if (key === '_actorId') return context.state.get('actorId')
    if (key === '_conflicts') return OpSet.getObjectConflicts(context.state.get('opSet'), objectId, context).toJS()
    if (key === '_change') return context
    return OpSet.getObjectField(context.state.get('opSet'), objectId, key, context)
  },

  set (target, key, value) {
    const { context, objectId } = target
    if (!context.mutable) {
      throw new TypeError('You tried to set property ' + JSON.stringify(key) + ' to ' +
                          JSON.stringify(value) + ', but this object is read-only. ' +
                          'Please use Automerge.change() to get a writable version.')
    }
    context.state = context.setField(context.state, objectId, key, value)
    return true
  },

  deleteProperty (target, key) {
    const { context, objectId } = target
    if (!context.mutable) {
      throw new TypeError('You tried to delete the property ' + JSON.stringify(key) +
                          ', but this object is read-only. Please use Automerge.change() ' +
                          'to get a writable version.')
    }
    context.state = context.deleteField(context.state, objectId, key)
    return true
  },

  has (target, key) {
    return (key === '_type') || (key === '_state') || (key === '_actorId') || (key === '_conflicts') ||
      OpSet.getObjectFields(target.context.state.get('opSet'), target.objectId).has(key)
  },

  getOwnPropertyDescriptor (target, key) {
    if (OpSet.getObjectFields(target.context.state.get('opSet'), target.objectId).has(key)) {
      return {configurable: true, enumerable: true}
    }
  },

  ownKeys (target) {
    return OpSet.getObjectFields(target.context.state.get('opSet'), target.objectId).toJS()
  }
}

const ListHandler = {
  get (target, key) {
    const [context, objectId] = target
    if (!context.state.hasIn(['opSet', 'byObject', objectId])) throw 'Target object does not exist: ' + objectId
    if (key === Symbol.iterator) return () => OpSet.listIterator(context.state.get('opSet'), objectId, 'values', context)
    if (key === '_inspect') return JSON.parse(JSON.stringify(listProxy(context, objectId)))
    if (key === '_type') return 'list'
    if (key === '_objectId') return objectId
    if (key === '_state') return context.state
    if (key === '_actorId') return context.state.get('actorId')
    if (key === '_change') return context
    if (key === 'length') return OpSet.listLength(context.state.get('opSet'), objectId)
    if (typeof key === 'string' && /^[0-9]+$/.test(key)) {
      return OpSet.listElemByIndex(context.state.get('opSet'), objectId, parseInt(key), context)
    }
    return listMethods(context, objectId)[key]
  },

  set (target, key, value) {
    const [context, objectId] = target
    if (!context.mutable) {
      throw new TypeError('You tried to set index ' + key + ' to ' + JSON.stringify(value) +
                          ', but this list is read-only. Please use Automerge.change() ' +
                          'to get a writable version.')
    }
    context.state = context.setListIndex(context.state, objectId, key, value)
    return true
  },

  deleteProperty (target, key) {
    const [context, objectId] = target
    if (!context.mutable) {
      throw new TypeError('You tried to delete the list index ' + key + ', but this list is ' +
                          'read-only. Please use Automerge.change() to get a writable version.')
    }
    context.state = context.deleteField(context.state, objectId, key)
    return true
  },

  has (target, key) {
    const [context, objectId] = target
    if (typeof key === 'string' && /^[0-9]+$/.test(key)) {
      return parseInt(key) < OpSet.listLength(context.state.get('opSet'), objectId)
    }
    return (key === 'length') || (key === '_type') || (key === '_objectId') ||
      (key === '_state') || (key === '_actorId')
  },

  getOwnPropertyDescriptor (target, key) {
    const [context, objectId] = target
    if (key === 'length') return {}
    if (key === '_objectId' || (typeof key === 'string' && /^[0-9]+$/.test(key))) {
      if (parseInt(key) < OpSet.listLength(context.state.get('opSet'), objectId)) {
        return {configurable: true, enumerable: true}
      }
    }
  },

  ownKeys (target) {
    const [context, objectId] = target
    const length = OpSet.listLength(context.state.get('opSet'), objectId)
    let keys = ['length', '_objectId']
    for (let i = 0; i < length; i++) keys.push(i.toString())
    return keys
  }
}

function mapProxy(context, objectId) {
  return new Proxy({context, objectId}, MapHandler)
}

function listProxy(context, objectId) {
  return new Proxy([context, objectId], ListHandler)
}

function instantiateProxy(opSet, objectId) {
  const objectType = opSet.getIn(['byObject', objectId, '_init', 'action'])
  if (objectType === 'makeMap') {
    return mapProxy(this, objectId)
  } else if (objectType === 'makeList' || objectType === 'makeText') {
    return listProxy(this, objectId)
  } else throw 'Unknown object type: ' + objectType
}

function rootObjectProxy(context) {
  context.instantiateObject = instantiateProxy
  return mapProxy(context, '00000000-0000-0000-0000-000000000000')
}

class immutableMapProxy {
  constructor(context, objectId) {
    this.context = context
    this._objectId = objectId
  }

  isRoot() {
    return (this._objectId === '00000000-0000-0000-0000-000000000000')
  }

  get(key) {
    // TODO: do we need/want: _inspect, _type, _state, _actorId, _conflicts, _change,
    // here and/or in properties?
    return OpSet.getObjectField(this.context.state.get('opSet'), this._objectId, key, this.context)
  }

  getIn(keys) {
    if (keys.length === 0) {
      throw new TypeError('Must have at least one key to getIn')
    }
    let obj = this
    for (let key of keys) {
      obj = obj.get(key)
      if (obj === undefined) break
    }
    return obj
  }

  set(key, value) {
    if (!this.isRoot()) {
      throw new TypeError('Must set only from root doc')
    }
    const newContext = this.context.update('state', (s) => {
      return setField(s, this._objectId, key, value)
    })
    return new immutableMapProxy(newContext, this._objectId)
  }

  setIn(keys, value) {
    if (!this.isRoot()) {
      throw new TypeError('Must setIn only from root doc')
    }
    if (keys.length === 0) {
      throw new TypeError('Must have at least one key to setIn')
    }

    let keyedObject = this
    for (let i=1; i<keys.length; i++) {
      keyedObject = keyedObject.get(keys[i-1])
      // If we're missing any maps in the chain, we need to create them.
      // To do that, we'll first form the new maps as standard immutable and
      // then setIn that new, larger, value with the smaller, existing array
      // of keys as the path.
      if (!keyedObject) {
        const keysWithObjects = keys.slice(0, i)
        const keysWithoutObjects = keys.slice(i)
        let newValue = value
        for (let j=keysWithoutObjects.length-1; j>=0; j--) {
          newValue = new Map().set(keysWithoutObjects[j], newValue)
        }
        return this.setIn(keysWithObjects, newValue)
      }
    }
    const newContext = this.context.update('state', (s) => {
      return setField(s, keyedObject._objectId, keys[keys.length-1], value)
    })
    return new immutableMapProxy(newContext, this._objectId)

    // TODO: do we need to do sets up to the root as below, or does
    // one setField do it? Unclear what semantics are if one side is
    // using mutable API and the other immutable API! If we do need
    // to write to root, may be able to avoid materialization in the
    // code below.
    //
    // let newValue = value
    // let newContext = this.context
    // for (let i=keys.length-1; i>=0; i--) {
    //   newContext = newContext.update('state', (s) => {
    //     return setField(s, keyedObjects[i]._objectId, keys[i], newValue)
    //   })
    //   if (i !== 0) {
    //     newValue = OpSet.getObjectField(newContext.state.get('opSet'), keyedObjects[i-1]._objectId, keys[i-1], newContext)
    //   }
    // }
    // return new immutableMapProxy(newContext, this._objectId)
  }

  delete(key) {
    if (!this.isRoot()) {
      throw new TypeError('Must delete only from root doc')
    }
    const newContext = this.context.update('state', (s) => {
      return deleteField(s, this._objectId, key)
    })
    return new immutableMapProxy(newContext, this._objectId)
  }

  deleteIn(keys) {
    if (!this.isRoot()) {
      throw new TypeError('Must deleteIn only from root doc')
    }
    if (keys.length === 0) {
      throw new TypeError('Must have at least one key to deleteIn')
    }
    let keyedObj = this
    for (let i=1; i<keys.length; i++) {
      keyedObj = keyedObj.get(keys[i-1])
      if (!keyedObj) {
        return this
      }
    }
    const innerKey = keys[keys.length-1]
    if (!keyedObj.get(innerKey)) {
      return this
    }
    const newContext = this.context.update('state', (s) => {
      return deleteField(s, keyedObj._objectId, innerKey)
    })
    return new immutableMapProxy(newContext, this._objectId)
  }
}

function instantiateImmutableProxy(opSet, objectId) {
  const objectType = opSet.getIn(['byObject', objectId, '_init', 'action'])
  if (objectType === 'makeMap') {
    return new immutableMapProxy(this, objectId)
  } else {
    throw 'Unknown object type: ' + objectType
  }
}

function isImmutableProxy(object) {
  return (object instanceof immutableMapProxy)
}

function rootImmutableProxy(context) {
  const newContext = context.set('instantiateObject', instantiateImmutableProxy)
  return new immutableMapProxy(newContext, '00000000-0000-0000-0000-000000000000')
}

const ImmutableContext = Record({
  state: undefined,
  mutable: true,
  instantiateObject: undefined,
})

module.exports = { rootObjectProxy, rootImmutableProxy, isImmutableProxy, ImmutableContext }
