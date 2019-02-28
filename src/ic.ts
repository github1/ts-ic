import {
  ICC,
  ConfigSelector,
  InjectionContext,
  Selector,
  ICCreator,
  typeRegistrator
} from './interfaces';
import {
  Injectable,
  StaticInjectable,
  PromiseInjectable,
  UNMET_CONDITION,
} from './injectable';
import {classParameterInjectionContext, CONSTRUCTOR_KEY} from './inject';
import {
  createParams,
} from './util';
import {v4} from 'uuid';

const scopes : ICC[] = [];

const rootScope = (providedScopes : ICC[] = scopes) : ICC => {
  return providedScopes[0];
};

const scopeAt = (index : number = 0, providedScopes : ICC[] = scopes) : ICC => {
  return providedScopes[providedScopes.length - (index + 1)];
};

const createFromAllScopes = <T>(
  selector : Selector,
  creator : ICCreator,
  index : number = 0,
  providedScopes : ICC[] = scopes) : Promise<T> => {
  return new Promise((resolve, reject) => {
    const ic : ICScope = scopeAt(index, providedScopes) as ICScope;
    if (ic) {
      if (ic.hasSelector(selector)) {
        const injectable: Injectable = ic.getInjectable(selector);
        resolve(injectable.get(creator));
      } else {
        resolve(createFromAllScopes(selector, creator, index + 1, providedScopes));
      }
    } else {
      reject(new Error(`No dependency found for selector ${selector}`));
    }
  });
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

const wire = <T>(t : any, creator : ICCreator) : Promise<T> => {
  const injectionContext : InjectionContext = classParameterInjectionContext
    .get(t.name)
    .get(CONSTRUCTOR_KEY);
  return createParams(injectionContext, creator).then((params: any[]) => {
    return new t(...params) as T;
  });
};

export class ICScope implements ICC {
  public attached : boolean = false;
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

  public scope(scope : () => void | Promise<any>) : Promise<ICC> {
    throw new Error('Not implemented');
  }

  public withConfig(...config : any[]) : ICC {
    //config.forEach((config : any) => this.configs.add(config));
    config.forEach((config : any) => {
      typeRegistrator.get(config).register(this);
    });
    return this;
  }

  public hasSelector(selector : Selector) : boolean {
    if (this.registry.has(selector)) {
      return UNMET_CONDITION !== this.registry.get(selector).get(this);
    }
    return false;
  }

  public hasConfig(selector : Selector) : boolean {
    return this.configs.has(selector);
  }

  public getInjectable(selector: Selector): Injectable {
    return this.registry.get(selector);
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

  public create<T>(selector : Selector) : Promise<T> {
    return createFromAllScopes(selector, this);
  }

  public wire<T>(t : any) : Promise<T> {
    return scopeAt()
      .wire(t);
  }

  public scope(handler? : (scope?: ICC) => void | Promise<any>) : Promise<ICC> {
    let newScope : ICScope = new ICScope();
    if (handler) {
      newScope.attached = true;
      scopes.push(newScope);
      const result: void | Promise<any> = handler(newScope);
      if (result) {
        return result.then(() => {
          newScope.attached = false;
          scopes.pop();
          return newScope;
        });
      } else {
        newScope.attached = false;
        scopes.pop();
      }
    }
    return Promise.resolve(newScope);
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
