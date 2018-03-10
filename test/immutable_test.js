const assert = require('assert')
const { Map, Set, List, is } = require('immutable')
const Automerge = require('../src/Automerge')

const ROOT_ID = '00000000-0000-0000-0000-000000000000'

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


describe('Immutable write interface', () => {
  // TODO: correct public API?
  it('has a fixed object ID at the root', () => {
    Automerge.change(Automerge.initImmutable(), doc => {
      assert.strictEqual(doc._objectId, ROOT_ID)
      return doc
    })
  })

  // TODO: do we actually need this within changes?
  // it('knows its actor ID', () => {
  //   Automerge.change(Automerge.initImmutable(), doc => {
  //     debugger
  //     assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(doc._actorId))
  //     assert.notEqual(doc._actorId, ROOT_ID)
  //     assert.strictEqual(Automerge.init('customActorId')._actorId, 'customActorId')
  //     return doc
  //   })
  // })


  //// change blocks

  it('accepts a no-op block', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => doc)
  })

  it('throws if you return nothing from a change block', () => {
    const doc1 = Automerge.initImmutable()
    assert.throws(() => {
      const doc2 = Automerge.change(doc1, doc => {})
    }, /return a document from the change block/)
  })

  it('throws if you return a scalar value a change block', () => {
    const doc1 = Automerge.initImmutable()
    assert.throws(() => {
      const doc2 = Automerge.change(doc1, doc => 42)
    }, /return a document from the change block/)
  })

  it('throws if you return a mutable map from a change block', () => {
    const doc1 = Automerge.initImmutable()
    assert.throws(() => {
      const doc2 = Automerge.change(doc1, doc => { return {foo: 'bar'} })
    }, /return a document from the change block/)
  })

  it('throws if you return a mutable array from a change block', () => {
    const doc1 = Automerge.initImmutable()
    assert.throws(() => {
      const doc2 = Automerge.change(doc1, doc => { return ['foo', 'bar'] })
    }, /return a document from the change block/)
  })

  it('throws if you return an immutable set from a change block', () => {
    const doc1 = Automerge.initImmutable()
    assert.throws(() => {
      const doc2 = Automerge.change(doc1, doc => { return new Set('foo', 'bar') })
    }, /return a document from the change block/)
  })

  it('throws if you return a non-root object from a change block', () => {
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


  //// .set

  it('throws when trying to .set on non-root doc', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      return doc.set('outer', new Map())
    })
    assert.throws(() => {
      const doc3 = Automerge.change(doc2, doc => {
        const newOuter = doc.get('outer').set('inner', 'foo')
        doc = doc.set('outer', newOuter)
        return doc
      })
    }, /only set or setIn from root doc/)
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
      return doc.set('outer', new Map())
    })
    const docTest = doc2.get('outer').delete('_objectId')
    assert.strictEqual(docTest, new Map())
  })

  it('records writes of a populated map with .set', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      return doc.set('outer', new Map().set('inner', 'foo'))
    })
    assert.strictEqual(doc2.get('outer').get('inner'), 'foo')
  })


  //// .setIn

  it('throws on .setIn with no keys', () => {
    const doc1 = Automerge.initImmutable()
    assert.throws(() => {
      const doc2 = Automerge.change(doc1, doc => {
        return doc.setIn([], 'foo')
      })
    }, /at least one key to setIn/)
  })

  it('records un-nested writes with .setIn', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      return doc.setIn(['first'],'one')
    })
    assert.strictEqual(doc2.get('first'), 'one')
  })

  it('records nested writes with .setIn', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      doc = doc.set('outer', new Map())
      doc = doc.setIn(['outer', 'inner'], 'bar')
      return doc
    })
    assert.strictEqual(doc2.get('outer').get('inner'), 'bar')
  })

  it('records nested writes with implicit new maps with .setIn', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      doc = doc.set('outer', new Map())
      doc = doc.setIn(['outer', 'middle', 'inner'], 'bar')
      return doc
    })
    assert.strictEqual(doc2.get('outer').get('middle').get('inner'), 'bar')
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


  //// .delete

  it('throws when trying to .delete on non-root doc', () => {
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      return doc.set('outer', new Map())
    })
    assert.throws(() => {
      const doc3 = Automerge.change(doc2, doc => {
        return doc.get('outer').delete('inner')
      })
    }, /only delete or deleteIn from root doc/)
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
      doc = doc.setIn(['outer', 'inner'], 'foo')
      return doc
    })
    const doc3 = Automerge.change(doc2, doc => {
      return doc.delete('outer')
    })
    assert.strictEqual(doc3.get('outer'), undefined)
  })


  //// history

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
    const doc1 = Automerge.initImmutable()
    const doc2 = Automerge.change(doc1, doc => {
      return doc.set('outer', new Map().set('inner', 'foo'))
    })
    const doc3 = Automerge.change(doc2, doc => {
      return doc.delete('outer')
    })
    assert.strictEqual(doc2.get('outer').get('inner'), 'foo')
    assert.strictEqual(doc3.get('outer'), undefined)
  })

  // TODO: figure out implementation and testing of other read APIs like .keys() and .keySeq()
  // it('something something other methods', () => {
  // })

  // TODO: figure out how to do in context of other collection methods
  // it('supports JSON.stringify()', () => {
  //   Automerge.change(Automerge.initImmutable(), doc => {
  //     assert.deepEqual(JSON.stringify(doc), '{"_objectId":"00000000-0000-0000-0000-000000000000"}')
  //     doc = doc.set('key1', 'value1')
  //     equalsOneOf(JSON.stringify(doc),
  //       '{"_objectId":"00000000-0000-0000-0000-000000000000","key1":"value1"}',
  //       '{"key1":"value1","_objectId":"00000000-0000-0000-0000-000000000000"}')
  //     doc = doc.set('key2', 'value2')
  //     assert.deepEqual(JSON.parse(JSON.stringify(doc)), {
  //       _objectId: ROOT_ID, key1: 'value1', key2: 'value2'
  //     })
  //   })
  // })
  //
  // it('supports JSON.stringify() on nested values', () => {
  //   const doc1 = Automerge.initImmutable()
  //   Automerge.change(doc1, doc => {
  //     doc = doc.set('out', new Map())
  //     doc = doc.setIn(['out', 'in'], 3)
  //     equalsOneOf(JSON.stringify(doc),
  //       '{"_objectId":"00000000-0000-0000-0000-000000000000","out":{"in":3}}',
  //       '{"out":{"in":3},"_objectId":"00000000-0000-0000-0000-000000000000"}')
  //   })
  // })
})
