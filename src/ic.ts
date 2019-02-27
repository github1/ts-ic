import {
  ConfigSelector,
  Injectable,
  InjectionContext,
  NOT_IN_SCOPE,
  PromiseInjectable,
  Selector,
  StaticInjectable,
} from './interfaces';
import {classParameterInjectionContext, CONSTRUCTOR_KEY} from './inject';
import {
  createParams,
  syncPromise
} from './util';
import {v4} from 'uuid';

interface ICC {
  register(selector : Selector, injectable : any) : ICC;
  create<T>(selector : Selector) : T;
  wire<T>(t : any) : T;
  scope(scope : () => void) : ICC;
  withConfig(...config : any[]) : ICC;
  hasSelector(selector : Selector) : boolean;
  hasConfig(selector : Selector) : boolean;
}

const scopes : ICC[] = [];

const rootScope = (providedScopes : ICC[] = scopes) : ICC => {
  return providedScopes[0];
};

const scopeAt = (index : number = 0, providedScopes : ICC[] = scopes) : ICC => {
  return providedScopes[providedScopes.length - (index + 1)];
};

const createFromAllScopes = <T>(selector : Selector, index : number = 0, providedScopes : ICC[] = scopes) : T => {
  const ic : ICC = scopeAt(index, providedScopes);
  if (ic) {
    if (ic.hasSelector(selector)) {
      return ic.create(selector);
    }
    return createFromAllScopes(selector, index + 1, providedScopes);
  }
  throw new Error(`No dependency found for selector ${selector}`);
};

const resolveFromAllScopes = (providedScopes : ICC[] = scopes) : Promise<any> => {
  const promises: Promise<any>[] = providedScopes.reduce((arr : Promise<any>[], curr : ICC) => {
    const scope : ICScope = curr as ICScope;
    const registry : Map<Selector, Injectable> = (scope as any).registry;
    const promises : Promise<any>[] = Array.from(registry)
      .map(([key, value]) => {
        if (!(value instanceof PromiseInjectable)) {
          const fromFactory: any = value.get();
          if (fromFactory.then) {
            value = new PromiseInjectable(fromFactory);
            //registry.set(key, value);
          }
        }
        return value;
      })
      .filter((value: Injectable) => value instanceof PromiseInjectable)
      .map((value: PromiseInjectable) => {
        return (value as PromiseInjectable).resolve();
      });
    arr.push(...promises);
    return arr;
  }, []);
  if (promises.length === 0) {
    return syncPromise();
  }
  return Promise.all(promises);
};

const hasConfigFromAllScopes = (selector : Selector, index : number = 0, providedScopes : ICC[] = scopes) : boolean => {
  const ic : ICC = scopeAt(index);
  if (ic) {
    if (ic.hasConfig(selector)) {
      return true;
    }
    return hasConfigFromAllScopes(selector, index + 1, providedScopes);
  }
  return false;
};

const hasSelectorFromAllScopes = (selector : Selector, index : number = 0, providedScopes : ICC[] = scopes) : boolean => {
  const ic : ICC = scopeAt(index);
  if (ic) {
    if (ic.hasSelector(selector)) {
      return true;
    }
    return hasSelectorFromAllScopes(selector, index + 1, providedScopes);
  }
  return false;
};

const wire = <T>(t : any, creator : (selector : Selector) => any) : T => {
  const injectionContext : InjectionContext = classParameterInjectionContext
    .get(t.name)
    .get(CONSTRUCTOR_KEY);
  return new t(...createParams(injectionContext, creator)) as T;
};

export class ICScope implements ICC {
  private readonly id : string;
  private readonly registry : Map<Selector, Injectable> = new Map<Selector, Injectable>();
  private readonly configs : Set<Selector> = new Set<Selector>();

  constructor(id? : string) {
    this.id = id || v4();
  }

  public toString() {
    return this.id;
  }

  public register(selector : Selector, injectable : any) : ICC {
    if (injectable === undefined) {
      throw new Error(`Registered undefined for selector ${selector}`);
    } else {
      if (injectable.then) {
        return this.register(selector, new PromiseInjectable(injectable));
      }
      if (typeof injectable.get !== 'function') {
        return this.register(selector, new StaticInjectable(injectable));
      }
      this.registry.set(selector, injectable);
    }
    return this;
  }

  public create<T>(selector : Selector) : T {
    if (this.registry.has(selector)) {
      const value : any = this.registry
        .get(selector)
        .get();
      if (value !== NOT_IN_SCOPE) {
        return this.registry
          .get(selector)
          .get();
      }
    }
    return createFromAllScopes(selector);
  }

  public wire<T>(t : any) : T {
    return wire(t, this.create.bind(this));
  }

  public scope(scope : () => void) : ICC {
    throw new Error('Not implemented');
  }

  public withConfig(...config : any[]) : ICC {
    config.forEach((config : any) => this.configs.add(config));
    return this;
  }

  public hasSelector(selector : Selector) : boolean {
    return this.registry.has(selector) && this.registry
      .get(selector)
      .get() !== NOT_IN_SCOPE;
  }

  public hasConfig(selector : Selector) : boolean {
    return this.configs.has(selector);
  }
}

class ICRootScopeReference extends ICScope {
  public register(selector : Selector, injectable : any) : ICC {
    if (selector instanceof ConfigSelector) {
      rootScope()
        .register(selector.selector, injectable);
    } else {
      scopeAt()
        .register(selector, injectable);
    }
    return this;
  }

  public create<T>(selector : Selector) : T {
    return createFromAllScopes(selector);
  }

  public wire<T>(t : any) : T {
    return scopeAt()
      .wire(t);
  }

  public scope(scope? : () => void) : ICC {
    let newScope : ICScope = this;
    if (scope) {
      newScope = new ICScope();
      scopes.push(newScope);
      resolveFromAllScopes()
        .then(() => {
          scope();
          scopes.pop();
        });
    }
    return newScope;
  }

  public withConfig(...config : any[]) : ICC {
    scopeAt()
      .withConfig(...config);
    return this;
  }

  public hasConfig(selector : Selector) : boolean {
    return hasConfigFromAllScopes(selector);
  }

  public hasSelector(selector : Selector) : boolean {
    return hasSelectorFromAllScopes(selector);
  }

  public resetAll() : ICC {
    while (scopes.length > 1) {
      scopes.pop();
    }
    scopes.push(new ICScope());
    return this;
  }
}

scopes.push(new ICScope('static'), new ICScope());

export const IC = new ICRootScopeReference();
