import {
  ConditionalInjectable,
  create,
  IC,
  inject,
  register,
  resetAll,
  scope,
  StaticInjectable,
  wire,
  withConfig
} from './';

describe('inject', () => {
  beforeEach(() => {
    resetAll();
    Config.conditionValue = 0;
  });
  describe('scopes', () => {
    it('injects with scopes', async () => {
      expect.assertions(10);

      register(String, 'value@rootScope');
      register('str2', 'str2@rootScope');

      // scope 1
      let something : Something = await wire<Something>(Something);
      expect(something.value).toBe('value@rootScope');
      expect(something.value2).toBe('str2@rootScope');

      // scope 2 (detached)
      let newScope : IC = await scope();
      newScope.register(String, 'value@scope2');
      something = await newScope.wire<Something>(Something);
      expect(something.value).toBe('value@scope2');
      expect(something.value2).toBe('str2@rootScope');

      // scope 3
      await scope(async (scope : IC) => {
        scope.register(String, 'value@scope3');
        something = await scope.wire<Something>(Something);
        expect(something.value).toBe('value@scope3');
        expect(something.value2).toBe('str2@rootScope');
      });

      // scope 4
      await scope(async () => {
        register(String, 'value@scope4');
        something = await wire<Something>(Something);
        expect(something.value).toBe('value@scope4');
        expect(something.value2).toBe('str2@rootScope');
      });

      // scope 1
      something = await wire<Something>(Something);
      expect(something.value).toBe('value@rootScope');
      expect(something.value2).toBe('str2@rootScope');

    });
  });
  describe('async', () => {
    it('resolves async injectables', async () => {
      expect.assertions(1);
      register('somethingAsync', new Promise((resolve) => {
        setTimeout(() => resolve('abc'), 100);
      }));
      const resolved = await create('somethingAsync');
      expect(resolved).toBe('abc');
    });
  });
  describe('configuration classes', () => {
    it('injects with configuration classes', async () => {
      withConfig(Config);
      let something2 : Something2;

      something2 = await wire(Something2);
      expect(something2.value).toBe('a-value');

      await scope(async (scope : IC) => {
        scope.register('a', 'a-value@scope2');
        something2 = await scope.wire(Something2);
        expect(something2.value).toBe('a-value@scope2');
      });

      something2 = await wire(Something2);
      expect(something2.value).toBe('a-value');

      const newScope : IC = await scope();
      newScope.register('a', 'a-value@scope2');
      something2 = await newScope.wire(Something2);
      expect(something2.value).toBe('a-value@scope2');
    });
    it('only uses configuration classes in scope', async () => {
      const newScope = await scope();
      expect(await newScope.withConfig(Config).create('a')).toBe('a-value');
      try {
        await create('a');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
    it('evaluates conditions on configuration selectors', async () => {
      expect.assertions(4);
      expect(await withConfig(Config).create('d')).toBe('d-1');
      Config.conditionValue = 1;
      expect(await withConfig(Config).create('d')).toBe('d-2');
      Config.conditionValue = 0;
      expect(await withConfig(Config).create('d')).toBe('d-1');
      Config.conditionValue = 2;
      try {
        await withConfig(Config).create('d');
      } catch (err) {
        expect(err.message).toBe('No dependency found for selector d');
      }
    });
  });
  describe('register', () => {
    describe('conditional selectors', () => {
      it('registers injectables conditionally via selector condition functions', async () => {
        let conditionValue = 1;
        register({
          selector: 'a',
          condition: () => conditionValue === 0
        }, 'a');
        try {
          await create('a');
        } catch (err) {
          expect(err.message).toBe('No dependency found for selector a');
        }
        register({
          selector: 'a',
          condition: () => conditionValue === 1
        }, 'b');
        expect(await create('a')).toBe('b');
        conditionValue = 0;
        expect(await create('a')).toBe('a');
      });
    });
    describe('ConditionalInjectable', () => {
      it('does not inject if the condition evaluates to false', async () => {
        expect.assertions(1);
        register('a', new ConditionalInjectable(new StaticInjectable('a'), () => false));
        try {
          await create('a');
        } catch (err) {
          expect(err).toBeDefined();
        }
        const newScope : IC = await scope();
        await newScope.withConfig(Config).create('c');
      });
      it('injects if the condition evaluates to true', async () => {
        expect.assertions(1);
        register('a', new ConditionalInjectable(new StaticInjectable('a'), () => true));
        const value = await create('a');
        expect(value).toBe('a');
      })
    });
  });
});

class Config {

  public static conditionValue : number = 0;

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
    selector: 'd',
    condition: () => Config.conditionValue === 0
  })
  public d1Value() {
    return 'd-1';
  }

  @inject({
    selector: 'd',
    condition: () => Config.conditionValue === 1
  })
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
