/* tslint:disable:no-parameter-reassignment */
import {
  Selector,
  ConfigSelector,
  InjectionContext,
  FactoryInjectable,
  ConditionalInjectable
} from './interfaces';
import { createParams } from './util';
import { IC } from './ic';

export const CONSTRUCTOR_KEY = '@@__constructor';

export const classParameterInjectionContext : Map<any, Map<string | symbol, InjectionContext>> =
  new Map<any, Map<string | symbol, InjectionContext>>();

export function inject(selector : Selector) {
  function decorator(
    target : any,
    propertyKey : string | symbol,
    parameterIndexOrPropertyDescriptor : number | TypedPropertyDescriptor<any>
  ) {
    let injectionContext : InjectionContext;
    let parameterIndex: number = -1;
    let typedPropertyDescriptor: TypedPropertyDescriptor<any> ;
    const isParameterDecorator: boolean = typeof parameterIndexOrPropertyDescriptor === 'number';
    if (isParameterDecorator) {
      parameterIndex = parameterIndexOrPropertyDescriptor as number;
      let targetSelector: Selector = target;
      if (typeof target === 'function') {
        targetSelector = target.name;
        propertyKey = CONSTRUCTOR_KEY;
      }
      if (!classParameterInjectionContext.has(targetSelector)) {
        classParameterInjectionContext.set(targetSelector, new Map<string | symbol, InjectionContext>());
      }
      const parameterInjectionContext: Map<string | symbol, InjectionContext> = classParameterInjectionContext.get(targetSelector);
      if (!parameterInjectionContext.has(propertyKey)) {
        parameterInjectionContext.set(propertyKey, {
          params: new Map<number, Selector>()
        });
      }
      injectionContext = parameterInjectionContext.get(propertyKey);
      if (injectionContext !== undefined) {
        injectionContext.params.set(parameterIndex, selector);
      }
    } else {
      typedPropertyDescriptor = parameterIndexOrPropertyDescriptor as TypedPropertyDescriptor<any>;
      if (classParameterInjectionContext.has(target)
        && classParameterInjectionContext
          .get(target)
          .has(propertyKey)) {
        const originalFunction: Function = typedPropertyDescriptor.value;
        typedPropertyDescriptor.value = function() {
          return originalFunction.apply(
            this, // tslint:disable-line:no-invalid-this
            createParams(classParameterInjectionContext
              .get(target)
              .get(propertyKey), IC.create));
        };
        IC.register(new ConfigSelector(selector), new ConditionalInjectable(
          new FactoryInjectable(() => typedPropertyDescriptor.value()), () => IC.hasConfig(target.constructor)));
      } else {
        IC.register(new ConfigSelector(selector), target[propertyKey]());
      }
    }
  }
  return decorator;
}
