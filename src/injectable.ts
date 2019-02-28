import {
  ICCreator,
  ICInterrogatable,
  ICRegistrateable,
  Selector,
} from './interfaces';

export const UNMET_CONDITION: Promise<any> = 'UNMET_CONDITION' as any as Promise<any>;

export interface Injectable {
  get(creator: ICCreator) : Promise<any>;
}

export class StaticInjectable implements Injectable {
  constructor(private readonly value : any) {
  }

  public get(creator: ICCreator) : Promise<any> {
    return Promise.resolve(this.value);
  }
}

export class FactoryInjectable implements Injectable {
  constructor(private readonly func : (creator?: ICCreator) => any) {
  }

  public get(creator: ICCreator) : Promise<any> {
    return Promise.resolve(this.func(creator));
  }
}

export class ConditionalInjectable implements Injectable {
  constructor(private readonly injectable: Injectable,
              private readonly condition: (icc?: ICInterrogatable) => boolean) {
  }
  public get(creator: ICCreator) : Promise<any> {
    if(!this.condition(creator as any as ICInterrogatable)) {
      return UNMET_CONDITION as any as Promise<any>;
    }
    return this.injectable.get(creator);
  }
}

export class PromiseInjectable implements Injectable {
  constructor(private readonly promise: Promise<any>) {
  }
  public get() : Promise<any> {
    return this.promise;
  }
}

export class Registrator {
  private readonly registry : Map<Selector, Injectable> = new Map<Selector, Injectable>();
  public include(selector: Selector, injectable: Injectable): Registrator {
    this.registry.set(selector, injectable);
    return this;
  }
  public register(registrateable: ICRegistrateable) {
    this.registry.forEach((injectable: Injectable, selector: Selector) => {
      registrateable.register(selector, injectable);
    });
  }
}

