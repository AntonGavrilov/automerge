const assert = require('assert')
const sinon = require('sinon')
const { Map, is } = require('immutable')
const Automerge = require('../src/Automerge')

/*
describe('Automerge.initImmutable()', () => {
  let beforeDoc, afterDoc, appliedDoc, appliedDoc2, changes

  beforeEach(() => {
    beforeDoc = Automerge.change(Automerge.initImmutable(), doc => doc.document = 'watch me now')
    afterDoc = Automerge.change(beforeDoc, doc => doc.document = 'i can mash potato')
    changes = Automerge.getChanges(beforeDoc, afterDoc)
    appliedDoc = Automerge.applyChanges(beforeDoc, changes)
    appliedDoc2 = Automerge.applyChanges(appliedDoc, changes)
  })

  it('Uses Immutable.Map', () => {
    assert(beforeDoc instanceof Immutable.Map)
    assert(afterDoc instanceof Immutable.Map)
    assert(appliedDoc instanceof Immutable.Map)
    assert(appliedDoc2 instanceof Immutable.Map)
  })

  it('applies changes', () => {
    assert.equal(Automerge.save(appliedDoc), Automerge.save(afterDoc))
    assert.equal(Automerge.save(appliedDoc2), Automerge.save(afterDoc))
  })

  it('supports fetching conflicts on lists', () => {
    let s1 = Automerge.change(Automerge.initImmutable(), doc => doc.pixels = ['red'])
    let s2 = Automerge.merge(Automerge.initImmutable(), s1)
    s1 = Automerge.change(s1, doc => doc.pixels[0] = 'green')
    s2 = Automerge.change(s2, doc => doc.pixels[0] = 'blue')
    s1 = Automerge.merge(s1, s2)
    if (s1._actorId > s2._actorId) {
      assert(s1.get('pixels').equals(Immutable.List.of('green')))
      assert(Automerge.getConflicts(s1, s1.get('pixels')).equals(
        Immutable.List.of(Immutable.Map().set(s2._actorId, 'blue'))))
    } else {
      assert(s1.get('pixels').equals(Immutable.List.of('blue')))
      assert(Automerge.getConflicts(s1, s1.get('pixels')).equals(
        Immutable.List.of(Immutable.Map().set(s1._actorId, 'green'))))
    }
  })
})
*/

// TODO: reject non-immutable inputs??

describe('Immutable write interface', () => {
  it('throws an error if you return nothing from a change block', () => {
    const doc1 = Automerge.initImmutable()
    assert.throws(() => {
      const doc2 = Automerge.change(doc1, doc => {})
    }, /return a document from the change block/)
  })

  it('throws an error if you return a non-document value from a change block', () => {
    const doc1 = Automerge.initImmutable()
    assert.throws(() => {
      const doc2 = Automerge.change(doc1, doc => 42)
    }, /return a document from the change block/)
  })

  it('throws an error if you return a non-root object from a change block', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      return doc.set('outer', new Map())
    })
    assert.throws(() => {
      const doc3 = Automerge.change(doc2, doc => {
        return doc.get('outer')
      })
    }, /new document root from the change block/)
  })

  it('records writes with .set', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      return doc.set('first','one')
    })
    assert.strictEqual(doc2.get('first'), 'one')
  })

  it('records multiple writes with .set', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      doc = doc.set('first','one')
      doc = doc.set('second','two')
      return doc
    })
    assert.strictEqual(doc2.get('first'), 'one')
    assert.strictEqual(doc2.get('second'), 'two')
  })

  it('records writes of an empty map with .set', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      doc = doc.set('outer', new Map())
      return doc
    })
    const docTest = doc2.get('outer').delete('_objectId')
    assert.strictEqual(docTest, new Map())
  })

  it('records nested writes with .set', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      doc = doc.set('outer', new Map())
      doc = doc.set('outer', doc.get('outer').set('inner', 'bar'))
      return doc
    })
    assert.strictEqual(doc2.get('outer').get('inner'), 'bar')
  })

  it('records overwrites with .set', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      doc = doc.set('first','foo')
      doc = doc.set('first','bar')
      return doc
    })
    assert.strictEqual(doc2.get('first'), 'bar')
  })

  it('records deletes of values with .delete', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      doc = doc.set('first','one')
      doc = doc.set('second','two')
      return doc
    })
    const doc3 = Automerge.change(doc2, doc => {
      return doc.delete('second')
    })
    assert.strictEqual(doc3.get('first'), 'one')
    assert.strictEqual(doc3.get('second'), undefined)
  })

  it('records deletes of maps with .delete', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      doc = doc.set('outer', new Map())
      doc = doc.set('outer', doc.get('outer').set('inner', 'bar'))
      return doc
    })
    const doc3 = Automerge.change(doc2, doc => {
      return doc.delete('outer')
    })
    assert.strictEqual(doc3.get('outer'), undefined)
  })

  it('preserves history of value .sets and .deletes', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      doc = doc.set('first', 'one')
      doc = doc.set('register', 1)
      return doc
    })
    const doc3 = Automerge.change(doc2, doc => {
      doc = doc.set('second', 'two')
      doc = doc.set('register', 2)
      return doc
    })
    const doc4 = Automerge.change(doc3, doc => {
      doc = doc.delete('first')
      return doc
    })

    assert.strictEqual(doc2.get('first'), 'one')
    assert.strictEqual(doc2.get('second'), undefined)
    assert.strictEqual(doc2.get('register'), 1)

    assert.strictEqual(doc3.get('first'), 'one')
    assert.strictEqual(doc3.get('second'), 'two')
    assert.strictEqual(doc3.get('register'), 2)

    assert.strictEqual(doc4.get('first'), undefined)
    assert.strictEqual(doc4.get('second'), 'two')
    assert.strictEqual(doc4.get('register'), 2)
  })

  it('preserves history of map .sets and .deletes', () => {
    // TODO
  })
})
