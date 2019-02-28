import {ICC, ICCreator, Selector} from './interfaces';
import {
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

const wire = <T>(t : any, creator : ICCreator) : Promise<T> => {
  const injectionContext : ParameterInjectionContext = classParameterInjectionContext
    .get(t.name)
    .get(CONSTRUCTOR_KEY);
  return createParams(injectionContext, creator)
    .then((params : any[]) => {
      return new t(...params) as T;
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
    scopeAt()
      .register(selector, injectable);
    return this;
  }

  public static create<T>(selector : Selector) : Promise<T> {
    return createFromAllScopes(selector, this);
  }

  public static wire<T>(t : any) : Promise<T> {
    return scopeAt()
      .wire(t);
  }

  public static scope(handler? : (scope? : IC) => void | Promise<any>) : Promise<IC> {
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

  public static withConfig(...config : any[]) : typeof IC {
    scopeAt()
      .withConfig(...config);
    return this;
  }

  public static hasSelector(selector : Selector) : boolean {
    return hasSelectorFromAllScopes(selector);
  }

  public static resetAll() : typeof IC {
    while (scopes.length > 1) {
      scopes.pop();
    }
    scopes.push(new IC());
    return this;
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
      this.registry.set(selector, injectable);
    }
    return this;
  }

  public create<T>(selector : Selector) : Promise<T> {
    if (this.hasSelector(selector)) {
      const injectable : Injectable = this.registry
        .get(selector);
      return injectable.get(this);
    }
    return createFromAllScopes(selector, this);
  }

  public wire<T>(t : any) : Promise<T> {
    return wire(t, this);
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
      .has(selector) && this.registry
      .get(selector)
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

scopes.push(new IC('static'), new IC());
