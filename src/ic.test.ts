import {ConditionalInjectable, IC, ICC, inject, StaticInjectable,} from './';

describe('inject', () => {
  beforeEach(() => {
    IC.resetAll();
  });
  describe('scopes', () => {
    it('injects with scopes', async () => {
      expect.assertions(10);

      IC.register(String, 'value@rootScope');
      IC.register('str2', 'str2@rootScope');

      // scope 1
      let something : Something = await IC.wire<Something>(Something);
      expect(something.value).toBe('value@rootScope');
      expect(something.value2).toBe('str2@rootScope');

      // scope 2 (detached)
      let scope : ICC = await IC.scope();
      scope.register(String, 'value@scope2');
      something = await scope.wire<Something>(Something);
      expect(something.value).toBe('value@scope2');
      expect(something.value2).toBe('str2@rootScope');

      // scope 3
      await IC.scope(async (scope : IC) => {
        scope.register(String, 'value@scope3');
        something = await scope.wire<Something>(Something);
        expect(something.value).toBe('value@scope3');
        expect(something.value2).toBe('str2@rootScope');
      });

      // scope 4
      await IC.scope(async () => {
        IC.register(String, 'value@scope4');
        something = await IC.wire<Something>(Something);
        expect(something.value).toBe('value@scope4');
        expect(something.value2).toBe('str2@rootScope');
      });

      // scope 1
      something = await IC.wire<Something>(Something);
      expect(something.value).toBe('value@rootScope');
      expect(something.value2).toBe('str2@rootScope');

    });
  });
  describe('async', () => {
    it('resolves async injectables', async () => {
      expect.assertions(1);
      IC.register('somethingAsync', new Promise((resolve) => {
        setTimeout(() => resolve('abc'), 100);
      }));
      const resolved = await IC.create('somethingAsync');
      expect(resolved).toBe('abc');
    });
  });
  describe('configuration classes', () => {
    it('injects with configuration classes', async () => {
      IC.withConfig(Config);
      let something2 : Something2;

      something2 = await IC.wire(Something2);
      expect(something2.value).toBe('a-value');

      await IC.scope(async (scope : ICC) => {
        scope.register('a', 'a-value@scope2');
        something2 = await scope.wire(Something2);
        expect(something2.value).toBe('a-value@scope2');
      });

      something2 = await IC.wire(Something2);
      expect(something2.value).toBe('a-value');

      const scope : ICC = await IC.scope();
      scope.register('a', 'a-value@scope2');
      something2 = await scope.wire(Something2);
      expect(something2.value).toBe('a-value@scope2');
    });
    it('only uses configuration classes in scope', async () => {
      const scope = await IC.scope();
      expect(await scope.withConfig(Config).create('a')).toBe('a-value');
      try {
        await IC.create('a');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });
  describe('injectables', () => {
    describe('ConditionalInjectable', () => {
      it('does not inject if the condition evaluates to false', async () => {
        expect.assertions(1);
        IC.register('a', new ConditionalInjectable(new StaticInjectable('a'), () => false));
        try {
          await IC.create('a');
        } catch (err) {
          expect(err).toBeDefined();
        }
        const scope : ICC = await IC.scope();
        await scope.withConfig(Config).create('c');
      });
      it('injects if the condition evaluates to true', async () => {
        expect.assertions(1);
        IC.register('a', new ConditionalInjectable(new StaticInjectable('a'), () => true));
        const value = await IC.create('a');
        expect(value).toBe('a');
      })
    });
  });
});

class Config {
  @inject('a')
  public aValue() {
    return 'a-value';
  }

  @inject('b')
  public bValue(@inject('a') a : string) {
    return a;
  }

  @inject('c')
  public cValue(@inject('a') a : string) {
    return Promise.resolve(a);
  }

  @inject({
    selector: ''
  })
  public d1Value() {
    return 'd-1';
  }

  @inject('d-2')
  public d2Value() {
    return 'd-2';
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
