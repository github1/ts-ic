import {
  Selector,
  Injectable,
  InjectionContext,
  StaticInjectable,
  NOT_IN_SCOPE,
} from './interfaces';
import {
  constructorInjectionContext,
  createParams,
} from './inject';
import { v4 } from 'uuid';

export class IC {
  private static current(index: number = 0): IC {
    return scopes[index];
  }
  static register(selector: Selector, injectable: any): typeof IC {
    IC.current()._register(selector, injectable);
    return IC;
  }
  static create<T>(selector: Selector): T {
    return IC.createFromAllScopes(selector);
  }
  private static createFromAllScopes<T>(selector: Selector, index: number = 0): T {
    let ic: IC = IC.current(index);
    if (ic) {
      if (ic.registry.has(selector)) {
        const value: any = ic.registry.get(selector).get();
        if (value !== NOT_IN_SCOPE) {
          return ic.registry.get(selector).get();
        }
      }
      return IC.createFromAllScopes(selector, ++index);
    }
    throw new Error(`No dependency found for selector ${selector}`);
  }
  static wire<T>(type: any): T {
    const injectionContext : InjectionContext = constructorInjectionContext.get(type.name);
    return new type(...createParams(injectionContext)) as T;
  }
  static scope(scope: () => void): typeof IC {
    scopes.unshift(new IC());
    scope();
    scopes.shift();
    return IC;
  }
  static with(...config: any[]): typeof IC {
    config.forEach((config: any) => IC.current().configs.add(config));
    return IC;
  }
  static hasConfig(selector: Selector): boolean {
    return IC.hasConfigFromAllScopes(selector);
  }
  private static hasConfigFromAllScopes(selector: Selector, index: number = 0): boolean {
    let ic: IC = IC.current(index);
    if (ic) {
      if (ic.configs.has(selector)) {
        return true;
      }
      return IC.hasConfigFromAllScopes(selector, ++index);
    }
    return false;
  }
  private id: string;
  private registry: Map<Selector, Injectable> = new Map<Selector, Injectable>();
  private configs: Set<Selector> = new Set<Selector>();
  constructor() {
    this.id = v4();
  }
  public toString() {
    return this.id;
  }
  private _register(selector: Selector, injectable: any): IC {
    if (injectable === undefined) {
      throw new Error(`Registered undefined for selector ${selector}`);
    } else {
      if (typeof injectable.get !== 'function') {
        return this._register(selector, new StaticInjectable(injectable));
      }
      this.registry.set(selector, injectable);
    }
    return this;
  }
}

const scopes: IC[] = [new IC()];
