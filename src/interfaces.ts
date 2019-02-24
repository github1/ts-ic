export type Selector = any;

export const NOT_IN_SCOPE = '@@not_in_scope';

export interface InjectionContext {
  params : Map<number, Selector>;
}

export interface Injectable {
  get() : any;
}

export class StaticInjectable implements Injectable {
  constructor(private value : any) {
  }

  get() : any {
    return this.value;
  }
}

export class FactoryInjectable implements Injectable {
  constructor(private func : () => any) {
  }

  get() : any {
    return this.func();
  }
}

export class ConditionalInjectable implements Injectable {
  constructor(private injectable: Injectable, private condition: () => boolean) {
  }
  get() : any {
    if(!this.condition()) {
      return NOT_IN_SCOPE;
    }
    return this.injectable.get();
  }
}
