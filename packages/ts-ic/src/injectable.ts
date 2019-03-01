/* tslint:disable:no-reserved-keywords */
import {
  ICCreator,
  ICInterrogatable,
  ICRegistrateable,
  Selector
} from './interfaces';

export interface Injectable {
  evaluate(ic : ICInterrogatable) : boolean;

  get(ic : ICCreator) : Promise<any>;
}

export class ConditionalInjectable implements Injectable {
  constructor(private readonly injectable : Injectable,
              private readonly condition : (icc? : ICInterrogatable) => boolean) {
  }

  public evaluate(ic : ICInterrogatable) : boolean {
    return this.condition(ic);
  }

  public get(ic : ICCreator) : Promise<any> {
    return this.injectable.get(ic);
  }
}

export class StaticInjectable implements Injectable {
  constructor(private readonly value : any) {
  }

  public evaluate(ic : ICInterrogatable) : boolean {
    return true;
  }

  public get(ic : ICCreator) : Promise<any> {
    return Promise.resolve(this.value);
  }
}

export class FactoryInjectable implements Injectable {
  constructor(private readonly func : (creator? : ICCreator) => any) {
  }

  public evaluate(ic : ICInterrogatable) : boolean {
    return true;
  }

  public get(ic : ICCreator) : Promise<any> {
    return Promise.resolve(this.func(ic));
  }
}

export class PromiseInjectable implements Injectable {
  constructor(private readonly promise : Promise<any>) {
  }

  public evaluate(ic : ICInterrogatable) : boolean {
    return true;
  }

  public get(ic : ICCreator) : Promise<any> {
    return this.promise;
  }
}

export class CompositeInjectable implements Injectable {
  constructor(private readonly injectables : Injectable[]) {
  }

  public evaluate(ic : ICInterrogatable) : boolean {
    for (const injectable of this.injectables) {
      if (injectable.evaluate(ic)) {
        return true;
      }
    }
    return false;
  }

  public get(ic : ICCreator) : Promise<any> {
    for (const injectable of this.injectables) {
      if (injectable.evaluate(ic as any as ICInterrogatable)) {
        return injectable.get(ic);
      }
    }
    return Promise.reject('No matching injectable found');
  }
}

export class CachedInjectable implements Injectable {
  private readonly key : string;

  constructor(private readonly injectable : Injectable,
              private readonly cache : Map<any, any>) {
    // tslint:disable-next-line:insecure-random
    this.key = `key::${Math.floor(Math.random() * 1000000000)}`;
  }

  public evaluate(ic : ICInterrogatable) : boolean {
    return this.injectable.evaluate(ic);
  }

  public get(ic : ICCreator) : Promise<any> {
    if (this.cache.has(this.key)) {
      return Promise.resolve(this.cache.get(this.key));
    }
    return this.injectable
      .get(ic)
      .then((result : any) => {
        this.cache.set(this.key, result);
        return result;
      });
  }
}

export class Registrator {
  private readonly registry : Map<Selector, Injectable> = new Map<Selector, Injectable>();

  public include(selector : Selector, injectable : Injectable) : Registrator {
    this.registry.set(selector, injectable);
    return this;
  }

  public register(registrateable : ICRegistrateable) {
    this.registry.forEach((injectable : Injectable, selector : Selector) => {
      registrateable.register(selector, injectable);
    });
  }
}

export const typeRegistrator : Map<any, Registrator> = new Map<any, Registrator>();
