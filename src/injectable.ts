/* tslint:disable:no-reserved-keywords */
import {
  ICCreator,
  ICInterrogatable,
  ICRegistrateable,
  Selector
} from './interfaces';

export interface Injectable {
  evaluate(ic: ICInterrogatable): boolean;
  get(ic: ICCreator): Promise<any>;
}

export class ConditionalInjectable implements Injectable {
  constructor(private readonly injectable: Injectable,
              private readonly condition: (icc?: ICInterrogatable) => boolean) {
  }
  public evaluate(ic: ICInterrogatable): boolean {
    return this.condition(ic);
  }
  public get(ic: ICCreator): Promise<any> {
    return this.injectable.get(ic);
  }
}

export class StaticInjectable implements Injectable {
  constructor(private readonly value : any) {
  }
  public evaluate(ic: ICInterrogatable): boolean {
    return true;
  }
  public get(ic: ICCreator) : Promise<any> {
    return Promise.resolve(this.value);
  }
}

export class FactoryInjectable implements Injectable {
  constructor(private readonly func : (creator?: ICCreator) => any) {
  }
  public evaluate(ic: ICInterrogatable): boolean {
    return true;
  }
  public get(ic: ICCreator) : Promise<any> {
    return Promise.resolve(this.func(ic));
  }
}

export class PromiseInjectable implements Injectable {
  constructor(private readonly promise: Promise<any>) {
  }
  public evaluate(ic: ICInterrogatable): boolean {
    return true;
  }
  public get(ic: ICCreator) : Promise<any> {
    return this.promise;
  }
}

export class CompositeInjectable implements Injectable {
  constructor(private readonly injectables: Injectable[]) {
  }
  public evaluate(ic : ICInterrogatable) : boolean {
    for (let injectable of this.injectables) {
      if (injectable.evaluate(ic)) {
        return true;
      }
    }
    return false;
  }
  public get(ic: ICCreator) : Promise<any> {
    for (let injectable of this.injectables) {
      if (injectable.evaluate(ic as any as ICInterrogatable)) {
        return injectable.get(ic);
      }
    }
    return Promise.reject('No matching injectable found');
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

export const typeRegistrator: Map<any, Registrator> = new Map<any, Registrator>();
