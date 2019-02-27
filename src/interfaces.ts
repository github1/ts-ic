/* tslint:disable:no-reserved-keywords */

export type Selector = any;

export class ConfigSelector implements Selector {
  constructor(public selector: Selector) {
  }
}

export const NOT_IN_SCOPE = '@@__not_in_scope';

export interface InjectionContext {
  params : Map<number, Selector>;
}

export interface Injectable {
  get() : any;
}

export class StaticInjectable implements Injectable {
  constructor(private readonly value : any) {
  }

  public get() : any {
    return this.value;
  }
}

export class FactoryInjectable implements Injectable {
  constructor(private readonly func : () => any) {
  }

  public get() : any {
    return this.func();
  }
}

export class ConditionalInjectable implements Injectable {
  constructor(private readonly injectable: Injectable, private readonly condition: () => boolean) {
  }
  public get() : any {
    if(!this.condition()) {
      return NOT_IN_SCOPE;
    }
    return this.injectable.get();
  }
}

export class PromiseInjectable implements Injectable {
  private resolved: any;
  private isResolved: boolean = false;
  constructor(private readonly promise: Promise<any>) {
  }
  public resolve(): Promise<any> {
    return this.promise
      .then((result: any) => {
        this.isResolved = true;
        this.resolved = result;
    });
  }
  public get() : any {
    if (!this.isResolved) {
      throw new Error(`Attempting to get unresolved injectable`);
    }
    return this.resolved;
  }
}
