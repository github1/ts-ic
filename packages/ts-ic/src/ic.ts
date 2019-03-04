import {
  ICC,
  ICCreator,
  RichSelector,
  Selector
} from './interfaces';
import {
  CachedInjectable,
  CompositeInjectable,
  ConditionalInjectable,
  Injectable,
  PromiseInjectable,
  StaticInjectable,
  typeRegistrator
} from './injectable';
import {
  classParameterInjectionContext,
  CONSTRUCTOR_KEY,
  ParameterInjectionContext
} from './inject';
import {createParams} from './util';

const injectableCache : Map<any, any> = new Map<any, any>();

const scopes : ICC[] = [];

const scopeAt = (index : number = 0, providedScopes : ICC[] = scopes) : ICC => {
  return providedScopes[providedScopes.length - (index + 1)];
};

const createFromAllScopes = <T>(
  selector : Selector,
  creator : ICCreator,
  index : number = 0,
  providedScopes : ICC[] = scopes) : Promise<T> => {
  return new Promise((resolve : (value : any) => void, reject : (error : Error) => void) => {
    const ic : IC = scopeAt(index, providedScopes) as IC;
    if (ic) {
      if (ic.hasSelector(selector)) {
        const injectable : Injectable = ic.getInjectable(selector);
        resolve(injectable.get(creator));
      } else {
        resolve(createFromAllScopes(selector, creator, index + 1, providedScopes));
      }
    } else {
      reject(new Error(`No dependency found for selector ${selector}`));
    }
  });
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

const wireWithCreator = <T>(t : any, creator : ICCreator, proxy : boolean = false) : Promise<T> => {
  const injectionContext : ParameterInjectionContext = classParameterInjectionContext.has(t.name) ? classParameterInjectionContext
    .get(t.name)
    .get(CONSTRUCTOR_KEY) : undefined;
  return createParams(injectionContext, creator)
    .then((params : any[]) => {
      const created : T = new t(...params) as T;
      if (proxy && classParameterInjectionContext.has(t.name)) {
        const parameterContext : Map<any, ParameterInjectionContext> = classParameterInjectionContext.get(t.name);
        type KeyParam = { key : any; params : any[] };
        return Promise.all<KeyParam>(Array
          .from(parameterContext)
          .map(([key, value] : any[]) => {
            return createParams(value, creator)
              .then((params : any[]) => {
                return {key, params};
              });
          }))
          .then((keyParams : KeyParam[]) => {
            return keyParams.reduce((proxyBehavior : any, keyParam : KeyParam) => {
              proxyBehavior[keyParam.key] = (target : any, orig : Function) => () => orig.apply(target, keyParam.params);
              return proxyBehavior;
            }, {});
          })
          .then((proxyBehavior : any) => {
            return new Proxy(created as any, {
              // tslint:disable-next-line:no-reserved-keywords
              get(target: any, name: any) {
                if (proxyBehavior[name]) {
                  return proxyBehavior[name](target, target[name]);
                }
                return target[name];
              }
            });
          });
      }
      return created;
    });
};

export class IC implements ICC {
  private readonly id : string;
  private readonly registry : Map<Selector, Injectable> = new Map<Selector, Injectable>();

  constructor(id? : string) {
    // tslint:disable-next-line:insecure-random
    this.id = id || `scope::${Math.floor(Math.random() * 1000000000)}`;
  }

  public static register(selector : Selector, injectable : any) : typeof IC {
    return register(selector, injectable);
  }

  public static create<T>(selector : Selector) : Promise<T> {
    return create(selector);
  }

  public static wire<T>(t : any) : Promise<T> {
    return wire(t);
  }

  public static scope(handler? : (scope? : IC) => void | Promise<any>) : Promise<IC> {
    return scope(handler);
  }

  public static withConfig(...config : any[]) : typeof IC {
    return withConfig(...config);
  }

  public static hasSelector(selector : Selector) : boolean {
    return hasSelector(selector);
  }

  public static resetAll() : typeof IC {
    return resetAll();
  }

  public register(selector : Selector, injectable : any) : IC {
    if (injectable === undefined) {
      throw new Error(`Registered undefined for selector ${selector}`);
    } else {
      if (injectable.then) {
        return this.register(selector, new PromiseInjectable(injectable));
      }
      if (typeof injectable.get !== 'function') {
        return this.register(selector, new StaticInjectable(injectable));
      }
      const richSelector : RichSelector = selector.selector ? selector : {selector: selector};
      selector = richSelector.selector;
      if (richSelector.condition) {
        injectable = new ConditionalInjectable(injectable, richSelector.condition);
      }
      if (richSelector.singleton) {
        injectable = new CachedInjectable(injectable, injectableCache);
      }
      if (this.registry.has(selector)) {
        const currentInjectable : Injectable = this.getInjectable(selector);
        injectable = new CompositeInjectable([injectable, currentInjectable]);
      }
      this.registry.set(selector, injectable);
    }
    return this;
  }

  public create<T>(selector : Selector) : Promise<T> {
    if (this.hasSelector(selector)) {
      return this
        .getInjectable(selector)
        .get(this);
    }
    return createFromAllScopes(selector, this);
  }

  public wire<T>(t : any) : Promise<T> {
    return wireWithCreator(t, this);
  }

  public proxy<T>(t : any) : Promise<T> {
    return wireWithCreator(t, this, true);
  }

  public scope(scope : () => void | Promise<any>) : Promise<IC> {
    throw new Error('Not implemented');
  }

  public withConfig(...config : any[]) : IC {
    config
      .forEach((config : any) => typeRegistrator
        .get(config)
        .register(this));
    return this;
  }

  public hasSelector(selector : Selector) : boolean {
    return this.registry
      .has(selector) && this
      .getInjectable(selector)
      .evaluate(this);
  }

  public getInjectable(selector : Selector) : Injectable {
    return this.registry
      .get(selector);
  }

  public toString() {
    return this.id;
  }

}

export function register(selector : Selector, injectable : any) : typeof IC {
  scopeAt()
    .register(selector, injectable);
  return IC;
}

export function create<T>(selector : Selector) : Promise<T> {
  return createFromAllScopes(selector, IC);
}

export function wire<T>(t : any) : Promise<T> {
  return scopeAt()
    .wire(t);
}

export function proxy<T>(t : any) : Promise<T> {
  return scopeAt()
    .proxy(t);
}

export function scope(handler? : (scope? : IC) => void | Promise<any>) : Promise<IC> {
  const newScope : IC = new IC();
  if (handler) {
    scopes.push(newScope);
    const result : void | Promise<any> = handler(newScope);
    if (result) {
      return result.then(() => {
        scopes.pop();
        return newScope;
      });
    } else {
      scopes.pop();
    }
  }
  return Promise.resolve(newScope);
}

export function withConfig(...config : any[]) : typeof IC {
  scopeAt()
    .withConfig(...config);
  return IC;
}

export function hasSelector(selector : Selector) : boolean {
  return hasSelectorFromAllScopes(selector);
}

export function resetAll() : typeof IC {
  injectableCache.clear();
  while (scopes.length > 1) {
    scopes.pop();
  }
  scopes.push(new IC());
  return IC;
}

scopes.push(new IC('static'), new IC());
