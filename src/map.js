const OpSet = require('./op_set')

const NotImplementedError = () => `NotImplementedError`

class Map {
  constructor(context, objectId, map) {
    this.map = map
    this.context = context
    this.objectId = objectId
  }

  static isMap(val) {
  }

  set(key,value) {
    this.context.state = this.context.setField(this.context.state, this.objectId, key, value)
    return new TrackedMap(this.context, this.objectId, this.map.set(key,value))
  }
  
  size() {
    return object.keys(map)
  }

  delete(key) {
    throw NotImplementedError()
  }

  deleteAll(keys) {
    throw NotImplementedError()
  }

  clear() {
    throw NotImplementedError()
  }

  update(key, lambda) {
    throw NotImplementedError()
  }

  merge(map) {
    throw NotImplementedError()
  }

  mergeWith( lambda, map) {
    throw NotImplementedError()
  }

  mergeDeep(map) {
    throw NotImplementedError()
  }

  mergeDeepWith(lambda, map) {
    throw NotImplementedError()
  }

  setIn(path, value) {
    throw NotImplementedError()
  }

  deleteIn(path) {
    throw NotImplementedError()
  }

  updateIn(path, lambda) {
    throw NotImplementedError()
  }

  mergeIn(path, map) {
    throw NotImplementedError()
  }

  mergeDeepIn(path, map) {
    throw NotImplementedError()
  }

  map(lambda) {
    throw NotImplementedError()
  }

  mapKeys(lambda) {
    throw NotImplementedError()
  }

  mapEntries(lambda) {
    throw NotImplementedError()
  }

  flatMap(lambda) {
    throw NotImplementedError()
  }

  filter(lambda) {
    throw NotImplementedError()
  }

  flip() {
    throw NotImplementedError()
  }

  filterNot(lambda) {
    throw NotImplementedError()
  }

  sort(lambda) {
    throw NotImplementedError()
  }

  sortBy(lambda) {
    throw NotImplementedError()
  } 

  groupBy(lambda) {
    throw NotImplementedError()
  }

  toJS() {
    throw NotImplementedError()
  }

  toJSON() {
    throw NotImplementedError()
  }

  concat(map) {
    this.merge(map)
  }

  equals(map) {
    throw NotImplementedError()
  }

  hashCode() {
    throw NotImplementedError()
  }

  get(key) {
    throw NotImplementedError()
  }

  has(key) {
    throw NotImplementedError()
  }

  includes(value) {
    throw NotImplementedError()
  }

  first() {
    throw NotImplementedError()
  }

  last() {
    throw NotImplementedError()
  }

  getIn(path,key) {
    throw NotImplementedError()
  }

  hasIn(path,key) {
    throw NotImplementedError()
  }

  keys() {
    throw NotImplementedError()
  }

  values() {
    throw NotImplementedError()
  }

  entries() {
    throw NotImplementedError()
  }

/*
  keySeq() { }
  
  valueSeq() { }

  entrySeq() { }

  forEach(lambda) { }

  rest() { }

  slice( begin, end ) { }

  butLast() { }

  toList() { }
  toArray() { }
  toObject() { }
  toSeq() { }
  toKeyedSeq() { }
  toIndexedSeq() { }
*/

  remove(key) { return this.delete(key) }
  removeAll(keys) { return this.deleteAll(keys) }
  removeIn(path) { return this.deleteIn(path) }
  concat(map) { return this.merge(map) }
}

module.exports = { Map }
