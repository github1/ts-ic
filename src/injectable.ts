import {
  ICCreator,
  ICInterrogatable,
  ICRegistrateable,
  Selector,
} from './interfaces';

export interface Injectable {
  evaluate(ic: ICInterrogatable): boolean;
  get(creator: ICCreator): Promise<any>;
}

export class ConditionalInjectable implements Injectable {
  constructor(private readonly injectable: Injectable,
              private readonly condition: (icc?: ICInterrogatable) => boolean) {
  }
  public evaluate(): boolean {
    return this.condition();
  }
  public get(creator: ICCreator): Promise<any> {
    return this.injectable.get(creator);
  }
}

export class StaticInjectable implements Injectable {
  constructor(private readonly value : any) {
  }
  public evaluate(): boolean {
    return true;
  }
  public get(creator: ICCreator) : Promise<any> {
    return Promise.resolve(this.value);
  }
}

export class FactoryInjectable implements Injectable {
  constructor(private readonly func : (creator?: ICCreator) => any) {
  }
  public evaluate(): boolean {
    return true;
  }
  public get(creator: ICCreator) : Promise<any> {
    return Promise.resolve(this.func(creator));
  }
}

export class PromiseInjectable implements Injectable {
  constructor(private readonly promise: Promise<any>) {
  }
  public evaluate(): boolean {
    return true;
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

