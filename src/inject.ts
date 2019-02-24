import {
  Selector,
  InjectionContext,
  FactoryInjectable,
  ConditionalInjectable,
} from './interfaces';
import { IC } from './ic';

export const constructorInjectionContext : Map<string, InjectionContext> = new Map<string, InjectionContext>();
export const classParameterInjectionContext : Map<any, Map<string | symbol, InjectionContext>> = new Map<any, Map<string | symbol, InjectionContext>>();

export function Inject(selector : Selector) {
  function decorator(
    target : any,
    propertyKey : string | symbol,
    parameterIndexOrPropertyDescriptor : number | TypedPropertyDescriptor<any>,
  ) {
    let injectionContext : InjectionContext = null;
    let parameterIndex: number = -1;
    let typedPropertyDescriptor: TypedPropertyDescriptor<any> = null;
    if (typeof target === 'function') {
      parameterIndex = parameterIndexOrPropertyDescriptor as number;
      if (constructorInjectionContext.has(target.name)) {
        injectionContext = constructorInjectionContext.get(target.name);
      } else {
        injectionContext = {
          params: new Map<number, Selector>()
        };
        constructorInjectionContext.set(target.name, injectionContext);
      }
    } else {
      if(isNaN(parameterIndexOrPropertyDescriptor as number)) {
        typedPropertyDescriptor = parameterIndexOrPropertyDescriptor as TypedPropertyDescriptor<any>;
        if (classParameterInjectionContext.has(target)
          && classParameterInjectionContext.get(target).has(propertyKey)) {
          const originalFunction: Function = typedPropertyDescriptor.value;
          typedPropertyDescriptor.value = function() {
            return originalFunction.apply(
              this,
              createParams(classParameterInjectionContext.get(target).get(propertyKey)))
          };
          IC.register(selector, new ConditionalInjectable(
            new FactoryInjectable(() => typedPropertyDescriptor.value()), () => IC.hasConfig(target.constructor)));
        } else {
          IC.register(selector, target[propertyKey]());
        }
      } else {
        parameterIndex = parameterIndexOrPropertyDescriptor as number;
        if (!classParameterInjectionContext.has(target)) {
          classParameterInjectionContext.set(target, new Map<string | symbol, InjectionContext>());
        }
        const parameterInjectionContext: Map<string | symbol, InjectionContext> = classParameterInjectionContext.get(target);
        if (!parameterInjectionContext.has(propertyKey)) {
          parameterInjectionContext.set(propertyKey, {
            params: new Map<number, Selector>()
          });
        }
        injectionContext = parameterInjectionContext.get(propertyKey);
      }
    }
    if (injectionContext !== null) {
      injectionContext.params.set(parameterIndex, selector);
    }
  }
  return decorator;
}

export const createParams = (injectionContext: InjectionContext): any[] => {
  const params : any[] = [];
  injectionContext.params.forEach((selector : Selector, index : number) => {
    params.splice(index, 0, instantiate(selector));
  });
  return params;
};

const instantiate = (selector : Selector) : any => {
  return IC.create(selector);
};

