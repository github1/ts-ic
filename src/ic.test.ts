import {IC, inject} from './';

describe('inject', () => {
  beforeEach(() => {
    IC.resetAll();
  });
  it('injects with scopes', () => {
    IC.register(String, 'aString');
    IC.register('str2', 'aString2');
    expect(IC.wire<Something>(Something).value).toBe('aString');
    IC.scope(() => {
      IC.register(String, 'bString');
      expect(IC.wire<Something>(Something).value).toBe('bString');
    });
    expect(IC.wire<Something>(Something).value).toBe('aString');
  });
  describe('async injectables', () => {
    it('resolves async injectables', () => {
      expect.assertions(1);
      IC.register('somethingAsync', new Promise((resolve) => {
        setTimeout(() => resolve('abc'), 100);
      }));
      return new Promise((resolve) => {
        IC.scope(() => {
          expect(IC.create('somethingAsync')).toBe('abc');
          resolve();
        });
      });
    });
    it('throws exception for unresolved promises', () => {
      expect.assertions(1);
      IC.register('somethingAsync', new Promise((resolve) => {
        setTimeout(() => resolve('abc'), 100);
      }));
      try {
        IC.create('somethingAsync');
      } catch (err) {
        expect(err.message).toBe('Attempting to get unresolved injectable');
      }
    });
  });
  describe('configuration classes', () => {
    it('injects with configuration classes', () => {
      expect(IC.withConfig(Config).wire<Something2>(Something2).value).toBe('theFoo');
      IC.scope(() => {
        IC.register('foo', 'anotherFoo');
        expect(IC.wire<Something2>(Something2).value).toBe('anotherFoo');
      });
      expect(IC.wire<Something2>(Something2).value).toBe('theFoo');
    });
    it('injects with scoped configuration classes', () => {
      expect.assertions(4);
      const expectNotInParentScope = () => {
        try {
          IC.wire<Something2>(Something2);
        } catch (err) {
          expect(err.message).toContain('No dependency found for selector');
        }
      };
      expectNotInParentScope();
      const scope = IC.scope(() => {
        IC.withConfig(Config);
        expect(IC.wire<Something2>(Something2).value).toBe('theFoo');
      });
      scope.register('b', 'theFooOverride');
      expect(scope.wire<Something2>(Something2).value).toBe('theFooOverride');
      expectNotInParentScope();
    });
    it('injects dependencies from parent scope', () => {
      IC.register('a', 'a-value');
      expect(IC.scope().create('a')).toBe('a-value');
    });
    // it('injects async', () => {
    //   return new Promise((resolve) => {
    //     IC.scope().withConfig(Config).scope(() => {
    //       try {
    //         expect(IC.create('sasync')).toBe('theFoo');
    //       } finally {
    //         resolve();
    //       }
    //     });
    //   });
    // });
  });
});

class Config {
  @inject('foo')
  public foo() {
    return 'theFoo';
  }

  @inject('b')
  public something(@inject('foo') foo : string) {
    return foo;
  }

  @inject('sasync')
  public somethingAsync(@inject('foo') foo : string) {
    return Promise.resolve(foo);
  }
}

class Something {
  constructor(
    @inject(String) public value : string,
    @inject('str2') public value2 : string) {
  }
}

class Something2 {
  constructor(
    @inject('b') public value : string) {
  }
}
